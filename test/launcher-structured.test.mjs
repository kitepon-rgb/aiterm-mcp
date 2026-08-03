import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, "..", "dist", "index.js");
const hasTmux = (process.platform === "win32"
  ? spawnSync("wsl.exe", ["-e", "tmux", "-V"])
  : spawnSync("tmux", ["-V"])
).status === 0;
const skip = hasTmux && typeof process.getuid === "function"
  ? undefined
  : "tmux または POSIX getuid が無い";

test("claude_agent: text contentを維持しClaude managed launch receiptをstructuredContentで返す", { skip }, async () => {
  // tmux socketはmacOSで104 byte上限。TMPDIR由来の長いsandbox pathを避ける。
  const root = fs.mkdtempSync(path.join("/tmp", "aiterm-launcher-structured-"));
  const fakeClaude = path.join(root, "fake-claude.sh");
  fs.writeFileSync(fakeClaude, [
    "#!/bin/sh",
    "if [ \"$1\" = auth ] && [ \"$2\" = status ] && [ \"$3\" = --json ]; then",
    "  printf '%s\\n' '{\"loggedIn\":true,\"authMethod\":\"claude.ai\",\"apiProvider\":\"firstParty\"}'",
    "  exit 0",
    "fi",
    "printf 'Claude Code\\n❯ ready\\n'",
    "while IFS= read -r line; do printf '%s\\n' \"$line\"; done",
    "",
  ].join("\n"), { mode: 0o700 });

  const child = spawn(process.execPath, [ENTRY], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      CLAUDE_BIN: fakeClaude,
      HOME: root,
      TMPDIR: root,
      XDG_RUNTIME_DIR: root,
    },
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  const sessionId = `structured_claude_${Date.now().toString(36)}`;
  const launchOperationId = `sha256:${"d".repeat(64)}`;
  try {
    child.stdin.write([
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "launcher-structured", version: "0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "claude_agent", arguments: { session_name: sessionId, agent_done: true, launch_operation_id: launchOperationId } },
      },
    ].map((message) => JSON.stringify(message)).join("\n") + "\n");

    const launch = await waitForResponse(child, () => responseFor(stdout, 2), () => stdout, () => stderr);
    assert.equal(launch.result.isError, undefined, JSON.stringify(launch.result));
    const text = launch.result.content?.[0]?.text;
    assert.equal(typeof text, "string", "既存text contentを維持する");
    assert.match(text, new RegExp(`session_id: ${sessionId}`));
    assert.deepEqual(launch.result.structuredContent, {
      schema: "aiterm.agent-launch-result.v1",
      provider: "claude",
      session_id: sessionId,
      managed_completion: true,
      // promptなしlaunchはturnが走っていない＝完了待ち対象がないため両方null
      event_cursor: null,
      wait_command: null,
      // promptなし＝submit座礁観測の対象なし
      submit_residue: null,
    });

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "claude_agent", arguments: { session_name: sessionId, agent_done: true, launch_operation_id: launchOperationId } },
    })}\n`);
    const replay = await waitForResponse(child, () => responseFor(stdout, 3), () => stdout, () => stderr);
    assert.equal(replay.result.isError, undefined, JSON.stringify(replay.result));
    assert.deepEqual(replay.result.structuredContent, launch.result.structuredContent, "同じ相関launchを同じreceiptへ回収する");
    assert.match(replay.result.content?.[0]?.text, /CLIは再送していません/);

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "pty_close", arguments: { session_id: sessionId } },
    })}\n`);
    const closed = await waitForResponse(child, () => responseFor(stdout, 4), () => stdout, () => stderr);
    assert.equal(closed.result.isError, undefined, JSON.stringify(closed.result));
    assert.equal(closed.result.content?.[0]?.text, `closed ${sessionId}`, "既存text contentを維持する");
    assert.deepEqual(closed.result.structuredContent, {
      schema: "aiterm.pty-close-result.v1",
      session_id: sessionId,
      outcome: "closed",
    });

    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "pty_close", arguments: { session_id: sessionId } },
    })}\n`);
    const retried = await waitForResponse(child, () => responseFor(stdout, 5), () => stdout, () => stderr);
    assert.equal(retried.result.isError, undefined, JSON.stringify(retried.result));
    assert.equal(retried.result.content?.[0]?.text, `closed ${sessionId}`, "retryでも既存text contentを維持する");
    assert.deepEqual(retried.result.structuredContent, {
      schema: "aiterm.pty-close-result.v1",
      session_id: sessionId,
      outcome: "already_closed",
    });
  } finally {
    child.kill();
    await onceExit(child);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("agent launch receipt: write_scope指定時だけ能力宣言を返し、省略時は既存shapeを保つ", { skip }, async () => {
  const root = fs.mkdtempSync(path.join("/tmp", "aiterm-write-scope-receipt-"));
  const codexHome = path.join(root, "codex-home");
  // macOSでは /tmp が /private/tmp へのsymlink。Grok認証正本はpath成分のsymlinkを拒否するため、
  // fixtureも実pathへ置いてno-follow契約を崩さない。
  const grokHome = path.join(fs.realpathSync(root), "grok-home");
  fs.mkdirSync(codexHome, { mode: 0o700 });
  fs.writeFileSync(path.join(codexHome, "auth.json"), "{}\n", { mode: 0o600 });
  fs.writeFileSync(
    path.join(codexHome, "config.toml"),
    'model = "test-model"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\n',
    { mode: 0o600 },
  );
  fs.mkdirSync(grokHome, { mode: 0o700 });
  fs.writeFileSync(path.join(grokHome, "auth.json"), "{}\n", { mode: 0o600 });
  fs.writeFileSync(path.join(grokHome, "config.toml"), "[cli]\nauto_update = false\n", { mode: 0o600 });

  const child = spawn(process.execPath, [ENTRY], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      CODEX_BIN: "/bin/echo",
      CODEX_HOME: codexHome,
      GROK_BIN: "/bin/echo",
      GROK_HOME: grokHome,
      HOME: root,
      TMPDIR: root,
      XDG_RUNTIME_DIR: root,
    },
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  let requestId = 1;
  const call = async (name, args) => {
    const id = requestId++;
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    })}\n`);
    return waitForResponse(child, () => responseFor(stdout, id), () => stdout, () => stderr);
  };

  try {
    child.stdin.write([
      { jsonrpc: "2.0", id: requestId++, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "write-scope-receipt", version: "0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
    ].map((message) => JSON.stringify(message)).join("\n") + "\n");
    await waitForResponse(child, () => responseFor(stdout, 1), () => stdout, () => stderr);

    for (const [tool, scope, enforcement] of [
      ["codex_agent", "read-only", "enforced_read_only"],
      ["grok_agent", "/repo/docs のみ書込み可", "declaration_only_unsupported"],
      ["composer_agent", "/repo/test のみ書込み可", "declaration_only_unsupported"],
    ]) {
      const specifiedSession = `scope_${tool}_${Date.now().toString(36)}`;
      const specified = await call(tool, { session_name: specifiedSession, write_scope: scope });
      assert.equal(specified.result.isError, undefined, JSON.stringify(specified.result));
      assert.equal(specified.result.structuredContent.write_scope, scope, `${tool}: 指定値をreceiptへ保持する`);
      assert.equal(
        specified.result.structuredContent.write_scope_enforcement,
        enforcement,
        `${tool}: enforcementをreceiptへ保持する`,
      );
      await call("pty_close", { session_id: specifiedSession });

      const omittedSession = `noscope_${tool}_${Date.now().toString(36)}`;
      const omitted = await call(tool, { session_name: omittedSession });
      assert.equal(omitted.result.isError, undefined, JSON.stringify(omitted.result));
      assert.equal(Object.hasOwn(omitted.result.structuredContent, "write_scope"), false, `${tool}: 省略時shapeを変えない`);
      assert.equal(
        Object.hasOwn(omitted.result.structuredContent, "write_scope_enforcement"),
        false,
        `${tool}: 省略時shapeを変えない`,
      );
      await call("pty_close", { session_id: omittedSession });
    }
  } finally {
    child.kill();
    await onceExit(child);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function responseFor(stdout, id) {
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value.id === id) return value;
    } catch {
      // 次の行でJSON-RPC境界を再試行する。最終timeout時にstdout全体を報告する。
    }
  }
  return null;
}

function waitForResponse(child, current, stdout, stderr) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      const found = current();
      if (found !== null) {
        cleanup();
        resolve(found);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`MCP response timeout: stdout=${JSON.stringify(stdout())} stderr=${JSON.stringify(stderr())}`));
    }, 15_000);
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout.off("data", finish);
      child.off("error", reject);
    };
    child.stdout.on("data", finish);
    child.once("error", reject);
    finish();
  });
}

function onceExit(child) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}

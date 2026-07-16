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

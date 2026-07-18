// aiterm-wait（純リーダー観測）の回帰テスト。tmux 不要・fake state root で完結する。
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const posix = typeof process.getuid === "function";
const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "aiterm-wait-cli.js");

const LAUNCH = "0123456789abcdef0123456789abcdef";
const OPID = `sha256:${"ab".repeat(32)}`;
const OPID2 = `sha256:${"cd".repeat(32)}`;

function makeStateRoot() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-wait-"));
  const root = path.join(base, `aiterm-mcp-${process.getuid()}`);
  const agents = path.join(root, "agents");
  fs.mkdirSync(root, { mode: 0o700 });
  fs.mkdirSync(agents, { mode: 0o700 });
  return { base, root, agents };
}

function writeMeta(agents, name, kind, extra = {}) {
  const common = {
    kind,
    aiterm_session: name,
    launch_id: LAUNCH,
    event_file: path.join(agents, `${name}.${LAUNCH}.events.jsonl`),
    created_at: new Date().toISOString(),
    cwd: null,
    vendor_session_id: null,
    initial_prompt: "done",
    node_platform: process.platform,
  };
  const byKind =
    kind === "claude"
      ? {
          hook_route: "managed_claude_settings",
          claude_settings: path.join(agents, `${name}.${LAUNCH}.claude-settings.json`),
          result_file: path.join(agents, `${name}.${LAUNCH}.claude-result.json`),
          launch_operation_id: null,
          launch_request_digest: null,
        }
      : {
          hook_route: "managed_codex_home",
          codex_home: path.join(agents, `${name}.${LAUNCH}.codex-home`),
        };
  const metaPath = path.join(agents, `${name}.${LAUNCH}.agent.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ ...common, ...byKind, ...extra }), { mode: 0o600 });
  return { metaPath, eventPath: common.event_file };
}

function codexEvent(name, over = {}) {
  return (
    JSON.stringify({
      type: "agent_done",
      vendor: "codex",
      aiterm_session: name,
      launch_id: LAUNCH,
      vendor_session_id: "vs-1",
      turn_id: "turn-1",
      reason: "Stop",
      done_status: "turn_done",
      at: "2026-07-18T00:00:00.000Z",
      ...over,
    }) + "\n"
  );
}

function claudeEvent(name, over = {}) {
  return (
    JSON.stringify({
      type: "agent_done",
      vendor: "claude",
      aiterm_session: name,
      launch_id: LAUNCH,
      vendor_session_id: "claude-vs-1",
      turn_id: null,
      operation_id: OPID,
      reason: "Stop",
      done_status: "turn_done",
      result_digest: "0".repeat(64),
      result_bytes: 12,
      at: "2026-07-18T00:00:00.000Z",
      ...over,
    }) + "\n"
  );
}

async function withStateRoot(fn) {
  const { base, agents } = makeStateRoot();
  const prev = process.env.XDG_RUNTIME_DIR;
  process.env.XDG_RUNTIME_DIR = base;
  try {
    return await fn(agents);
  } finally {
    if (prev === undefined) delete process.env.XDG_RUNTIME_DIR;
    else process.env.XDG_RUNTIME_DIR = prev;
    fs.rmSync(base, { recursive: true, force: true });
  }
}

const core = posix ? await import("../dist/core.js") : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("observe: 待機後に届いたcodex eventでdone", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s1", "codex");
    const p = core.observeAgentDone("s1", { timeout: 5 });
    await sleep(250);
    fs.appendFileSync(eventPath, codexEvent("s1"));
    const r = await p;
    assert.equal(r.schema, "aiterm.agent-wait-result.v1");
    assert.equal(r.outcome, "done");
    assert.equal(r.vendor, "codex");
    assert.equal(r.turn_id, "turn-1");
    assert.equal(r.vendor_session_id, "vs-1");
    assert.equal(r.launch_id, LAUNCH);
  });
});

test("observe: 起動前のstale eventは境界の外＝timeout", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s2", "codex");
    fs.appendFileSync(eventPath, codexEvent("s2"));
    const r = await core.observeAgentDone("s2", { timeout: 0 });
    assert.equal(r.outcome, "timeout");
    assert.equal(r.turn_id, null);
  });
});

test("observe: 他launch・他vendor・他sessionのeventは無視", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s3", "codex");
    const p = core.observeAgentDone("s3", { timeout: 1 });
    await sleep(100);
    fs.appendFileSync(eventPath, codexEvent("s3", { launch_id: "f".repeat(32) }));
    fs.appendFileSync(eventPath, codexEvent("s3", { vendor: "grok" }));
    fs.appendFileSync(eventPath, codexEvent("s3", { aiterm_session: "other" }));
    const r = await p;
    assert.equal(r.outcome, "timeout");
  });
});

test("observe: malformed lineはカウントして待機継続", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s4", "codex");
    const p = core.observeAgentDone("s4", { timeout: 5 });
    await sleep(100);
    fs.appendFileSync(eventPath, "{not json\n");
    await sleep(250);
    fs.appendFileSync(eventPath, codexEvent("s4"));
    const r = await p;
    assert.equal(r.outcome, "done");
    assert.equal(r.malformed_events, 1);
  });
});

test("observe: claude operation相関はwaiter起動より前のeventも回収できる", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s5", "claude");
    fs.appendFileSync(eventPath, claudeEvent("s5"));
    const r = await core.observeAgentDone("s5", { operation_id: OPID, timeout: 5 });
    assert.equal(r.outcome, "done");
    assert.equal(r.operation_id, OPID);
    assert.equal(r.vendor_session_id, "claude-vs-1");
  });
});

test("observe: 別operation_idのeventは回収しない（誤帰属拒否）", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s6", "claude");
    fs.appendFileSync(eventPath, claudeEvent("s6", { operation_id: OPID2 }));
    const r = await core.observeAgentDone("s6", { operation_id: OPID, timeout: 0 });
    assert.equal(r.outcome, "timeout");
    assert.equal(r.operation_id, OPID);
  });
});

test("observe: 待機中のsession closeはoutcome=closed", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { metaPath, eventPath } = writeMeta(agents, "s7", "codex");
    const p = core.observeAgentDone("s7", { timeout: 10 });
    await sleep(250);
    fs.rmSync(eventPath, { force: true });
    fs.rmSync(metaPath, { force: true });
    const r = await p;
    assert.equal(r.outcome, "closed");
  });
});

test("observe: 非Claudeへのoperation_id指定は拒否", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    writeMeta(agents, "s8", "codex");
    await assert.rejects(
      () => core.observeAgentDone("s8", { operation_id: OPID, timeout: 0 }),
      /Claude agent session/,
    );
  });
});

test("observe: bind前に複数vendor_session_id混在はエラー", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s9", "codex");
    const p = core.observeAgentDone("s9", { timeout: 5 });
    await sleep(100);
    fs.appendFileSync(eventPath, codexEvent("s9", { vendor_session_id: "vs-a" }) + codexEvent("s9", { vendor_session_id: "vs-b" }));
    await assert.rejects(() => p, /vendor_session_id が混在/);
  });
});

test("observe: 純リーダー＝wait.lockを作らず・既存lockとも競合しない", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s10", "codex");
    const lockPath = path.join(agents, `s10.${LAUNCH}.wait.lock`);
    fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), { mode: 0o600 });
    const p = core.observeAgentDone("s10", { timeout: 5 });
    await sleep(250);
    fs.appendFileSync(eventPath, codexEvent("s10"));
    const r = await p;
    assert.equal(r.outcome, "done");
    assert.equal(fs.readFileSync(lockPath, "utf8").includes(`${process.pid}`), true, "既存lockは無傷");
    const locks = fs.readdirSync(agents).filter((f) => f.endsWith(".wait.lock"));
    assert.deepEqual(locks, [`s10.${LAUNCH}.wait.lock`], "waiterが新しいlockを作っていない");
  });
});

test("observe: metadata書き戻しをしない（vendor_session_id bindを永続化しない）", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { metaPath, eventPath } = writeMeta(agents, "s11", "codex");
    const before = fs.readFileSync(metaPath, "utf8");
    const p = core.observeAgentDone("s11", { timeout: 5 });
    await sleep(250);
    fs.appendFileSync(eventPath, codexEvent("s11"));
    await p;
    assert.equal(fs.readFileSync(metaPath, "utf8"), before);
  });
});

test("observe: cursor指定はwaiter起動より前のeventも境界から回収する", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s12", "codex");
    fs.appendFileSync(eventPath, codexEvent("s12", { turn_id: "old-turn" }));
    const boundary = fs.statSync(eventPath).size;
    fs.appendFileSync(eventPath, codexEvent("s12", { turn_id: "new-turn" }));
    const r = await core.observeAgentDone("s12", { cursor: boundary, timeout: 5 });
    assert.equal(r.outcome, "done");
    assert.equal(r.turn_id, "new-turn", "cursor以降のeventだけを見る");
  });
});

test("observe: cursor境界より前のeventは不可視", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    const { eventPath } = writeMeta(agents, "s13", "codex");
    fs.appendFileSync(eventPath, codexEvent("s13"));
    const boundary = fs.statSync(eventPath).size;
    const r = await core.observeAgentDone("s13", { cursor: boundary, timeout: 0 });
    assert.equal(r.outcome, "timeout");
  });
});

test("observe: 不正cursorは拒否", { skip: !posix }, async () => {
  await withStateRoot(async (agents) => {
    writeMeta(agents, "s14", "codex");
    await assert.rejects(() => core.observeAgentDone("s14", { cursor: -1, timeout: 0 }), /cursor/);
    await assert.rejects(() => core.observeAgentDone("s14", { cursor: 1.5, timeout: 0 }), /cursor/);
  });
});

// ---- CLI black-box ----

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, XDG_RUNTIME_DIR: env, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR },
  });
}

test("cli: 完了済みclaude operationをreceiptで返しexit 0", { skip: !posix }, async () => {
  const { base, agents } = makeStateRoot();
  try {
    const { eventPath } = writeMeta(agents, "c1", "claude");
    fs.appendFileSync(eventPath, claudeEvent("c1"));
    const r = runCli(["--session", "c1", "--operation", OPID, "--timeout", "5"], base);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.schema, "aiterm.agent-wait-result.v1");
    assert.equal(out.outcome, "done");
    assert.equal(out.operation_id, OPID);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: timeoutはreceiptを出しつつexit 3（exit≠完了）", { skip: !posix }, async () => {
  const { base, agents } = makeStateRoot();
  try {
    writeMeta(agents, "c2", "codex");
    const r = runCli(["--session", "c2", "--timeout", "0"], base);
    assert.equal(r.status, 3, r.stderr);
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.outcome, "timeout");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: 待機中のsession closeはreceiptを出しつつexit 4", { skip: !posix }, async () => {
  const { base, agents } = makeStateRoot();
  try {
    const { metaPath } = writeMeta(agents, "c5", "codex");
    const child = spawn(process.execPath, [CLI, "--session", "c5", "--timeout", "30"], {
      env: { PATH: process.env.PATH, XDG_RUNTIME_DIR: base, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR },
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));
    await sleep(500);
    fs.rmSync(metaPath, { force: true });
    const status = await new Promise((res) => child.on("close", res));
    assert.equal(status, 4);
    const out = JSON.parse(stdout.trim());
    assert.equal(out.outcome, "closed");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: 待機中にeventが届くとexitして完了通知になる", { skip: !posix }, async () => {
  const { base, agents } = makeStateRoot();
  try {
    const { eventPath } = writeMeta(agents, "c3", "codex");
    const child = spawn(process.execPath, [CLI, "--session", "c3", "--timeout", "30"], {
      env: { PATH: process.env.PATH, XDG_RUNTIME_DIR: base, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR },
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));
    await sleep(500);
    fs.appendFileSync(eventPath, codexEvent("c3"));
    const status = await new Promise((res) => child.on("close", res));
    assert.equal(status, 0);
    const out = JSON.parse(stdout.trim());
    assert.equal(out.outcome, "done");
    assert.equal(out.turn_id, "turn-1");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: 不正引数はok:false envelopeでexit 1", { skip: !posix }, () => {
  const { base } = makeStateRoot();
  try {
    for (const args of [[], ["--session"], ["--session", "x", "--operation", "bad"], ["--session", "x", "--timeout", "-1"], ["--unknown"]]) {
      const r = runCli(args, base);
      assert.equal(r.status, 1, JSON.stringify(args));
      const out = JSON.parse(r.stdout.trim());
      assert.equal(out.ok, false);
      assert.equal(out.code, "AITERM_WAIT_FAILED");
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: 未管理sessionはAitermErrorの文言つきでexit 1", { skip: !posix }, () => {
  const { base } = makeStateRoot();
  try {
    const r = runCli(["--session", "nosuch", "--timeout", "0"], base);
    assert.equal(r.status, 1);
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.ok, false);
    assert.match(out.message, /agent_done 管理セッション/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: --cursor で境界指定して回収できる", { skip: !posix }, async () => {
  const { base, agents } = makeStateRoot();
  try {
    const { eventPath } = writeMeta(agents, "c4", "codex");
    fs.appendFileSync(eventPath, codexEvent("c4", { turn_id: "old" }));
    const boundary = fs.statSync(eventPath).size;
    fs.appendFileSync(eventPath, codexEvent("c4", { turn_id: "target" }));
    const r = runCli(["--session", "c4", "--cursor", String(boundary), "--timeout", "5"], base);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.outcome, "done");
    assert.equal(out.turn_id, "target");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("cli: 不正--cursorはexit 1", { skip: !posix }, () => {
  const { base } = makeStateRoot();
  try {
    const r = runCli(["--session", "x", "--cursor", "-1"], base);
    assert.equal(r.status, 1);
    assert.equal(JSON.parse(r.stdout.trim()).ok, false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

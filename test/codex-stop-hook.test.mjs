import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "dist", "codex-stop-hook.js");
const GROK_HOOK = path.join(HERE, "..", "dist", "grok-stop-hook.js");
const skip = typeof process.getuid === "function" ? undefined : "POSIX getuid が無い";

function makeHookState(prefix) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const uid = process.getuid();
  const root = path.join(tmp, `aiterm-mcp-${uid}`);
  const agents = path.join(root, "agents");
  fs.mkdirSync(agents, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  fs.chmodSync(agents, 0o700);
  return { tmp, root, agents };
}

function spawnCodexHook(tmp, env, payload = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      TMPDIR: tmp,
      ...env,
    },
  });
}

function spawnGrokHook(tmp, env, payload = {}) {
  return spawnSync(process.execPath, [GROK_HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      TMPDIR: tmp,
      ...env,
    },
  });
}

test("codex-stop-hook: Stop payload を agent_done event に正規化し continue:false を返す", { skip }, () => {
  const { tmp, agents } = makeHookState("aiterm-hook-");

  const session = "hooktest";
  const launchId = "0123456789abcdef0123456789abcdef";
  const payload = {
    session_id: "codex-session-1",
    turn_id: "turn-1",
    hook_event_name: "Stop",
    stop_hook_active: false,
  };
  const r = spawnCodexHook(tmp, {
    AITERM_AGENT_KIND: "codex",
    AITERM_SESSION_ID: session,
    AITERM_AGENT_LAUNCH_ID: launchId,
  }, payload);

  try {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
    const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
    const lines = fs.readFileSync(eventFile, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const event = JSON.parse(lines[0]);
    assert.equal(event.type, "agent_done");
    assert.equal(event.vendor, "codex");
    assert.equal(event.aiterm_session, session);
    assert.equal(event.launch_id, launchId);
    assert.equal(event.vendor_session_id, "codex-session-1");
    assert.equal(event.turn_id, "turn-1");
    assert.equal(event.done_status, "turn_done");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("grok-stop-hook: Stop payload を agent_done event に正規化する", { skip }, () => {
  const { tmp, agents } = makeHookState("aiterm-grok-hook-");

  const session = "grokhook";
  const launchId = "fedcba9876543210fedcba9876543210";
  const payload = {
    hookEventName: "stop",
    sessionId: "019f399a-a6bb-76e3-84f9-0512fdab810a",
    promptId: "prompt-1",
    reason: "end_turn",
  };
  const r = spawnGrokHook(tmp, {
    AITERM_AGENT_KIND: "composer",
    AITERM_SESSION_ID: session,
    AITERM_AGENT_LAUNCH_ID: launchId,
  }, payload);

  try {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "");
    const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
    const lines = fs.readFileSync(eventFile, "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const event = JSON.parse(lines[0]);
    assert.equal(event.type, "agent_done");
    assert.equal(event.vendor, "composer");
    assert.equal(event.aiterm_session, session);
    assert.equal(event.launch_id, launchId);
    assert.equal(event.vendor_session_id, "019f399a-a6bb-76e3-84f9-0512fdab810a");
    assert.equal(event.turn_id, "prompt-1");
    assert.equal(event.reason, "end_turn");
    assert.equal(event.done_status, "turn_done");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("agent stop hooks: aiterm env が全く無ければ state に触らず no-op", { skip }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-hook-noenv-"));
  try {
    const codex = spawnCodexHook(tmp, {}, { hook_event_name: "Stop" });
    assert.equal(codex.status, 0, codex.stderr);
    assert.equal(codex.stderr, "");
    assert.deepEqual(JSON.parse(codex.stdout), { continue: false });

    const grok = spawnGrokHook(tmp, {}, { hookEventName: "stop" });
    assert.equal(grok.status, 0, grok.stderr);
    assert.equal(grok.stdout, "");
    assert.equal(grok.stderr, "");
    assert.equal(fs.existsSync(path.join(tmp, `aiterm-mcp-${process.getuid()}`)), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("agent stop hooks: 存在しない XDG_RUNTIME_DIR は TMPDIR へ戻す", { skip }, () => {
  const { tmp, agents } = makeHookState("aiterm-hook-bad-xdg-");
  const session = "badxdg";
  const launchId = "99999999999999999999999999999999";
  const r = spawnCodexHook(
    tmp,
    {
      XDG_RUNTIME_DIR: path.join(tmp, "missing-runtime-dir"),
      AITERM_AGENT_KIND: "codex",
      AITERM_SESSION_ID: session,
      AITERM_AGENT_LAUNCH_ID: launchId,
    },
    { session_id: "codex-session", turn_id: "turn-1", hook_event_name: "Stop" },
  );
  try {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, "");
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
    const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
    assert.equal(fs.existsSync(eventFile), true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("codex-stop-hook: event file symlink と env の任意 path を拒否する", { skip }, () => {
  const { tmp, agents } = makeHookState("aiterm-hook-symlink-");
  const session = "hooklink";
  const launchId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
  const malicious = path.join(tmp, "malicious.jsonl");
  fs.writeFileSync(malicious, "");
  fs.symlinkSync(malicious, eventFile);
  try {
    const r = spawnCodexHook(
      tmp,
      {
        AITERM_AGENT_KIND: "codex",
        AITERM_SESSION_ID: session,
        AITERM_AGENT_LAUNCH_ID: launchId,
        AITERM_AGENT_EVENT_FILE: malicious,
      },
      { session_id: "codex-session", turn_id: "turn-1", hook_event_name: "Stop" },
    );
    assert.equal(r.status, 0);
    assert.match(r.stderr, /ELOOP|symbolic link|too many levels|symlink/i);
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
    assert.equal(fs.readFileSync(malicious, "utf8"), "", "env 任意 path へ追記してはいけない");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("grok-stop-hook: event file symlink と env の任意 path を拒否する", { skip }, () => {
  const { tmp, agents } = makeHookState("aiterm-grok-hook-symlink-");
  const session = "groklink";
  const launchId = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
  const malicious = path.join(tmp, "malicious.jsonl");
  fs.writeFileSync(malicious, "");
  fs.symlinkSync(malicious, eventFile);
  try {
    const r = spawnGrokHook(
      tmp,
      {
        AITERM_AGENT_KIND: "grok",
        AITERM_SESSION_ID: session,
        AITERM_AGENT_LAUNCH_ID: launchId,
        AITERM_AGENT_EVENT_FILE: malicious,
      },
      { hookEventName: "stop", sessionId: "grok-session", promptId: "prompt-1" },
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /ELOOP|symbolic link|too many levels|symlink/i);
    assert.equal(fs.readFileSync(malicious, "utf8"), "", "env 任意 path へ追記してはいけない");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("agent stop hooks: event file hard link を拒否する", { skip }, () => {
  const codexState = makeHookState("aiterm-hook-hardlink-");
  try {
    const session = "hardlink";
    const launchId = "11111111111111111111111111111111";
    const eventFile = path.join(codexState.agents, `${session}.${launchId}.events.jsonl`);
    const victim = path.join(codexState.tmp, "victim.jsonl");
    fs.writeFileSync(victim, "", { mode: 0o600 });
    fs.linkSync(victim, eventFile);
    const r = spawnCodexHook(
      codexState.tmp,
      {
        AITERM_AGENT_KIND: "codex",
        AITERM_SESSION_ID: session,
        AITERM_AGENT_LAUNCH_ID: launchId,
      },
      { session_id: "codex-session", turn_id: "turn-1", hook_event_name: "Stop" },
    );
    assert.equal(r.status, 0);
    assert.match(r.stderr, /event file が安全ではありません/);
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
    assert.equal(fs.readFileSync(victim, "utf8"), "", "hard link 先へ追記してはいけない");
  } finally {
    fs.rmSync(codexState.tmp, { recursive: true, force: true });
  }

  const grokState = makeHookState("aiterm-grok-hook-hardlink-");
  try {
    const session = "grokhard";
    const launchId = "22222222222222222222222222222222";
    const eventFile = path.join(grokState.agents, `${session}.${launchId}.events.jsonl`);
    const victim = path.join(grokState.tmp, "victim.jsonl");
    fs.writeFileSync(victim, "", { mode: 0o600 });
    fs.linkSync(victim, eventFile);
    const r = spawnGrokHook(
      grokState.tmp,
      {
        AITERM_AGENT_KIND: "grok",
        AITERM_SESSION_ID: session,
        AITERM_AGENT_LAUNCH_ID: launchId,
      },
      { hookEventName: "stop", sessionId: "grok-session", promptId: "prompt-1" },
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /event file が安全ではありません/);
    assert.equal(fs.readFileSync(victim, "utf8"), "", "hard link 先へ追記してはいけない");
  } finally {
    fs.rmSync(grokState.tmp, { recursive: true, force: true });
  }
});

test("agent stop hooks: secure state root/agents dir が symlink や緩い mode なら拒否する", { skip }, () => {
  const uid = process.getuid();

  const loose = makeHookState("aiterm-hook-loose-");
  try {
    fs.chmodSync(loose.root, 0o777);
    const r = spawnCodexHook(
      loose.tmp,
      {
        AITERM_AGENT_KIND: "codex",
        AITERM_SESSION_ID: "loose",
        AITERM_AGENT_LAUNCH_ID: "cccccccccccccccccccccccccccccccc",
      },
      { session_id: "codex-session", turn_id: "turn-1" },
    );
    assert.match(r.stderr, /agent state root が安全ではありません/);
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
  } finally {
    fs.chmodSync(loose.root, 0o700);
    fs.rmSync(loose.tmp, { recursive: true, force: true });
  }

  const rootLinkTmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-hook-rootlink-"));
  try {
    fs.mkdirSync(path.join(rootLinkTmp, "real"), { recursive: true });
    fs.symlinkSync(path.join(rootLinkTmp, "real"), path.join(rootLinkTmp, `aiterm-mcp-${uid}`));
    const r = spawnGrokHook(
      rootLinkTmp,
      {
        AITERM_AGENT_KIND: "grok",
        AITERM_SESSION_ID: "rootlink",
        AITERM_AGENT_LAUNCH_ID: "dddddddddddddddddddddddddddddddd",
      },
      { hookEventName: "stop", sessionId: "grok-session", promptId: "prompt-1" },
    );
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /agent state root が安全ではありません/);
  } finally {
    fs.rmSync(rootLinkTmp, { recursive: true, force: true });
  }

  const agentsLink = makeHookState("aiterm-hook-agentslink-");
  try {
    fs.rmSync(agentsLink.agents, { recursive: true, force: true });
    fs.mkdirSync(path.join(agentsLink.tmp, "elsewhere"));
    fs.symlinkSync(path.join(agentsLink.tmp, "elsewhere"), agentsLink.agents);
    const r = spawnCodexHook(
      agentsLink.tmp,
      {
        AITERM_AGENT_KIND: "codex",
        AITERM_SESSION_ID: "agentlink",
        AITERM_AGENT_LAUNCH_ID: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
      { session_id: "codex-session", turn_id: "turn-1" },
    );
    assert.match(r.stderr, /agent state dir が安全ではありません/);
    assert.deepEqual(JSON.parse(r.stdout), { continue: false });
  } finally {
    fs.rmSync(agentsLink.tmp, { recursive: true, force: true });
  }
});

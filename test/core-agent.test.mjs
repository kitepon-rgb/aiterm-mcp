// openAgent の前提検証と残骸ゼロ保証の characterization。
// - effort 検証は bin 解決より先＝CLI 不在の端末でも同じ結果（環境非依存）。
// - CODEX_BIN 環境変数で bin を無害コマンドに偽装し、CLI 未導入環境でも cwd 検証・残骸テストを回す。
// - tmux 実機を使うケースは core-tmux.test.mjs と同じ隔離ソケット方式（TMPDIR 退避・skip 制御）。
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const hasTmux =
  (process.platform === "win32"
    ? spawnSync("wsl.exe", ["-e", "tmux", "-V"])
    : spawnSync("tmux", ["-V"])
  ).status === 0;
// prefix は短く保つ（macOS の UNIX ソケットパスは 104 バイト上限。長い prefix だと
// claude.sock への接続が "File name too long" で落ちる——実測）。
process.env.TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-agt-"));
process.env.XDG_RUNTIME_DIR = process.env.TMPDIR;
// 実 CLI を起動せず openAgent の配管だけ検証する偽 bin。resolveAgentBin は存在検証する（A3）ため、
// 実在するパスにする必要がある。POSIX は /bin/echo（起動コマンドを echo で可視化できる）、native
// Windows には /bin/echo が無いので node 自身（必ず存在）を使う——echo 出力を読む grok/composer/codex
// 組立テストは { skip }（tmux 必須）で native Windows では走らないため、可視化不要な bin で足りる。
process.env.CODEX_BIN = process.platform === "win32" ? process.execPath : "/bin/echo";
const core = await import("../dist/core.js");
const skip = hasTmux ? undefined : "tmux 未インストール";
const skipAgentDone = hasTmux && typeof process.getuid === "function" ? undefined : "tmux または POSIX getuid が無い";
const agentStateDir = () => path.join(process.env.TMPDIR, `aiterm-mcp-${process.getuid()}`, "agents");

function makeFakeCodexHome() {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR, "fake-codex-home-"));
  fs.writeFileSync(path.join(dir, "auth.json"), "{}\n", { mode: 0o600 });
  fs.writeFileSync(path.join(dir, "config.toml"), 'model = "test-model"\n', { mode: 0o600 });
  return dir;
}

function makeFakeGrokHome() {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR, "fake-grok-home-"));
  fs.writeFileSync(path.join(dir, "auth.json"), "{}\n", { mode: 0o600 });
  fs.writeFileSync(path.join(dir, "config.toml"), "[cli]\nauto_update = true\n", { mode: 0o600 });
  return dir;
}

function makeGrokHomeWithoutAuth() {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR, "fake-grok-home-noauth-"));
  fs.writeFileSync(path.join(dir, "config.toml"), "[cli]\nauto_update = true\n", { mode: 0o600 });
  return dir;
}

function withFakeCodexHome(fn) {
  const saved = process.env.CODEX_HOME;
  const dir = makeFakeCodexHome();
  process.env.CODEX_HOME = dir;
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      if (saved === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = saved;
      fs.rmSync(dir, { recursive: true, force: true });
    });
}

function withFakeGrokHome(fn) {
  const saved = process.env.GROK_HOME;
  const dir = makeFakeGrokHome();
  process.env.GROK_HOME = dir;
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      if (saved === undefined) delete process.env.GROK_HOME;
      else process.env.GROK_HOME = saved;
      fs.rmSync(dir, { recursive: true, force: true });
    });
}

function withGrokHomeWithoutAuth(fn) {
  const saved = process.env.GROK_HOME;
  const dir = makeGrokHomeWithoutAuth();
  process.env.GROK_HOME = dir;
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      if (saved === undefined) delete process.env.GROK_HOME;
      else process.env.GROK_HOME = saved;
      fs.rmSync(dir, { recursive: true, force: true });
    });
}

function agentStateFiles() {
  try {
    return fs.readdirSync(agentStateDir()).sort();
  } catch {
    return [];
  }
}

function readAgentMeta(sid) {
  const metaFiles = fs.readdirSync(agentStateDir()).filter((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
  assert.equal(metaFiles.length, 1);
  return JSON.parse(fs.readFileSync(path.join(agentStateDir(), metaFiles[0]), "utf8"));
}

function agentDoneLine(meta, overrides = {}) {
  return (
    JSON.stringify({
      type: "agent_done",
      vendor: meta.kind,
      aiterm_session: meta.aiterm_session,
      launch_id: meta.launch_id,
      vendor_session_id: "agent-session-test",
      turn_id: "turn-test",
      reason: "Stop",
      done_status: "turn_done",
      at: new Date().toISOString(),
      ...overrides,
    }) + "\n"
  );
}

function appendAgentDone(meta, overrides = {}) {
  fs.appendFileSync(meta.event_file, agentDoneLine(meta, overrides));
}

function scheduleAgentDone(meta, overrides = {}, delay = 200) {
  setTimeout(() => appendAgentDone(meta, overrides), delay);
}

async function markFakeAgentReady(sid, kind = "codex") {
  const marker = kind === "codex" ? "OpenAI Codex\n› ready\n" : "Grok Build\n❯ ready\n";
  core.send(sid, `printf '${marker.replace(/'/g, "'\\''").replace(/\n/g, "\\n")}'`, {
    force: true,
    raw: true,
  });
  await core.readOutput(sid, { wait: true, until: "ready", timeout: 5, raw: true });
}

function fileSnapshot(p) {
  const st = fs.statSync(p);
  return {
    text: fs.readFileSync(p, "utf8"),
    mode: st.mode & 0o777,
    size: st.size,
  };
}

after(() => {
  if (hasTmux) {
    try {
      core.killAll();
    } catch {
      /* noop */
    }
  }
});

test("openAgent: grok の不正 effort は session を作る前に拒否（CLI 不在でも同じ）", () => {
  assert.throws(
    () => core.openAgent("grok", { reasoning_effort: "bogus" }),
    (e) => e.code === 2 && /low\/medium\/high\/xhigh\/max/.test(e.message),
  );
});

test("openAgent: codex の effort は縛らない（CLI 版差があるため送信まで到達する）", { skip }, () => {
  // 偽 bin(/bin/echo) なので実起動はしない。effort が事前拒否されないことだけ確認。
  const [sid] = core.openAgent("codex", { reasoning_effort: "minimal" });
  core.closeSession(sid);
});

test("openAgent: 実在しない cwd は session を作る前に拒否", () => {
  assert.throws(
    () => core.openAgent("codex", { cwd: "/no/such/dir-aiterm-agent-test" }),
    (e) => e.code === 2 && /cwd/.test(e.message),
  );
});

test("openAgent: 破壊語を含む prompt は誤検知で拒否しない（引用符付き引数ゆえ安全・A4）", { skip }, () => {
  const before = core.listSessions();
  // prompt の破壊語は CLI に渡る shq クオート済み引数でありシェルは実行しない。起動できること。
  // （修正前は send(force:false) が code 3 で誤爆し、正当な起動を塞いでいた。）
  const [sid] = core.openAgent("codex", { prompt: "explain what rm -rf / does" });
  try {
    assert.notEqual(core.listSessions(), before, "破壊語 prompt で起動できず session が作られない");
  } finally {
    core.closeSession(sid);
  }
  assert.equal(core.listSessions(), before, "close 後は元の一覧へ戻る");
});

test("openAgent: 前段検証で落ちたら session を残さない（残骸ゼロ）", { skip }, () => {
  const before = core.listSessions();
  // cwd 不在は session 作成前に code 2 で throw する。残骸を残さないこと。
  assert.throws(
    () => core.openAgent("codex", { cwd: "/no/such/dir-aiterm-agent-test-2" }),
    (e) => e.code === 2,
  );
  assert.equal(core.listSessions(), before, "失敗した openAgent が session を残した");
});

// A-test: grok/composer 経路の組立コマンドを実検証（従来は codex 経路のみで未カバー）。
// 偽 bin を /bin/echo にすると起動コマンドがそのまま echo で出力され、組立内容を観測できる。
test("openAgent codex: -c model_reasoning_effort=<effort> を組み立てる", { skip }, async () => {
  const [sid] = core.openAgent("codex", { reasoning_effort: "high" }); // CODEX_BIN=/bin/echo
  try {
    const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
    assert.match(out, /-c model_reasoning_effort=high/, `codex 組立: ${out}`);
  } finally {
    core.closeSession(sid);
  }
});

test("openAgent codex agent_done: managed CODEX_HOME と Stop hook を組み立てる", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async (fakeHome) => {
    const [sid, hint] = core.openAgent("codex", { reasoning_effort: "high", agent_done: true });
    try {
      assert.match(hint, /agent_done 待機が有効/);
      const dir = agentStateDir();
      const metas = fs.readdirSync(dir).filter((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
      assert.equal(metas.length, 1);
      const meta = JSON.parse(fs.readFileSync(path.join(dir, metas[0]), "utf8"));
      assert.equal(meta.kind, "codex");
      assert.equal(meta.aiterm_session, sid);
      assert.ok(fs.existsSync(meta.event_file), "event file を作る");
      const hooks = JSON.parse(fs.readFileSync(path.join(meta.codex_home, "hooks.json"), "utf8"));
      assert.equal(hooks.hooks.Stop[0].hooks[0].type, "command");
      assert.match(hooks.hooks.Stop[0].hooks[0].command, /codex-stop-hook\.js/);
      assert.equal(fs.readlinkSync(path.join(meta.codex_home, "auth.json")), path.join(fakeHome, "auth.json"));

      const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
      assert.match(out, /--dangerously-bypass-hook-trust/, `codex managed command: ${out}`);
      assert.match(out, /model_reasoning_effort=high/, `codex managed effort: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("openAgent grok agent_done: isolated HOME と managed GROK_HOME/Stop hook/OAuth lock を組み立てる", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    await withFakeGrokHome(async (fakeHome) => {
      const [sid, hint] = core.openAgent("grok", {
        reasoning_effort: "high",
        agent_done: true,
        prompt: "Reply READY.",
      });
      try {
        assert.match(hint, /agent_done 待機が有効/);
        assert.match(hint, /一時 HOME/);
        const dir = agentStateDir();
        const metas = fs.readdirSync(dir).filter((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
        assert.equal(metas.length, 1);
        const meta = JSON.parse(fs.readFileSync(path.join(dir, metas[0]), "utf8"));
        assert.equal(meta.kind, "grok");
        assert.equal(meta.hook_route, "managed_grok_home");
        assert.ok(fs.existsSync(meta.event_file), "event file を作る");
        assert.equal(fs.readlinkSync(path.join(meta.grok_home, "auth.json")), path.join(fakeHome, "auth.json"));
        assert.equal(fs.readlinkSync(path.join(meta.grok_home, "auth.json.lock")), path.join(fakeHome, "auth.json.lock"));
        assert.ok(fs.statSync(path.join(fakeHome, "auth.json.lock")).isFile(), "real Grok home 側に lock を作る");
        assert.ok(fs.existsSync(path.join(meta.home)), "fake HOME を作る");
        assert.equal(fs.readlinkSync(path.join(meta.home, ".grok")), meta.grok_home);
        assert.match(fs.readFileSync(path.join(meta.grok_home, "config.toml"), "utf8"), /auto_update = false/);
        const hooks = JSON.parse(fs.readFileSync(path.join(meta.grok_home, "hooks", "aiterm-stop.json"), "utf8"));
        assert.equal(hooks.hooks.Stop[0].hooks[0].type, "command");
        assert.match(hooks.hooks.Stop[0].hooks[0].command, /grok-stop-hook\.js/);

        const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
        assert.match(out, /--no-auto-update/, `grok managed command: ${out}`);
        assert.match(out, /--no-alt-screen/, `grok managed no-alt-screen: ${out}`);
        assert.match(out, /--verbatim/, `grok managed verbatim: ${out}`);
        assert.match(out, /--model grok-build/, `grok managed model: ${out}`);
        assert.match(out, /--effort high/, `grok managed effort: ${out}`);
      } finally {
        core.closeSession(sid);
      }
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
  }
});

test("openAgent grok agent_done: OAuth auth 不在は session 残骸ゼロで拒否する", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  const savedApiKey = process.env.XAI_API_KEY;
  process.env.GROK_BIN = "/bin/echo";
  delete process.env.XAI_API_KEY;
  try {
    await withGrokHomeWithoutAuth(async () => {
      const beforeSessions = core.listSessions();
      const beforeFiles = agentStateFiles();
      assert.throws(
        () => core.openAgent("grok", { agent_done: true, prompt: "Reply READY." }),
        (e) => e.code === 2 && /grok login/.test(e.message),
      );
      assert.equal(core.listSessions(), beforeSessions, "失敗した grok agent が tmux session を残した");
      assert.deepEqual(agentStateFiles(), beforeFiles, "失敗した grok agent が agent state を残した");
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
    if (savedApiKey === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = savedApiKey;
  }
});

test("openAgent grok agent_done: auth lock hard link は拒否し、リンク先 mode を変えない", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    await withFakeGrokHome(async (fakeHome) => {
      const victim = path.join(fakeHome, "victim-lock-target");
      const lock = path.join(fakeHome, "auth.json.lock");
      fs.writeFileSync(victim, "lock\n", { mode: 0o644 });
      fs.linkSync(victim, lock);
      const beforeMode = fs.statSync(victim).mode & 0o777;
      assert.throws(
        () => core.openAgent("grok", { agent_done: true, prompt: "Reply READY." }),
        (e) => e.code === 2 && /hard link/.test(e.message),
      );
      assert.equal(fs.statSync(victim).mode & 0o777, beforeMode, "hard link 先の mode を変えてはいけない");
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
  }
});

test("openAgent composer agent_done: vendor=composer の metadata を作る", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    await withFakeGrokHome(async () => {
      const [sid] = core.openAgent("composer", {
        reasoning_effort: "low",
        agent_done: true,
        prompt: "Reply READY.",
      });
      try {
        const metaFile = fs.readdirSync(agentStateDir()).find((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
        assert.ok(metaFile);
        const meta = JSON.parse(fs.readFileSync(path.join(agentStateDir(), metaFile), "utf8"));
        assert.equal(meta.kind, "composer");
        const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
        assert.match(out, /--no-auto-update/, `composer managed command: ${out}`);
        assert.match(out, /--no-alt-screen/, `composer managed no-alt-screen: ${out}`);
        assert.match(out, /--verbatim/, `composer managed verbatim: ${out}`);
        assert.match(out, /--model grok-composer-2\.5-fast/, `composer managed model: ${out}`);
      } finally {
        core.closeSession(sid);
      }
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
  }
});

test("openAgent codex agent_done: cleanup は managed home の symlink 先 auth/config を変えない", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async (fakeHome) => {
    const authPath = path.join(fakeHome, "auth.json");
    const configPath = path.join(fakeHome, "config.toml");
    const authBefore = fileSnapshot(authPath);
    const configBefore = fileSnapshot(configPath);
    const [sid] = core.openAgent("codex", { agent_done: true });
    const meta = readAgentMeta(sid);
    assert.ok(fs.lstatSync(path.join(meta.codex_home, "auth.json")).isSymbolicLink());
    core.closeSession(sid);
    assert.deepEqual(fileSnapshot(authPath), authBefore, "cleanup が Codex auth.json の実体を変えた");
    assert.deepEqual(fileSnapshot(configPath), configBefore, "cleanup が Codex config.toml の実体を変えた");
    assert.equal(fs.existsSync(meta.codex_home), false, "managed CODEX_HOME が cleanup されていない");
  });
});

test("openAgent grok agent_done: cleanup は managed home の symlink 先 auth/lock/config を変えない", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    await withFakeGrokHome(async (fakeHome) => {
      const authPath = path.join(fakeHome, "auth.json");
      const lockPath = path.join(fakeHome, "auth.json.lock");
      const configPath = path.join(fakeHome, "config.toml");
      const authBefore = fileSnapshot(authPath);
      const configBefore = fileSnapshot(configPath);
      const [sid] = core.openAgent("grok", { agent_done: true });
      const meta = readAgentMeta(sid);
      const lockBefore = fileSnapshot(lockPath);
      assert.ok(fs.lstatSync(path.join(meta.grok_home, "auth.json")).isSymbolicLink());
      assert.ok(fs.lstatSync(path.join(meta.grok_home, "auth.json.lock")).isSymbolicLink());
      core.closeSession(sid);
      assert.deepEqual(fileSnapshot(authPath), authBefore, "cleanup が Grok auth.json の実体を変えた");
      assert.deepEqual(fileSnapshot(lockPath), lockBefore, "cleanup が Grok auth.json.lock の実体を変えた");
      assert.deepEqual(fileSnapshot(configPath), configBefore, "cleanup が通常 Grok config.toml の実体を変えた");
      assert.equal(fs.existsSync(meta.grok_home), false, "managed GROK_HOME が cleanup されていない");
      assert.equal(fs.existsSync(meta.home), false, "fake HOME が cleanup されていない");
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
  }
});

test("killAll: agent state root symlink は辿って cleanup しない", { skip: skipAgentDone }, () => {
  const savedTmp = process.env.TMPDIR;
  const savedXdg = process.env.XDG_RUNTIME_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-core-rootlink-"));
  const uid = process.getuid();
  const real = path.join(tmp, "real");
  const agents = path.join(real, "agents");
  fs.mkdirSync(agents, { recursive: true, mode: 0o700 });
  fs.chmodSync(real, 0o700);
  fs.chmodSync(agents, 0o700);
  const victim = path.join(agents, "victim.agent.json");
  fs.writeFileSync(victim, "{}\n", { mode: 0o600 });
  fs.symlinkSync(real, path.join(tmp, `aiterm-mcp-${uid}`));
  process.env.TMPDIR = tmp;
  delete process.env.XDG_RUNTIME_DIR;
  try {
    core.killAll();
    assert.equal(fs.existsSync(victim), true, "root symlink 配下の agent state を削除してはいけない");
  } finally {
    if (savedTmp === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = savedTmp;
    if (savedXdg === undefined) delete process.env.XDG_RUNTIME_DIR;
    else process.env.XDG_RUNTIME_DIR = savedXdg;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("openAgent agent_done: 緩い state root でも stale metadata を掃除してから再作成する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const session = "loose_cleanup";
    const root = path.join(process.env.TMPDIR, `aiterm-mcp-${process.getuid()}`);
    const agents = path.join(root, "agents");
    fs.mkdirSync(agents, { recursive: true, mode: 0o700 });
    fs.chmodSync(root, 0o777);
    fs.writeFileSync(path.join(agents, `${session}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.agent.json`), "{}\n", { mode: 0o600 });

    const [sid] = core.openAgent("codex", { session_name: session, agent_done: true });
    try {
      assert.equal(sid, session);
      const files = fs.readdirSync(agents).filter((f) => f.startsWith(`${session}.`) && f.endsWith(".agent.json"));
      assert.equal(files.length, 1, `stale metadata が残った: ${files.join(",")}`);
      assert.doesNotMatch(files[0], /aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
      assert.equal(fs.statSync(root).mode & 0o777, 0o700);

      await markFakeAgentReady(session, "codex");
      const out = await core.sendAndWaitAgentDone(session, "echo LOOSE_CLEANUP_BODY", { timeout: 0, screen: false });
      assert.match(out, /LOOSE_CLEANUP_BODY/);
      assert.match(out, /is_complete=False via agent_timeout vendor=codex/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: event 到着まで待って結果へ agent_done suffix を付ける", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const metaFile = fs.readdirSync(agentStateDir()).find((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
      assert.ok(metaFile);
      const meta = JSON.parse(fs.readFileSync(path.join(agentStateDir(), metaFile), "utf8"));
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo AGENT_DONE_BODY", { timeout: 3, screen: false });
      setTimeout(() => {
        fs.appendFileSync(
          meta.event_file,
          JSON.stringify({
            type: "agent_done",
            vendor: "codex",
            aiterm_session: sid,
            launch_id: meta.launch_id,
            vendor_session_id: "codex-session-test",
            turn_id: "turn-test",
            reason: "Stop",
            done_status: "turn_done",
            at: new Date().toISOString(),
          }) + "\n",
        );
      }, 200);
      const out = await p;
      assert.match(out, /AGENT_DONE_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /is_complete=True via agent_done vendor=codex turn_id=turn-test/, `agent_done suffix: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: Grok vendor event も待って suffix に vendor=grok を付ける", { skip: skipAgentDone }, async () => {
  const savedBin = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    await withFakeGrokHome(async () => {
      const [sid] = core.openAgent("grok", { agent_done: true });
      try {
        const metaFile = fs.readdirSync(agentStateDir()).find((f) => f.startsWith(`${sid}.`) && f.endsWith(".agent.json"));
        assert.ok(metaFile);
        const meta = JSON.parse(fs.readFileSync(path.join(agentStateDir(), metaFile), "utf8"));
        await markFakeAgentReady(sid, "grok");
        const p = core.sendAndWaitAgentDone(sid, "echo GROK_DONE_BODY", { timeout: 3, screen: false });
        setTimeout(() => {
          fs.appendFileSync(
            meta.event_file,
            JSON.stringify({
              type: "agent_done",
              vendor: "grok",
              aiterm_session: sid,
              launch_id: meta.launch_id,
              vendor_session_id: "grok-session-test",
              turn_id: "prompt-test",
              reason: "end_turn",
              done_status: "turn_done",
              at: new Date().toISOString(),
            }) + "\n",
          );
        }, 200);
        const out = await p;
        assert.match(out, /GROK_DONE_BODY/, `send 結果を読める: ${out}`);
        assert.match(out, /is_complete=True via agent_done vendor=grok turn_id=prompt-test/, `agent_done suffix: ${out}`);
      } finally {
        core.closeSession(sid);
      }
    });
  } finally {
    if (savedBin === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = savedBin;
  }
});

test("sendAndWaitAgentDone: 起動時 prompt が未完了なら follow-up を送信前に拒否する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true, prompt: "Reply READY." });
    try {
      await assert.rejects(
        () => core.sendAndWaitAgentDone(sid, "echo SHOULD_NOT_BE_SENT", { timeout: 1, screen: false }),
        (e) => e.code === 2 && /起動時 prompt の完了待ち/.test(e.message),
      );
      const out = await core.readOutput(sid, { screen: true, raw: true });
      assert.doesNotMatch(out, /SHOULD_NOT_BE_SENT/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: agent TUI ready 前は送信前に拒否し文字を流さない", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      await assert.rejects(
        () => core.sendAndWaitAgentDone(sid, "echo SHOULD_NOT_BE_SENT", { timeout: 0, ready_timeout: 0, screen: false }),
        (e) => e.code === 2 && /入力受付状態/.test(e.message),
      );
      const out = await core.readOutput(sid, { screen: true, raw: true });
      assert.doesNotMatch(out, /SHOULD_NOT_BE_SENT/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: 送信前の古い event / 初回 prompt done を follow-up done と誤認しない", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true, prompt: "Reply READY." });
    try {
      const meta = readAgentMeta(sid);
      appendAgentDone(meta, {
        vendor_session_id: "codex-session-initial",
        turn_id: "initial-turn",
      });
      const out = await core.sendAndWaitAgentDone(sid, "echo FOLLOWUP_BODY", { timeout: 0, screen: false });
      assert.match(out, /FOLLOWUP_BODY/, `follow-up の出力は返す: ${out}`);
      assert.match(out, /is_complete=False via agent_timeout vendor=codex/, `古い event を拾っていない: ${out}`);
      assert.doesNotMatch(out, /initial-turn/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: 送信直後に到着した event を race で落とさず、done 後の増分も重複させない", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo IMMEDIATE_DONE_BODY", { timeout: 3, screen: false });
      scheduleAgentDone(meta, {
        vendor_session_id: "codex-session-race",
        turn_id: "race-turn",
      });
      const out = await p;
      assert.match(out, /IMMEDIATE_DONE_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /is_complete=True via agent_done vendor=codex turn_id=race-turn/, `即時 event を拾う: ${out}`);

      const next = await core.readOutput(sid, { raw: true });
      assert.doesNotMatch(next, /IMMEDIATE_DONE_BODY/, `done 後の通常 pty_read が同じターンを重複した: ${next}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: 同一 session の二重 wait は busy reject する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p1 = core.sendAndWaitAgentDone(sid, "echo BUSY_BODY_ONE", { timeout: 3, screen: false });
      await assert.rejects(
        () => core.sendAndWaitAgentDone(sid, "echo BUSY_BODY_TWO", { timeout: 0, screen: false }),
        (e) => e.code === 2 && /別の agent_done 待機中/.test(e.message),
      );
      setTimeout(() => {
        appendAgentDone(meta, {
          vendor_session_id: "codex-session-busy",
          turn_id: "busy-turn",
        });
      }, 300);
      const out = await p1;
      assert.match(out, /BUSY_BODY_ONE/, `先行 wait は完了する: ${out}`);
      assert.doesNotMatch(out, /BUSY_BODY_TWO/, `busy reject された2本目が送信された: ${out}`);
      assert.match(out, /turn_id=busy-turn/, `先行 wait が event を拾う: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: launch_id 不一致 event を無視する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo WRONG_LAUNCH_BODY", { timeout: 1, screen: false });
      scheduleAgentDone(meta, {
        launch_id: "ffffffffffffffffffffffffffffffff",
        turn_id: "wrong-launch",
      });
      const out = await p;
      assert.match(out, /WRONG_LAUNCH_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /is_complete=False via agent_timeout vendor=codex/, `launch_id 不一致を拾っていない: ${out}`);
      assert.doesNotMatch(out, /wrong-launch/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: vendor_session_id bind 後は不一致 event を無視する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p1 = core.sendAndWaitAgentDone(sid, "echo BIND_ONE", { timeout: 3, screen: false });
      scheduleAgentDone(meta, {
        vendor_session_id: "vendor-session-a",
        turn_id: "bind-one",
      });
      const first = await p1;
      assert.match(first, /turn_id=bind-one/);

      const bound = readAgentMeta(sid);
      assert.equal(bound.vendor_session_id, "vendor-session-a");
      const p2 = core.sendAndWaitAgentDone(sid, "echo BIND_TWO", { timeout: 1, screen: false });
      scheduleAgentDone(bound, {
        vendor_session_id: "vendor-session-b",
        turn_id: "wrong-vendor-session",
      });
      const second = await p2;
      assert.match(second, /BIND_TWO/, `send 結果を読める: ${second}`);
      assert.match(second, /is_complete=False via agent_timeout vendor=codex/, `vendor_session_id 不一致を拾っていない: ${second}`);
      assert.doesNotMatch(second, /wrong-vendor-session/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: bind 後の vendor_session_id 欠落 event は無視する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p1 = core.sendAndWaitAgentDone(sid, "echo NULL_BIND_ONE", { timeout: 3, screen: false });
      scheduleAgentDone(meta, {
        vendor_session_id: "vendor-session-a",
        turn_id: "bind-one",
      });
      const first = await p1;
      assert.match(first, /turn_id=bind-one/);

      const bound = readAgentMeta(sid);
      const p2 = core.sendAndWaitAgentDone(sid, "echo NULL_BIND_TWO", { timeout: 1, screen: false });
      scheduleAgentDone(bound, {
        vendor_session_id: null,
        turn_id: "null-vendor-session",
      });
      const second = await p2;
      assert.match(second, /NULL_BIND_TWO/, `send 結果を読める: ${second}`);
      assert.match(second, /is_complete=False via agent_timeout vendor=codex/, `vendor_session_id 欠落を拾っていない: ${second}`);
      assert.doesNotMatch(second, /null-vendor-session/);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: bind 前に複数 vendor_session_id が混在したら曖昧成功にしない", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo AMBIGUOUS_VENDOR_BODY", { timeout: 3, screen: false });
      setTimeout(() => {
        fs.appendFileSync(
          meta.event_file,
          agentDoneLine(meta, { vendor_session_id: "vendor-session-b", turn_id: "ambiguous-b" }) +
            agentDoneLine(meta, { vendor_session_id: "vendor-session-a", turn_id: "ambiguous-a" }),
        );
      }, 200);
      await assert.rejects(p, (e) => e.code === 2 && /複数の vendor_session_id/.test(e.message));
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: wait 中の close/killAll と stale file lock を拒否する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo LOCK_BODY", { timeout: 3, screen: false });
      assert.throws(() => core.closeSession(sid), (e) => e.code === 2 && /agent_done 待機中/.test(e.message));
      assert.throws(() => core.killAll(), (e) => e.code === 2 && /agent_done 待機中/.test(e.message));
      scheduleAgentDone(meta, {
        vendor_session_id: "codex-session-lock",
        turn_id: "lock-turn",
      });
      const out = await p;
      assert.match(out, /turn_id=lock-turn/);
    } finally {
      core.closeSession(sid);
    }

    const [sid2] = core.openAgent("codex", { agent_done: true });
    try {
      const meta2 = readAgentMeta(sid2);
      const lockPath = path.join(agentStateDir(), `${sid2}.${meta2.launch_id}.wait.lock`);
      fs.writeFileSync(lockPath, "stale\n", { mode: 0o600 });
      await assert.rejects(
        () => core.sendAndWaitAgentDone(sid2, "echo SHOULD_NOT_BE_SENT", { timeout: 0, screen: false }),
        (e) => e.code === 2 && /別プロセスの agent_done 待機中/.test(e.message),
      );
      fs.unlinkSync(lockPath);
      const out = await core.readOutput(sid2, { screen: true, raw: true });
      assert.doesNotMatch(out, /SHOULD_NOT_BE_SENT/);
    } finally {
      core.closeSession(sid2);
    }
  });
});

test("sendAndWaitAgentDone: partial JSONL fragment は次 poll まで保持する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      const line = agentDoneLine(meta, {
        vendor_session_id: "codex-session-partial",
        turn_id: "partial-turn",
      });
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo PARTIAL_BODY", { timeout: 3, screen: false });
      setTimeout(() => {
        fs.appendFileSync(meta.event_file, line.slice(0, 20));
        setTimeout(() => {
          fs.appendFileSync(meta.event_file, line.slice(20));
        }, 350);
      }, 200);
      const out = await p;
      assert.match(out, /PARTIAL_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /turn_id=partial-turn/, `分割 JSONL event を拾う: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: malformed 完結 JSONL は timeout suffix に診断を出す", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo MALFORMED_BODY", { timeout: 1, screen: false });
      setTimeout(() => fs.appendFileSync(meta.event_file, '{"type":"agent_done"\n'), 200);
      const out = await p;
      assert.match(out, /MALFORMED_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /is_complete=False via agent_timeout vendor=codex malformed_events=1/, `malformed 診断: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: oversized JSONL 行も malformed 診断に数える", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      const meta = readAgentMeta(sid);
      await markFakeAgentReady(sid, "codex");
      const p = core.sendAndWaitAgentDone(sid, "echo OVERSIZED_BODY", { timeout: 1, screen: false });
      setTimeout(() => fs.appendFileSync(meta.event_file, "x".repeat(70 * 1024) + "\n"), 200);
      const out = await p;
      assert.match(out, /OVERSIZED_BODY/, `send 結果を読める: ${out}`);
      assert.match(out, /is_complete=False via agent_timeout vendor=codex malformed_events=1/, `oversized 診断: ${out}`);
    } finally {
      core.closeSession(sid);
    }
  });
});

test("sendAndWaitAgentDone: 普通のPTY session は送信前に拒否する", { skip: skipAgentDone }, async () => {
  const sid = "plain_agentdone";
  core.openSession(sid);
  try {
    await assert.rejects(
      () => core.sendAndWaitAgentDone(sid, "echo SHOULD_NOT_BE_SENT", { timeout: 1 }),
      (e) => e.code === 2 && /agent_done 管理セッション/.test(e.message),
    );
    const out = await core.readOutput(sid, { screen: true, raw: true });
    assert.doesNotMatch(out, /SHOULD_NOT_BE_SENT/);
  } finally {
    core.closeSession(sid);
  }
});

test("sendAndWaitAgentDone: enter:false は送信前に拒否する", { skip: skipAgentDone }, async () => {
  await withFakeCodexHome(async () => {
    const [sid] = core.openAgent("codex", { agent_done: true });
    try {
      await assert.rejects(
        () => core.sendAndWaitAgentDone(sid, "echo SHOULD_NOT_BE_SENT", { enter: false, timeout: 1 }),
        (e) => e.code === 2 && /enter:false/.test(e.message),
      );
      const out = await core.readOutput(sid, { screen: true, raw: true });
      assert.doesNotMatch(out, /SHOULD_NOT_BE_SENT/);
    } finally {
      core.closeSession(sid);
    }
  });
});
test("openAgent grok: --model grok-build と --effort を組み立てる", { skip }, async () => {
  const saved = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo"; // grok 経路を echo で可視化
  try {
    const [sid] = core.openAgent("grok", { reasoning_effort: "high" });
    const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
    assert.match(out, /--no-auto-update/, `grok no-auto-update: ${out}`);
    assert.match(out, /--model grok-build/, `grok model: ${out}`);
    assert.match(out, /--effort high/, `grok effort: ${out}`);
    core.closeSession(sid);
  } finally {
    if (saved === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = saved;
  }
});
test("openAgent composer: --model grok-composer-2.5-fast を組み立てる（コピペ swap 検出）", { skip }, async () => {
  const saved = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo";
  try {
    const [sid] = core.openAgent("composer", { reasoning_effort: "low" });
    const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
    assert.match(out, /--no-auto-update/, `composer no-auto-update: ${out}`);
    assert.match(out, /--model grok-composer-2\.5-fast/, `composer model: ${out}`);
    assert.match(out, /--effort low/, `composer effort: ${out}`);
    core.closeSession(sid);
  } finally {
    if (saved === undefined) delete process.env.GROK_BIN;
    else process.env.GROK_BIN = saved;
  }
});

// A3: env 指定 bin の実在検証（存在しないパスを黙って返して偽成功にしない）。tmux 不要（session 前に throw）。
test("openAgent: 存在しない CODEX_BIN は明示エラー（偽成功にしない・A3）", () => {
  const saved = process.env.CODEX_BIN;
  process.env.CODEX_BIN = "/no/such/codex-bin-aiterm-xyz";
  try {
    assert.throws(
      () => core.openAgent("codex", {}),
      (e) => e.code === 2 && /CODEX_BIN/.test(e.message),
    );
  } finally {
    process.env.CODEX_BIN = saved;
  }
});

// A6: cwd の空文字・~ 未展開を明示エラーに。tmux 不要（bin 解決後・session 前に throw）。
test("openAgent: 空文字 cwd は明示エラー（A6）", () => {
  assert.throws(() => core.openAgent("codex", { cwd: "" }), (e) => e.code === 2 && /空/.test(e.message));
});
test("openAgent: ~ 始まりの cwd は展開されない旨の明示エラー（A6）", () => {
  assert.throws(() => core.openAgent("codex", { cwd: "~/repo" }), (e) => e.code === 2 && /~/.test(e.message));
});

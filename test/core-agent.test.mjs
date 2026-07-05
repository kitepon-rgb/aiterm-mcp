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
// 実 CLI を起動せず openAgent の配管だけ検証する偽 bin。resolveAgentBin は存在検証する（A3）ため、
// 実在するパスにする必要がある。POSIX は /bin/echo（起動コマンドを echo で可視化できる）、native
// Windows には /bin/echo が無いので node 自身（必ず存在）を使う——echo 出力を読む grok/composer/codex
// 組立テストは { skip }（tmux 必須）で native Windows では走らないため、可視化不要な bin で足りる。
process.env.CODEX_BIN = process.platform === "win32" ? process.execPath : "/bin/echo";
const core = await import("../dist/core.js");
const skip = hasTmux ? undefined : "tmux 未インストール";

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
test("openAgent grok: --model grok-build と --effort を組み立てる", { skip }, async () => {
  const saved = process.env.GROK_BIN;
  process.env.GROK_BIN = "/bin/echo"; // grok 経路を echo で可視化
  try {
    const [sid] = core.openAgent("grok", { reasoning_effort: "high" });
    const out = await core.readOutput(sid, { wait: true, timeout: 5, raw: true });
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

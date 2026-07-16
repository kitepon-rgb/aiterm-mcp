// core.ts の純粋関数（tmux 非依存）の回帰テスト: stripControl / reduceOutput。
import { test } from "node:test";
import assert from "node:assert/strict";
import * as core from "../dist/core.js";

// ---------------------------------------------------------------- utf8SafeEnd（B3: マルチバイト境界）
test("utf8SafeEnd: 不完全な UTF-8 末尾を文字境界まで戻す", () => {
  const s = Buffer.from("あい", "utf8"); // 6 バイト（3+3）
  assert.equal(core.utf8SafeEnd(s, 6), 6); // 完全
  assert.equal(core.utf8SafeEnd(s, 4), 3); // 「い」の途中(4)→「あ」の後(3)へ戻す
  assert.equal(core.utf8SafeEnd(s, 5), 3); // 同上
  assert.equal(core.utf8SafeEnd(s, 3), 3); // 「あ」の後は境界
  assert.equal(core.utf8SafeEnd(Buffer.from("abc"), 3), 3); // ASCII は常に境界
  assert.equal(core.utf8SafeEnd(Buffer.from("a😀", "utf8"), 3), 1); // 4バイト絵文字の途中→「a」の後へ
  assert.equal(core.utf8SafeEnd(Buffer.alloc(0), 0), 0);
});

// ---------------------------------------------------------------- stripControl
test("stripControl: ANSI/OSC/制御文字を除去、tab と改行は残す", () => {
  assert.equal(core.stripControl("\x1b[31mred\x1b[0m"), "red");
  assert.equal(core.stripControl("\x1b]0;title\x07body"), "body"); // OSC + BEL 終端
  assert.equal(core.stripControl("\x1bPq;data\x1b\\body"), "body"); // DCS + ST 終端（ペイロードごと除去・B10）
  assert.equal(core.stripControl("\x1b_APCpayload\x07body"), "body"); // APC + BEL 終端（B10）
  assert.equal(core.stripControl("a\x00b\x07c"), "abc"); // NUL/BEL 除去
  assert.equal(core.stripControl("col1\tcol2"), "col1\tcol2"); // tab 保持
});

test("stripControl: CRLF 正規化と行内 CR 上書きは最終状態だけ残す", () => {
  assert.equal(core.stripControl("a\r\nb"), "a\nb");
  assert.equal(core.stripControl("loading...\rdone"), "done"); // 進捗上書き
  assert.equal(core.stripControl("x   \ny\t\t"), "x\ny"); // 行末空白 rstrip
});

// ---------------------------------------------------------------- reduceOutput: dedup
test("reduceOutput: 同一行 N(>=3) 連続を 1 行＋件数に畳む", () => {
  const [body] = core.reduceOutput("a\na\na\na\na", "t1");
  assert.equal(body, "a  〈×5〉");
});
test("reduceOutput: 連続 2 行は畳まない（閾値 3）", () => {
  const [body] = core.reduceOutput("a\na\nb", "t1");
  assert.equal(body, "a\na\nb");
});

// ---------------------------------------------------------------- reduceOutput: 空行畳み
test("reduceOutput: 連続空行を 1 行に、前後の空行は除去", () => {
  const [body] = core.reduceOutput("\n\na\n\n\n\nb\n\n", "t1");
  assert.equal(body, "a\n\nb");
});

// ---------------------------------------------------------------- reduceOutput: elide（head+tail 折りたたみ）
test("reduceOutput: 60 行超は head30 + ヒント + tail20 に畳む", () => {
  const lines = Array.from({ length: 100 }, (_, i) => `line${i}`);
  const [body, meta] = core.reduceOutput(lines.join("\n"), "sess");
  const out = body.split("\n");
  assert.equal(out.length, 31 + 20); // head30 + hint(1) + tail20
  assert.equal(out[0], "line0");
  assert.equal(out[29], "line29");
  assert.equal(out[30], '… 〈50 行省略。全文は full=true、範囲は line_range="A:B"〉 …');
  assert.equal(out[31], "line80");
  assert.equal(out[50], "line99");
  assert.match(meta, /\[aiterm sess: 51 行 \/ ~\d+ tok \(raw 100 行 \/ ~\d+ tok\); 50 行 hidden\]/);
});

test("reduceOutput: elide=false なら折りたたまない", () => {
  const lines = Array.from({ length: 100 }, (_, i) => `L${i}`);
  const [body] = core.reduceOutput(lines.join("\n"), "sess", false);
  assert.equal(body.split("\n").length, 100);
});

test("reduceOutput: 少数の巨大行は行数を保ったまま行内を省略する", () => {
  const lines = Array.from({ length: 3 }, (_, i) => `${i}${"x".repeat(100_000)}`);
  const [body] = core.reduceOutput(lines.join("\n"), "huge");
  const out = body.split("\n");
  assert.equal(out.length, 3);
  assert.ok(body.length < 10_000, `出力が有界: ${body.length}`);
  assert.equal((body.match(/行内 \d+ 文字省略/g) ?? []).length, 3);
  assert.ok(out.every((line, i) => line.startsWith(String(i))), "行順序を保つ");
});

test("reduceOutput: 行内省略はサロゲートペアとマルチバイト文字を分断しない", () => {
  const line = `${"a".repeat(1199)}😀あ${"b".repeat(2000)}`;
  const [body] = core.reduceOutput(line, "unicode");
  assert.ok(body.startsWith(`${"a".repeat(1199)}😀`));
  assert.ok(body.endsWith("b".repeat(600)));
  assert.doesNotMatch(body, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
});

test("reduceOutput: elide=false は巨大行もそのまま返し line_range の復元経路を保つ", () => {
  const line = "x".repeat(2001);
  const [body] = core.reduceOutput(line, "range", false);
  assert.equal(body, line);
});

test("reduceOutput: メタは raw 行数/トークン概算を併記", () => {
  const [, meta] = core.reduceOutput("a\nb\nc", "x");
  assert.match(meta, /^\[aiterm x: 3 行 \/ ~\d+ tok \(raw 3 行 \/ ~\d+ tok\)\]$/);
});

// ---------------------------------------------------------------- agent_done screen settle
test("agent_done screen settle: 不一致後に screen/log が一致すれば安定扱い", async () => {
  const r = await core.__testSettleAgentDoneScreen(
    [
      { screen: "old", logSize: 1 },
      { screen: "new", logSize: 2 },
      { screen: "new", logSize: 2 },
    ],
    { minDelayMs: 10, pollMs: 20, maxPolls: 5 },
  );
  assert.equal(r.unstable, false);
  assert.equal(r.samples, 3);
  assert.deepEqual(r.sleeps, [10, 20, 20]);
});

test("agent_done screen settle: 古い画面の一時的な一致だけでは早期安定扱いしない", async () => {
  const r = await core.__testSettleAgentDoneScreen(
    [
      { screen: "old", logSize: 1 },
      { screen: "old", logSize: 1 },
      { screen: "new", logSize: 2 },
      { screen: "new", logSize: 2 },
    ],
    { minDelayMs: 0, pollMs: 0, maxPolls: 5 },
  );
  assert.equal(r.unstable, false);
  assert.equal(r.samples, 4);
});

test("agent_done screen settle: 上限まで一致しなければ unstable", async () => {
  const r = await core.__testSettleAgentDoneScreen(
    [
      { screen: "a", logSize: 1 },
      { screen: "b", logSize: 2 },
      { screen: "c", logSize: 3 },
      { screen: "d", logSize: 4 },
    ],
    { minDelayMs: 0, pollMs: 0, maxPolls: 3 },
  );
  assert.equal(r.unstable, true);
  assert.equal(r.samples, 4);
});

// ---------------------------------------------------------------- agent_done TUI ready gate
test("agent_done ready gate: Claude/Codex/Grok/Composer の入力欄を判定する", () => {
  assert.equal(core.__testIsAgentTuiReady("claude", "Claude Code v2.1.211\n❯ "), true);
  assert.equal(core.__testIsAgentTuiReady("codex", "╭─╮\n│ >_ OpenAI Codex │\n› "), true);
  assert.equal(core.__testIsAgentTuiReady("grok", "Grok Build  0.2.87 Beta\n  │ ❯"), true);
  assert.equal(core.__testIsAgentTuiReady("composer", "Grok Build  0.2.87 Beta\n  │ ❯"), true);
  assert.equal(core.__testIsAgentTuiReady("codex", "OpenAI Codex\n◦ Starting MCP servers"), false);
  assert.equal(core.__testIsAgentTuiReady("grok", "Grok Build\nChangelog"), false);
  assert.equal(core.__testIsAgentTuiReady("claude", "Claude Code\nConnecting…"), false);
});

test("agent_done ready gate: ready になるまで polling し、timeout なら false", async () => {
  const ok = await core.__testWaitAgentTuiReady(
    "codex",
    ["OpenAI Codex\n◦ Starting MCP servers", "OpenAI Codex\n› "],
    { timeoutMs: 100, pollMs: 10 },
  );
  assert.equal(ok.ready, true);
  assert.equal(ok.samples, 2);
  assert.deepEqual(ok.sleeps, [10]);

  const bad = await core.__testWaitAgentTuiReady("grok", ["Grok Build\nChangelog"], {
    timeoutMs: 0,
    pollMs: 10,
  });
  assert.equal(bad.ready, false);
  assert.equal(bad.samples, 1);
  assert.deepEqual(bad.sleeps, []);
});

// ---------------------------------------------------------------- toWslPath（Windows 橋渡しのパス変換）
test("toWslPath: ドライブパスを /mnt 形へ（ドライブ文字は小文字化）", () => {
  assert.equal(core.toWslPath("C:\\Users\\x\\f.log"), "/mnt/c/Users/x/f.log");
  assert.equal(core.toWslPath("D:/a/b"), "/mnt/d/a/b"); // forward-slash 入力も通す
});
test("toWslPath: UNC（ドライブ直下でない）は code=2 で弾く", () => {
  assert.throws(() => core.toWslPath("\\\\server\\share\\x"), (e) => e.code === 2);
});

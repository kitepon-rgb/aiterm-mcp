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

test("reduceOutput: メタは raw 行数/トークン概算を併記", () => {
  const [, meta] = core.reduceOutput("a\nb\nc", "x");
  assert.match(meta, /^\[aiterm x: 3 行 \/ ~\d+ tok \(raw 3 行 \/ ~\d+ tok\)\]$/);
});

// ---------------------------------------------------------------- toWslPath（Windows 橋渡しのパス変換）
test("toWslPath: ドライブパスを /mnt 形へ（ドライブ文字は小文字化）", () => {
  assert.equal(core.toWslPath("C:\\Users\\x\\f.log"), "/mnt/c/Users/x/f.log");
  assert.equal(core.toWslPath("D:/a/b"), "/mnt/d/a/b"); // forward-slash 入力も通す
});
test("toWslPath: UNC（ドライブ直下でない）は code=2 で弾く", () => {
  assert.throws(() => core.toWslPath("\\\\server\\share\\x"), (e) => e.code === 2);
});

// rtk reducer の回帰テスト（モデル非依存の核）。
// - pytest: 実機 rtk 0.42.0 から採取した golden(tee 行除去) と一致を固定。
//   例外: proj_ra(FAILED 要約行) は理由を全文保持する自前挙動を期待値にしている(可読性優先・rtk とは意図的に相違)。
// - grep/git/filters: Python プロトタイプ(=同一アルゴリズム)で生成した期待値を固定。
// - classify ルーティング / truncate コードポイント境界 / reduce フォールバックを検証。
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as rtk from "../dist/rtk.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures");
const rstrip = (s) => s.replace(/\s+$/, "");

// ---------------------------------------------------------------- pytest（rtk 0.42.0 と byte 一致）
const PYTEST_CASES = ["proj", "proj_ra", "allpass", "notests", "onlyskip", "cap"];
for (const c of PYTEST_CASES) {
  test(`reducePytest byte-exact vs rtk 0.42.0: ${c}`, () => {
    const input = fs.readFileSync(path.join(FIX, "pytest", `${c}.input.txt`), "utf8");
    const expected = fs.readFileSync(path.join(FIX, "pytest", `${c}.expected.txt`), "utf8");
    const got = rtk.reducePytest(input);
    assert.equal(rstrip(got), rstrip(expected));
  });
}

test("reducePytest: 0件は 'No tests collected'", () => {
  assert.equal(rtk.reducePytest("1 file skipped\n"), "Pytest: No tests collected");
  assert.equal(rtk.reducePytest(""), "Pytest: No tests collected");
});

test("reducePytest: 全パスは 'Pytest: N passed' のみ", () => {
  assert.equal(rtk.reducePytest("... [100%]\n=== 5 passed in 0.10s ==="), "Pytest: 5 passed");
});

// 収集エラー（import 失敗等）を無害/緑に偽装しないこと（rtk 0.42.0 とは意図的に相違＝失敗マスキング禁止）。
// C1 修正前は "No tests collected" / "Pytest: 1 passed" に潰れ、AI が赤を無害/緑と誤読していた。
const COLLECT_ERROR_ONLY = [
  "============================= test session starts ==============================",
  "collected 0 items / 1 error",
  "",
  "==================================== ERRORS ====================================",
  "_______________ ERROR collecting test_broken.py ________________________________",
  "ImportError while importing test module '/proj/test_broken.py'.",
  "test_broken.py:3: in <module>",
  "    import nonexistent_module",
  "E   ModuleNotFoundError: No module named 'nonexistent_module'",
  "=========================== short test summary info ============================",
  "ERROR test_broken.py",
  "!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!!",
  "=============================== 1 error in 0.12s ===============================",
].join("\n");

const PASS_PLUS_ERROR = [
  "============================= test session starts ==============================",
  "collected 2 items / 1 error",
  "",
  "test_ok.py .                                                             [ 50%]",
  "",
  "==================================== ERRORS ====================================",
  "_______________ ERROR collecting test_broken.py ________________________________",
  "E   ModuleNotFoundError: No module named 'nonexistent_module'",
  "=========================== short test summary info ============================",
  "ERROR test_broken.py",
  "============================== 1 passed, 1 error in 0.34s ======================",
].join("\n");

test("reducePytest: 収集エラーのみを 'No tests collected' に潰さず error を表面化", () => {
  const got = rtk.reducePytest(COLLECT_ERROR_ONLY);
  assert.doesNotMatch(got, /No tests collected/, "収集エラーが無害誤読される");
  assert.match(got, /1 error/, "error 件数が表示されない");
  assert.match(got, /ERROR test_broken\.py/, "どのモジュールが error か表示されない");
});

test("reducePytest: passed と error 併存で緑偽装しない（'1 passed' に潰さない）", () => {
  const got = rtk.reducePytest(PASS_PLUS_ERROR);
  assert.match(got, /1 passed/, "passed 件数は保持");
  assert.match(got, /1 error/, "error が握り潰され緑偽装される");
  assert.match(got, /ERROR test_broken\.py/, "error モジュールが表示されない");
});

// ---------------------------------------------------------------- grep/git/filters（期待値を凍結）
const reducers = JSON.parse(fs.readFileSync(path.join(FIX, "reducers.json"), "utf8"));
for (const e of reducers) {
  test(`reduce[${e.reducer ?? "fallback"}]: ${e.name}`, () => {
    const [reduced, rname] = rtk.reduce(e.cmd, e.input);
    assert.equal(rname, e.reducer, `reducer name for ${e.name}`);
    assert.equal(reduced, e.expected, `reduced output for ${e.name}`);
  });
}

// reduceGrep 単体: 無一致は null（→ 呼び出し側で汎用削減フォールバック）
test("reduceGrep: file:line:content でなければ null", () => {
  assert.equal(rtk.reduceGrep("no colon format here\njust prose"), null);
});

// reduceGitStatus / reduceGitLog 単体: 非該当は null
test("reduceGitStatus: 空入力は null", () => {
  assert.equal(rtk.reduceGitStatus("   \n  \n"), null);
});
test("reduceGitLog: 'commit ' を含まなければ null", () => {
  assert.equal(rtk.reduceGitLog("not a git log"), null);
});

// ---------------------------------------------------------------- classify ルーティング
test("classify: 接頭辞/別名/非該当", () => {
  assert.equal(rtk.classify("git status"), "git-status");
  assert.equal(rtk.classify("git status -sb"), "git-status");
  assert.equal(rtk.classify("git log --oneline"), "git-log");
  assert.equal(rtk.classify("git diff"), null); // git だが status/log 以外
  assert.equal(rtk.classify("grep -rn foo ."), "grep");
  assert.equal(rtk.classify("rg pattern"), "grep");
  assert.equal(rtk.classify("pytest tests/"), "pytest");
  assert.equal(rtk.classify("py.test"), "pytest");
  assert.equal(rtk.classify("python -m pytest tests/"), "pytest");
  // 接頭辞 sudo / env / VAR= をスキップして verb を見る
  assert.equal(rtk.classify("sudo pytest tests/"), "pytest");
  assert.equal(rtk.classify("env FOO=1 grep -rn x ."), "grep");
  assert.equal(rtk.classify("FOO=1 BAR=2 git status"), "git-status");
  assert.equal(rtk.classify("command git log"), "git-log");
  // パス付き verb の basename を見る
  assert.equal(rtk.classify("/usr/bin/git status"), "git-status");
  // FILTERS
  assert.equal(rtk.classify("df -h"), "df");
  assert.equal(rtk.classify("free -h"), "free");
  assert.equal(rtk.classify("make all"), "make");
  assert.equal(rtk.classify("systemctl status nginx"), "systemctl");
  // 非該当は null（→ generic フォールバック）
  assert.equal(rtk.classify("ls -la"), null);
  assert.equal(rtk.classify("echo hi"), null);
  assert.equal(rtk.classify("python3 -m pytest"), null); // 既知の限界: python3 は拾わない(python のみ)
  assert.equal(rtk.classify(""), null);
});

test("reduce: 非該当コマンドは [null,null]（generic フォールバック）", () => {
  assert.deepEqual(rtk.reduce("ls -la", "some output"), [null, null]);
});

// ---------------------------------------------------------------- truncate コードポイント境界（reduceGrep 経由）
test("truncate: astral 文字をサロゲート境界で割らない", () => {
  // 85 コードポイントの絵文字。GREP_MAX_LEN=80 → 77 個 + '...'（UTF-16 単位ではなくコードポイントで切る）
  const emoji = "🎉".repeat(85);
  const out = rtk.reduceGrep(`f:1:${emoji}`);
  const lines = out.split("\n");
  const matchLine = lines.find((l) => l.startsWith("f:1:"));
  assert.ok(matchLine, "grep 行がある");
  const content = matchLine.slice("f:1:".length);
  assert.equal([...content].length, 80, "コードポイント長は 80（77 emoji + '...'）");
  assert.equal(content, "🎉".repeat(77) + "...");
  assert.ok(!content.includes("�"), "置換文字(割れたサロゲート)が無い");
});

test("truncate: 上限以下はそのまま", () => {
  const out = rtk.reduceGrep("f:2:short");
  assert.ok(out.includes("f:2:short"));
});

// ---------------------------------------------------------------- stripShellFrame
test("stripShellFrame: echo 行と前後プロンプトを落とし本体だけ残す", () => {
  const text = "$ git status\n M src/core.ts\n?? new.txt\nuser@host:~/p$ ";
  assert.equal(rtk.stripShellFrame(text, "git status"), " M src/core.ts\n?? new.txt");
});
test("stripShellFrame: コマンド空なら末尾プロンプト除去のみ", () => {
  assert.equal(rtk.stripShellFrame("line1\nline2\n$ ", ""), "line1\nline2");
});

/**
 * rtk — RTK の出力削減を「自前実装」で移植した read 側リデューサ群（Node/TS 版）。
 *
 * 要件C: rtk のファイルは複製せず、アルゴリズムを参照に自分のコードとして書き起こす。
 * rtk バイナリが無い場所でも縮約が効くよう、観測済み出力に対して動く。
 * pytest / grep は人間向け標準出力を解析でき rtk のアルゴリズムに忠実
 * （pytest は rtk 0.42.0 の出力と厳密一致するよう移植）。
 *
 * 公開 API: reduce(command, output) -> [reducedText|null, reducerName|null] / classify / stripShellFrame
 */

// rtk 由来のキャップ（truncate.rs / config.rs の値。数値のみ参照、コードは自作）
const CAP_GREP_TOTAL = 200; // grep: 全体の最大マッチ行
const CAP_GREP_PER_FILE = 25; // grep: ファイルあたり最大
const GREP_MAX_LEN = 80; // grep: 1 行の最大幅
const COMPACT_PATH_THRESH = 50; // grep: パス短縮の閾値
const MAX_PYTEST_FAILURES = 10; // pytest: 失敗ブロック最大
const MAX_XFAIL = 10; // pytest: xfail/xpass 行 最大
const PYTEST_RELEVANT_PER_FAIL = 3;
const LOG_LIMIT_DEFAULT = 10; // git log: 既定コミット数
const LOG_BODY_LINES = 3;
const LOG_WIDTH = 80;

/** char(コードポイント)ベース切り詰め（rtk utils::truncate と同等）。 */
function truncate(s: string, n: number): string {
  const cp = Array.from(s);
  if (cp.length <= n) return s;
  if (n < 3) return "...";
  return cp.slice(0, n - 3).join("") + "...";
}

const PROMPT_TAIL = /[$#%>]\s*$/;

/** 観測ログ片からエコー行と前後のプロンプト行を落とし、コマンド出力本体だけ残す（発見的）。 */
export function stripShellFrame(text: string, command: string): string {
  const lines = text.split("\n");
  const cmd = command.trim();
  let start = 0;
  if (cmd) {
    for (let i = 0; i < lines.length; i++) if (lines[i].includes(cmd)) start = i + 1;
  }
  let end = lines.length;
  while (end > start) {
    const last = lines[end - 1];
    if (!last.trim() || (PROMPT_TAIL.test(last) && (!cmd || !last.includes(cmd)))) end--;
    else break;
  }
  return lines.slice(start, end).join("\n");
}

// ---------------------------------------------------------------- pytest

export function reducePytest(output: string): string {
  let summaryLine = "";
  const failures: string[] = [];
  const xfailLines: string[] = [];
  let state = "header";
  let current: string[] = [];
  const flush = () => {
    if (current.length) {
      failures.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of output.split("\n")) {
    const t = line.trim();
    if (t.startsWith("===") && t.includes("test session starts")) {
      state = "header";
      continue;
    }
    if (t.startsWith("===") && t.includes("FAILURES")) {
      state = "failures";
      continue;
    }
    if (t.startsWith("===") && t.includes("short test summary")) {
      state = "summary";
      flush();
      continue;
    }
    if (
      t.startsWith("===") &&
      (t.includes("passed") || t.includes("failed") || t.includes("skipped") || t.includes("error"))
    ) {
      // 収集エラーのみ（`=== 1 error in Xs ===`）も要約行として拾う。拾わないと全ゼロ扱いで
      // "No tests collected"（無害誤読）に潰れる。"ERRORS" セクション見出しは大文字ゆえ非該当。
      summaryLine = t;
      continue;
    }
    if (
      !summaryLine &&
      !t.startsWith("===") &&
      !t.startsWith("FAILED") &&
      !t.startsWith("ERROR") &&
      (t.includes(" passed") || t.includes(" failed") || t.includes(" skipped") || t.includes(" error")) &&
      t.includes(" in ")
    ) {
      summaryLine = t;
      continue;
    }
    if (state === "header") {
      if (t.startsWith("collected")) state = "progress";
    } else if (state === "progress") {
      // 進捗ドット行は捨てる
    } else if (state === "failures") {
      if (t.startsWith("___")) {
        flush();
        current.push(t);
      } else if (t && !t.startsWith("===")) {
        current.push(t);
      }
    } else if (state === "summary") {
      if (t.startsWith("FAILED") || t.startsWith("ERROR")) failures.push(t);
      else if (t.startsWith("XFAIL") || t.startsWith("XPASS")) xfailLines.push(t);
    }
  }
  flush();

  const [p, f, s, xf, xp, e] = parsePytestCounts(summaryLine);
  if (p === 0 && f === 0 && s === 0 && xf === 0 && xp === 0 && e === 0) return "Pytest: No tests collected";
  // error(収集/内部エラー)は失敗の一種＝緑扱いにしない。extras に含め、"N passed" 早期 return を止める。
  const extras = s > 0 || xf > 0 || xp > 0 || e > 0 || xfailLines.length > 0;
  if (f === 0 && p > 0 && !extras) return `Pytest: ${p} passed`;

  let head = `Pytest: ${p} passed, ${f} failed`;
  if (e > 0) head += `, ${e} error${e === 1 ? "" : "s"}`;
  if (s > 0) head += `, ${s} skipped`;
  if (xf > 0) head += `, ${xf} xfailed`;
  if (xp > 0) head += `, ${xp} xpassed`;
  const out: string[] = [head, "═".repeat(39)];

  if (xfailLines.length) {
    out.push("", "Expected-failure outcomes:");
    for (const ln of xfailLines.slice(0, MAX_XFAIL)) out.push("  " + truncate(ln, 120));
    if (xfailLines.length > MAX_XFAIL) out.push(`  … +${xfailLines.length - MAX_XFAIL} more`);
  }

  if (failures.length) {
    out.push("", "Failures:");
    const shown = failures.slice(0, MAX_PYTEST_FAILURES);
    for (let i = 0; i < shown.length; i++) {
      const lines = shown[i].split("\n");
      const first = lines[0];
      if (first.startsWith("___")) {
        const name = first.replace(/^_+|_+$/g, "").trim();
        out.push(`${i + 1}. [FAIL] ${name}`);
      } else if (first.startsWith("FAILED")) {
        const parts = first.split(" - ");
        const name = parts[0].slice("FAILED".length).trim();
        out.push(`${i + 1}. [FAIL] ${name}`);
        // 失敗理由は全文保持（可読性優先。rtk 0.42.0 は最初の " - " segment で切るが、本実装は情報を残す）。
        // 末尾セパレータは continue で入れない（rtk 0.42.0 と同じ）。
        if (parts.length > 1) out.push("     " + truncate(parts.slice(1).join(" - "), 100));
        continue;
      } else {
        out.push(`${i + 1}. [FAIL] ${first}`);
      }
      let rel = 0;
      for (const body of lines.slice(1)) {
        const bt = body.trim();
        const isRel =
          bt.startsWith(">") ||
          bt.startsWith("E") ||
          bt.toLowerCase().includes("assert") ||
          bt.toLowerCase().includes("error") ||
          body.includes(".py:");
        if (isRel) {
          out.push("     " + truncate(body, 100));
          rel++;
          if (rel >= PYTEST_RELEVANT_PER_FAIL) break;
        }
      }
      // rtk 0.42.0 互換: セパレータ判定は表示数(shown)でなく全失敗数(failures)基準（cap 超過時の空行数まで一致）。
      if (i < failures.length - 1) out.push("");
    }
    if (failures.length > MAX_PYTEST_FAILURES) out.push("", `… +${failures.length - MAX_PYTEST_FAILURES} more failures`);
  }
  return out.join("\n").trim();
}

function parsePytestCounts(summary: string): [number, number, number, number, number, number] {
  let p = 0,
    f = 0,
    s = 0,
    xf = 0,
    xp = 0,
    e = 0;
  for (const part of summary.split(",")) {
    const words = part.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      if (i === 0) continue;
      const n = parseInt(words[i - 1], 10);
      if (Number.isNaN(n)) continue;
      const w = words[i];
      // "error"/"errors" は passed/failed/skipped/xfailed/xpassed のいずれの部分文字列でもないので順不同で安全。
      if (w.includes("xpassed")) xp = n;
      else if (w.includes("xfailed")) xf = n;
      else if (w.includes("passed")) p = n;
      else if (w.includes("failed")) f = n;
      else if (w.includes("skipped")) s = n;
      else if (w.includes("error")) e = n;
    }
  }
  return [p, f, s, xf, xp, e];
}

// ---------------------------------------------------------------- grep

const GREP_LINE = /^(.*?):(\d+):(.*)$/;

function compactPath(p: string): string {
  if (p.length <= COMPACT_PATH_THRESH) return p;
  const parts = p.split("/");
  if (parts.length <= 3) return p;
  return `${parts[0]}/.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function reduceGrep(output: string): string | null {
  const byFile = new Map<string, [string, string][]>();
  const order: string[] = [];
  let total = 0;
  for (const line of output.split("\n")) {
    const m = GREP_LINE.exec(line);
    if (!m) continue;
    const fname = m[1],
      lineno = m[2],
      content = m[3];
    if (!fname || !/^\d+$/.test(lineno)) continue;
    total++;
    if (!byFile.has(fname)) {
      byFile.set(fname, []);
      order.push(fname);
    }
    byFile.get(fname)!.push([lineno, truncate(content.trim(), GREP_MAX_LEN)]);
  }
  if (total === 0) return null;
  const out: string[] = [`${total} matches in ${byFile.size} files:`, ""];
  let shown = 0;
  for (const fname of [...order].sort()) {
    if (shown >= CAP_GREP_TOTAL) break;
    const disp = compactPath(fname);
    for (const [lineno, content] of byFile.get(fname)!.slice(0, CAP_GREP_PER_FILE)) {
      if (shown >= CAP_GREP_TOTAL) break;
      out.push(`${disp}:${lineno}:${content}`);
      shown++;
    }
  }
  if (total > shown) out.push(`[+${total - shown} more]`);
  return out.join("\n");
}

// ---------------------------------------------------------------- git status / log

const GIT_HINT = /^\(use "git |^\(create\/copy files/;

export function reduceGitStatus(output: string): string | null {
  const lines = output.split("\n");
  const nonempty = lines.filter((ln) => ln.trim());
  if (!nonempty.length) return null;
  const porc = nonempty.filter((ln) => /^(##|[ MADRCU?!]{2}) /.test(ln));
  if (porc.length && porc.length >= nonempty.length - 1) {
    const out: string[] = [];
    for (let i = 0; i < nonempty.length; i++) {
      const ln = nonempty[i];
      if (i === 0 && ln.startsWith("## ")) out.push("* " + ln.slice(3));
      else out.push(ln);
    }
    return out.join("\n");
  }
  const kept: string[] = [];
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (GIT_HINT.test(t) || t.includes('(use "git add') || t.includes('(use "git restore')) continue;
    if (t.includes("nothing to commit") && t.includes("working tree clean")) {
      kept.push(t);
      break;
    }
    kept.push(ln);
  }
  return kept.length ? kept.join("\n") : "ok";
}

export function reduceGitLog(output: string): string | null {
  if (!output.includes("commit ")) return null;
  const blocks = output.split(/(?=^commit [0-9a-f]{7,40})/m).filter((b) => b.trim().startsWith("commit "));
  if (!blocks.length) return null;
  const out: string[] = [];
  for (const b of blocks.slice(0, LOG_LIMIT_DEFAULT)) {
    const bl = b.split("\n").map((x) => x.replace(/\s+$/, ""));
    let commit = "",
      author = "",
      subject = "";
    const body: string[] = [];
    for (const ln of bl) {
      const t = ln.trim();
      if (t.startsWith("commit ")) commit = t.split(/\s+/)[1].slice(0, 9);
      else if (t.startsWith("Author:")) author = t.slice("Author:".length).trim();
      else if (t.startsWith("Date:") || t.startsWith("Merge:")) continue;
      else if (t && !subject && (ln.startsWith("    ") || ln.startsWith("\t"))) subject = t;
      else if (t && (ln.startsWith("    ") || ln.startsWith("\t"))) {
        if (!t.startsWith("Signed-off-by:") && !t.startsWith("Co-authored-by:")) body.push(t);
      }
    }
    const am = /<([^>]+)>/.exec(author);
    const who = am ? am[1] : author;
    let head = truncate(`${commit} ${subject}`.trim(), LOG_WIDTH);
    if (who) head += `  <${who}>`;
    const entry = [head];
    for (const bln of body.slice(0, LOG_BODY_LINES)) entry.push("  " + truncate(bln, LOG_WIDTH));
    if (body.length > LOG_BODY_LINES) entry.push(`  [+${body.length - LOG_BODY_LINES} lines omitted]`);
    out.push(entry.join("\n"));
  }
  return out.join("\n").trim();
}

// ---------------------------------------------------------------- 汎用ライン整形 engine（自作フィルタ）

interface FilterRule {
  name: string;
  match: RegExp;
  strip?: RegExp[];
  keep?: RegExp[];
  maxLines?: number;
  onEmpty?: string;
}

const FILTERS: FilterRule[] = [
  { name: "df", match: /^df\b/, strip: [/^$/], maxLines: 40, onEmpty: "df: ok" },
  { name: "free", match: /^free\b/, strip: [/^$/], maxLines: 20, onEmpty: "free: ok" },
  { name: "make", match: /^make\b/, strip: [/^make\[\d+\]:/, /^$/, /^Nothing to be done/], maxLines: 50, onEmpty: "make: ok" },
  { name: "systemctl", match: /^systemctl\s+status\b/, strip: [/^\s*$/], maxLines: 30, onEmpty: "systemctl: ok" },
];

function applyFilter(rule: FilterRule, output: string): string {
  const lines = output.split("\n");
  const kept: string[] = [];
  for (const ln of lines) {
    if (rule.strip && rule.strip.some((r) => r.test(ln))) continue;
    if (rule.keep && rule.keep.length && !rule.keep.some((r) => r.test(ln))) continue;
    kept.push(ln);
  }
  let result = kept;
  if (rule.maxLines && kept.length > rule.maxLines) {
    const omitted = kept.length - rule.maxLines;
    result = [...kept.slice(0, rule.maxLines), `... (${omitted} lines truncated)`];
  }
  const body = result.join("\n").trim();
  if (!body && rule.onEmpty) return rule.onEmpty;
  return body;
}

// ---------------------------------------------------------------- ルーティング

function basenameCmd(command: string): [string, string] {
  const toks = command.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < toks.length && (toks[i].includes("=") || ["sudo", "env", "command", "exec"].includes(toks[i]))) i++;
  if (i >= toks.length) return ["", ""];
  const verb = toks[i].split("/").pop()!;
  let sub = "";
  for (const t of toks.slice(i + 1)) {
    if (!t.startsWith("-")) {
      sub = t;
      break;
    }
  }
  return [verb, sub];
}

export function classify(command: string): string | null {
  const [verb, sub] = basenameCmd(command);
  if (verb === "git") {
    if (sub === "status") return "git-status";
    if (sub === "log") return "git-log";
    return null;
  }
  if (verb === "grep" || verb === "rg") return "grep";
  if (verb === "pytest" || verb === "py.test") return "pytest";
  if (verb === "python" && command.includes("pytest")) return "pytest";
  for (const rule of FILTERS) if (rule.match.test(command.trim())) return rule.name;
  return null;
}

const REDUCERS: Record<string, (o: string) => string | null> = {
  "git-status": reduceGitStatus,
  "git-log": reduceGitLog,
  grep: reduceGrep,
  pytest: (o) => reducePytest(o),
};

/** コマンドに応じた reducer を観測出力へ適用。返り値 [reducedText|null, reducerName|null]。 */
export function reduce(command: string, output: string): [string | null, string | null] {
  const name = classify(command);
  if (name === null) return [null, null];
  if (name in REDUCERS) {
    const red = REDUCERS[name](output);
    return red !== null ? [red, name] : [null, null];
  }
  for (const rule of FILTERS) if (rule.name === name) return [applyFilter(rule, output), name];
  return [null, null];
}

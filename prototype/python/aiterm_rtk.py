#!/usr/bin/env python3
"""aiterm_rtk — RTK の出力削減を「自前実装」で移植した read 側リデューサ群。

要件C（2026-06-01 確定）: rtk のファイルは複製せず、アルゴリズムを参照に**自分のコードとして**
書き起こす。rtk バイナリが無い場所（リモート等）でも縮約が効くよう、観測済み出力に対して動く。

設計上の前提（重要）:
- rtk 本体は git/ls を `--porcelain`/`ls -la` で**再実行**して整形するが、read 側は端末に出た
  **観測済み出力**しか持たず再実行できない。よってここは観測テキストを入力に取り、rtk と同じ
  「再グルーピング・キャップ・ノイズ除去・要約」の**意図**を観測出力向けに適用する。
- pytest / grep は人間向け標準出力をそのまま解析できるので rtk のアルゴリズムに忠実。
- git/ls の「再実行前提」部分はローカルでは委譲（send rtk=True → `rtk ...`）が忠実にカバーする。

公開 API:
    reduce(command, output) -> (reduced_text, reducer_name|None)
    classify(command) -> reducer_name|None
"""
import re

# rtk 由来のキャップ（truncate.rs / config.rs の値。数値のみ参照、コードは自作）
CAP_GREP_TOTAL = 200       # grep: 全体の最大マッチ行
CAP_GREP_PER_FILE = 25     # grep: ファイルあたり最大
GREP_MAX_LEN = 80          # grep: 1 行の最大幅
COMPACT_PATH_THRESH = 50   # grep: パス短縮の閾値
MAX_PYTEST_FAILURES = 10   # pytest: 失敗ブロック最大
MAX_XFAIL = 10             # pytest: xfail/xpass 行 最大
PYTEST_RELEVANT_PER_FAIL = 3
PYTEST_RULE = "═" * 39
LOG_LIMIT_DEFAULT = 10     # git log: 既定コミット数
LOG_BODY_LINES = 3
LOG_WIDTH = 80


def _truncate(s, n):
    """char ベース切り詰め（rtk utils::truncate と同等）: n 超なら先頭 n-3 + '...'。"""
    if len(s) <= n:
        return s
    if n < 3:
        return "..."
    return s[:n - 3] + "..."


_PROMPT_TAIL = re.compile(r"[\$#%>]\s*$")


def strip_shell_frame(text, command):
    """観測ログ片から、エコーされたコマンド行と前後のプロンプト行を落として、
    コマンド出力の本体だけを残す（read 側 reducer 用の前処理・発見的）。
    コマンド文字列を含む最後の行（＝プロンプト再描画行）の次から出力が始まるとみなす。"""
    lines = text.split("\n")
    cmd = command.strip()
    start = 0
    if cmd:
        for i, ln in enumerate(lines):
            if cmd in ln:
                start = i + 1
    end = len(lines)
    while end > start:
        last = lines[end - 1]
        if not last.strip() or (_PROMPT_TAIL.search(last) and (not cmd or cmd not in last)):
            end -= 1
        else:
            break
    return "\n".join(lines[start:end])


# ---------------------------------------------------------------- pytest

_PY_RE_SESSION = "test session starts"


def reduce_pytest(output):
    """pytest stdout を「件数サマリ + 失敗 + xfail/xpass のみ」へ畳む。
    rtk filter_pytest_output + build_pytest_summary を観測 stdout 向けに移植。"""
    summary_line = ""
    failures = []
    xfail_lines = []
    state = "header"
    current = []

    def flush():
        if current:
            failures.append("\n".join(current))
            current.clear()

    for line in output.split("\n"):
        t = line.strip()
        # 状態遷移（順序厳守）
        if t.startswith("===") and _PY_RE_SESSION in t:
            state = "header"; continue
        if t.startswith("===") and "FAILURES" in t:
            state = "failures"; continue
        if t.startswith("===") and "short test summary" in t:
            state = "summary"; flush(); continue
        if t.startswith("===") and ("passed" in t or "failed" in t or "skipped" in t):
            summary_line = t; continue
        if (not summary_line and not t.startswith("===") and not t.startswith("FAILED")
                and not t.startswith("ERROR")
                and (" passed" in t or " failed" in t or " skipped" in t) and " in " in t):
            summary_line = t; continue
        # 状態ごと処理
        if state == "header":
            if t.startswith("collected"):
                state = "progress"
        elif state == "progress":
            pass  # 進捗ドット行は捨てる
        elif state == "failures":
            if t.startswith("___"):
                flush(); current.append(t)
            elif t and not t.startswith("==="):
                current.append(t)
        elif state == "summary":
            if t.startswith("FAILED") or t.startswith("ERROR"):
                failures.append(t)
            elif t.startswith("XFAIL") or t.startswith("XPASS"):
                xfail_lines.append(t)
    flush()

    counts = _parse_pytest_counts(summary_line)
    p, f, s, xf, xp = counts
    if p == f == s == xf == xp == 0:
        return "Pytest: No tests collected"
    extras = s > 0 or xf > 0 or xp > 0 or bool(xfail_lines)
    if f == 0 and p > 0 and not extras:
        return f"Pytest: {p} passed"

    head = f"Pytest: {p} passed, {f} failed"
    if s > 0:
        head += f", {s} skipped"
    if xf > 0:
        head += f", {xf} xfailed"
    if xp > 0:
        head += f", {xp} xpassed"
    out = [head, PYTEST_RULE]

    if xfail_lines:
        out.append("")
        out.append("Expected-failure outcomes:")
        for ln in xfail_lines[:MAX_XFAIL]:
            out.append("  " + _truncate(ln, 120))
        if len(xfail_lines) > MAX_XFAIL:
            out.append(f"  … +{len(xfail_lines) - MAX_XFAIL} more")

    if failures:
        out.append("")
        out.append("Failures:")
        shown = failures[:MAX_PYTEST_FAILURES]
        for i, fail in enumerate(shown):
            lines = fail.split("\n")
            first = lines[0]
            if first.startswith("___"):
                name = first.strip("_").strip()
                out.append(f"{i + 1}. [FAIL] {name}")
            elif first.startswith("FAILED"):
                parts = first.split(" - ")
                name = parts[0][len("FAILED"):].strip()
                out.append(f"{i + 1}. [FAIL] {name}")
                # rtk 0.42.0 互換: reason は最初の " - " セグメント(parts[1])のみ。continue で末尾セパレータも入れない。
                if len(parts) > 1:
                    out.append("     " + _truncate(parts[1], 100))
                continue
            else:
                out.append(f"{i + 1}. [FAIL] {first}")
            rel = 0
            for body in lines[1:]:
                bt = body.strip()
                is_rel = (bt.startswith(">") or bt.startswith("E")
                          or "assert" in bt.lower() or "error" in bt.lower()
                          or ".py:" in body)
                if is_rel:
                    out.append("     " + _truncate(body, 100))
                    rel += 1
                    if rel >= PYTEST_RELEVANT_PER_FAIL:
                        break
            # rtk 0.42.0 互換: セパレータ判定は表示数(shown)でなく全失敗数(failures)基準（cap 超過時の空行数まで一致）。
            if i < len(failures) - 1:
                out.append("")
        if len(failures) > MAX_PYTEST_FAILURES:
            out.append("")
            out.append(f"… +{len(failures) - MAX_PYTEST_FAILURES} more failures")
    return "\n".join(out).strip()


def _parse_pytest_counts(summary):
    """'2 failed, 2 passed, 1 skipped, 1 xfailed, 1 xpassed in 0.01s' → (p,f,s,xf,xp)。
    xpassed/xfailed を passed/failed より先に判定（部分文字列衝突回避）。"""
    p = f = s = xf = xp = 0
    for part in summary.split(","):
        words = part.split()
        for i, w in enumerate(words):
            if i == 0:
                continue
            try:
                n = int(words[i - 1])
            except ValueError:
                continue
            if "xpassed" in w:
                xp = n
            elif "xfailed" in w:
                xf = n
            elif "passed" in w:
                p = n
            elif "failed" in w:
                f = n
            elif "skipped" in w:
                s = n
    return p, f, s, xf, xp


# ---------------------------------------------------------------- grep

_GREP_LINE = re.compile(r"^(.*?):(\d+):(.*)$")


def _compact_path(path):
    if len(path) <= COMPACT_PATH_THRESH:
        return path
    parts = path.split("/")
    if len(parts) <= 3:
        return path
    return f"{parts[0]}/.../{parts[-2]}/{parts[-1]}"


def reduce_grep(output):
    """`grep -n`/`grep -rn` の観測出力（file:line:content）をファイル別に再グルーピングし、
    全体 200 / ファイル 25 / 行幅 80 でキャップ。rtk grep の意図を colon 形式向けに移植。"""
    by_file = {}
    order = []
    total = 0
    for line in output.split("\n"):
        m = _GREP_LINE.match(line)
        if not m:
            continue
        fname, lineno, content = m.group(1), m.group(2), m.group(3)
        if not fname or not lineno.isdigit():
            continue
        total += 1
        if fname not in by_file:
            by_file[fname] = []
            order.append(fname)
        by_file[fname].append((lineno, _truncate(content.strip(), GREP_MAX_LEN)))
    if total == 0:
        return None  # grep 出力でない → 呼び出し側で汎用削減へ
    out = [f"{total} matches in {len(by_file)} files:", ""]
    shown = 0
    for fname in sorted(order):
        if shown >= CAP_GREP_TOTAL:
            break
        disp = _compact_path(fname)
        for lineno, content in by_file[fname][:CAP_GREP_PER_FILE]:
            if shown >= CAP_GREP_TOTAL:
                break
            out.append(f"{disp}:{lineno}:{content}")
            shown += 1
    if total > shown:
        out.append(f"[+{total - shown} more]")
    return "\n".join(out)


# ---------------------------------------------------------------- git status / log

_GIT_HINT = re.compile(r'^\(use "git |^\(create/copy files')


def reduce_git_status(output):
    """観測 `git status`。porcelain(-s) 形式ならコンパクト整形、人間形式ならヒント行除去。"""
    lines = output.split("\n")
    nonempty = [ln for ln in lines if ln.strip()]
    if not nonempty:
        return None
    # porcelain 形式判定: 先頭が '## ' か、XY ステータス行が主
    porc = [ln for ln in nonempty if re.match(r"^(##|[ MADRCU?!]{2}) ", ln)]
    if porc and len(porc) >= len(nonempty) - 1:
        out = []
        for i, ln in enumerate(nonempty):
            if i == 0 and ln.startswith("## "):
                out.append("* " + ln[3:])
            else:
                out.append(ln)
        return "\n".join(out)
    # 人間形式: ヒント行 / 空行を落とす
    kept = []
    for ln in lines:
        t = ln.strip()
        if not t:
            continue
        if _GIT_HINT.match(t) or '(use "git add' in t or '(use "git restore' in t:
            continue
        if "nothing to commit" in t and "working tree clean" in t:
            kept.append(t)
            break
        kept.append(ln)
    return "\n".join(kept) if kept else "ok"


def reduce_git_log(output):
    """観測 `git log`（人間既定形式）を最大10コミットへ。各コミットの本文は3行＋幅80で切り詰め。
    rtk は独自フォーマットで再実行するが、ここは観測形式（commit/Author/Date/本文）を畳む。"""
    if "commit " not in output:
        return None
    blocks = re.split(r"(?=^commit [0-9a-f]{7,40})", output, flags=re.MULTILINE)
    blocks = [b for b in blocks if b.strip().startswith("commit ")]
    if not blocks:
        return None
    out = []
    for b in blocks[:LOG_LIMIT_DEFAULT]:
        bl = [x.rstrip() for x in b.split("\n")]
        commit = ""
        author = ""
        subject = ""
        body = []
        for ln in bl:
            t = ln.strip()
            if t.startswith("commit "):
                commit = t.split()[1][:9]
            elif t.startswith("Author:"):
                author = t[len("Author:"):].strip()
            elif t.startswith("Date:") or t.startswith("Merge:"):
                continue
            elif t and not subject and (ln.startswith("    ") or ln.startswith("\t")):
                subject = t
            elif t and ln.startswith(("    ", "\t")):
                if not t.startswith("Signed-off-by:") and not t.startswith("Co-authored-by:"):
                    body.append(t)
        am = re.search(r"<([^>]+)>", author)
        who = am.group(1) if am else author
        head = _truncate(f"{commit} {subject}".strip(), LOG_WIDTH)
        if who:
            head += f"  <{who}>"
        entry = [head]
        for bln in body[:LOG_BODY_LINES]:
            entry.append("  " + _truncate(bln, LOG_WIDTH))
        if len(body) > LOG_BODY_LINES:
            entry.append(f"  [+{len(body) - LOG_BODY_LINES} lines omitted]")
        out.append("\n".join(entry))
    return "\n".join(out).strip()


# ---------------------------------------------------------------- 汎用ライン整形 engine（自作フィルタ）

# rtk の 8 段 TOML を複製せず、同等の意図を持つ最小エンジン。規則は自分で記述。
# 各規則: {match: 正規表現(コマンド全体), strip: [行正規表現], keep: [行正規表現],
#          max_lines: int, on_empty: str}
FILTERS = [
    {"name": "df", "match": r"^df\b",
     "strip": [r"^$"], "max_lines": 40, "on_empty": "df: ok"},
    {"name": "free", "match": r"^free\b",
     "strip": [r"^$"], "max_lines": 20, "on_empty": "free: ok"},
    {"name": "make", "match": r"^make\b",
     "strip": [r"^make\[\d+\]:", r"^$", r"^Nothing to be done"],
     "max_lines": 50, "on_empty": "make: ok"},
    {"name": "systemctl", "match": r"^systemctl\s+status\b",
     "strip": [r"^\s*$"], "max_lines": 30, "on_empty": "systemctl: ok"},
]


def _apply_filter(rule, output):
    lines = output.split("\n")
    strip_res = [re.compile(p) for p in rule.get("strip", [])]
    keep_res = [re.compile(p) for p in rule.get("keep", [])]
    kept = []
    for ln in lines:
        if strip_res and any(r.search(ln) for r in strip_res):
            continue
        if keep_res and not any(r.search(ln) for r in keep_res):
            continue
        kept.append(ln)
    ml = rule.get("max_lines")
    if ml and len(kept) > ml:
        omitted = len(kept) - ml
        kept = kept[:ml] + [f"... ({omitted} lines truncated)"]
    body = "\n".join(kept).strip()
    if not body and rule.get("on_empty"):
        return rule["on_empty"]
    return body


# ---------------------------------------------------------------- ルーティング

def _basename_cmd(command):
    """コマンド文字列の先頭トークン（env 接頭辞・パスを除去）→ (verb, subcmd)。"""
    toks = command.strip().split()
    i = 0
    while i < len(toks) and ("=" in toks[i] or toks[i] in ("sudo", "env", "command", "exec")):
        i += 1
    if i >= len(toks):
        return "", ""
    verb = toks[i].rsplit("/", 1)[-1]
    sub = ""
    for t in toks[i + 1:]:
        if not t.startswith("-"):
            sub = t
            break
    return verb, sub


def classify(command):
    """コマンド → reducer 名（無ければ None）。"""
    verb, sub = _basename_cmd(command)
    if verb == "git":
        if sub == "status":
            return "git-status"
        if sub == "log":
            return "git-log"
        return None
    if verb == "grep" or verb == "rg":
        return "grep"
    if verb in ("pytest", "py.test"):
        return "pytest"
    if verb == "python" and "pytest" in command:
        return "pytest"
    for rule in FILTERS:
        if re.search(rule["match"], command.strip()):
            return rule["name"]
    return None


_REDUCERS = {
    "git-status": reduce_git_status,
    "git-log": reduce_git_log,
    "grep": reduce_grep,
    "pytest": reduce_pytest,
}


def reduce(command, output):
    """コマンドに応じた reducer を観測出力へ適用。返り値 (reduced_text|None, reducer_name|None)。
    None なら呼び出し側は従来の汎用削減にフォールバックする。"""
    name = classify(command)
    if name is None:
        return None, None
    if name in _REDUCERS:
        red = _REDUCERS[name](output)
        return (red, name) if red is not None else (None, None)
    for rule in FILTERS:
        if rule["name"] == name:
            return _apply_filter(rule, output), name
    return None, None

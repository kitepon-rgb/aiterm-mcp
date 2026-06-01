#!/usr/bin/env python3
"""aiterm_core — CLI と MCP サーバが共有する純粋ロジック層。

`src/aiterm.py`（CLI）と `src/aiterm_mcp.py`（stdio MCP サーバ）の両方が import する。
**この層は stdout に一切 print しない**（stdio MCP は stdout が JSON-RPC 専用のため）。
各操作は結果文字列を return し、失敗は AitermError を raise する。診断は呼び出し側の責務。

由来は src/aiterm.py（tmux バックエンド・出力削減・完了検出4層・破壊ゲート）。挙動は不変。
設計: docs/ai-terminal-design-plan.md / docs/mcp-server-plan.md、出力削減は rag/ の RTK を移植。
"""
import math
import os
import re
import shutil
import subprocess
import time

import aiterm_rtk

SOCKDIR = os.path.join(os.environ.get("TMPDIR", "/tmp"), "claude-tmux-sockets")
SOCK = os.path.join(SOCKDIR, "claude.sock")

# 完了検出
DEFAULT_TIMEOUT = 10.0
POLL = 0.25
STABLE_POLLS = 2          # 連続でログサイズ不変ならば静止とみなす回数
SHELLS = {"bash", "sh", "zsh", "fish", "dash"}

# 出力削減（RTK の CAP 思想を移植）
MAX_LINES_BEFORE_ELIDE = 60
HEAD_LINES = 30
TAIL_LINES = 20
DEDUP_MIN_RUN = 3         # 同一行がこれ以上連続したら 1 行＋件数に畳む

# 安全: send 前に弾く破壊的コマンド（外部システム境界の防御。EXPECTED-FAILURE: ユーザー依頼の防御コード）
DESTRUCTIVE = [
    r"\brm\s+-[rfRF]*[rf][rfRF]*\s+(/|~|\$HOME|/\*|\.\s*$|\*\s*$)",
    r"\bmkfs(\.\w+)?\b",
    r"\bdd\b[^\n]*\bof=/dev/",
    r">\s*/dev/(sd|nvme|hd|mmcblk)",
    r"\bDROP\s+(TABLE|DATABASE|SCHEMA)\b",
    r"\bTRUNCATE\s+TABLE\b",
    r"(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba)?sh\b",
    r":\(\)\s*\{\s*:\|:&\s*\};:",            # fork bomb
    r"\bchmod\s+-R\s+0*0\s+/",
    r"\bgit\s+reset\s+--hard\b",
]
# CSI/OSC/ESC エスケープ・制御文字
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")     # \t(09) \n(0a) は残す
PASTE_MARKERS_RE = re.compile(r"\x1b\[20[01]~")

# よく使う制御キーの別名（tmux のキー名へ）
KEYMAP = {"ctrl-c": "C-c", "c-c": "C-c", "ctrl-d": "C-d", "c-d": "C-d",
          "ctrl-z": "C-z", "c-z": "C-z", "ctrl-l": "C-l", "ctrl-r": "C-r",
          "enter": "Enter", "tab": "Tab", "esc": "Escape", "escape": "Escape",
          "up": "Up", "down": "Down", "left": "Left", "right": "Right",
          "space": "Space", "bspace": "BSpace", "backspace": "BSpace"}


class AitermError(Exception):
    """操作失敗。code は CLI の終了コード／MCP のエラー識別に使う。"""

    def __init__(self, message, code=1):
        super().__init__(message)
        self.code = code


def tmux(*args):
    return subprocess.run(["tmux", "-S", SOCK, *args],
                          capture_output=True, text=True)


def session_exists(name):
    return tmux("has-session", "-t", name).returncode == 0


def pane_current_command(name):
    r = tmux("display-message", "-p", "-t", name, "#{pane_current_command}")
    return r.stdout.strip() if r.returncode == 0 else ""


def logpath(name):
    return os.path.join(SOCKDIR, name + ".log")


def offsetpath(name):
    return os.path.join(SOCKDIR, name + ".offset")


def lastcmdpath(name):
    return os.path.join(SOCKDIR, name + ".lastcmd")


def write_lastcmd(name, cmd):
    try:
        with open(lastcmdpath(name), "w") as f:
            f.write(cmd)
    except OSError:
        pass


def read_lastcmd(name):
    try:
        return open(lastcmdpath(name)).read()
    except OSError:
        return ""


def read_offset(name):
    try:
        return int(open(offsetpath(name)).read().strip())
    except (OSError, ValueError):
        return 0


def write_offset(name, off):
    with open(offsetpath(name), "w") as f:
        f.write(str(off))


def attach_hint(name):
    return (f"このセッションを自分の目で見る/介入する:\n"
            f"  tmux -S {SOCK} attach -t {name}\n"
            f"  （抜けるには Ctrl-b d）")


# ---------------------------------------------------------------- 出力削減

def estimate_tokens(s):
    return math.ceil(len(s) / 4.0)


def strip_control(text):
    """ANSI/OSC エスケープ・制御文字を除去し、\\r 上書きは最終状態に畳む。"""
    text = text.replace("\r\n", "\n")            # CRLF 正規化（行末\rを上書きと誤認しない）
    out_lines = []
    for line in text.split("\n"):
        if "\r" in line:
            line = line.split("\r")[-1]          # 行中の\rは進捗上書き＝最終状態だけ残す
        line = ANSI_RE.sub("", line)
        line = CTRL_RE.sub("", line)
        out_lines.append(line.rstrip())
    return "\n".join(out_lines)


def collapse_blanks(lines):
    out, blanks = [], 0
    for ln in lines:
        if ln == "":
            blanks += 1
            if blanks <= 1:
                out.append(ln)
        else:
            blanks = 0
            out.append(ln)
    while out and out[0] == "":
        out.pop(0)
    while out and out[-1] == "":
        out.pop()
    return out


def dedup_runs(lines):
    out, i, n = [], 0, len(lines)
    while i < n:
        j = i
        while j < n and lines[j] == lines[i]:
            j += 1
        run = j - i
        if run >= DEDUP_MIN_RUN and lines[i] != "":
            out.append(f"{lines[i]}  〈×{run}〉")
        else:
            out.extend(lines[i:j])
        i = j
    return out


def reduce_output(raw, name, elide=True):
    """RTK 4戦略を移植: 制御除去 / 空白正規化 / 連続重複圧縮 / head+tail 折りたたみ。
    返り値: (整形済みテキスト, メタ文字列)。切り詰め時は復元ヒントを含める。"""
    raw_lines_n = raw.count("\n") + (1 if raw and not raw.endswith("\n") else 0)
    cleaned = strip_control(raw)
    lines = collapse_blanks(cleaned.split("\n"))
    lines = dedup_runs(lines)
    elided = 0
    if elide and len(lines) > MAX_LINES_BEFORE_ELIDE:
        elided = len(lines) - HEAD_LINES - TAIL_LINES
        hint = (f"… 〈{elided} 行省略。全文は "
                f"`aiterm read {name} --full`、範囲は `--range A:B`〉 …")
        lines = lines[:HEAD_LINES] + [hint] + lines[-TAIL_LINES:]
    body = "\n".join(lines)
    meta = (f"[aiterm {name}: {len(lines)} 行 / ~{estimate_tokens(body)} tok "
            f"(raw {raw_lines_n} 行 / ~{estimate_tokens(raw)} tok)"
            + (f"; {elided} 行 hidden]" if elided else "]"))
    return body, meta


# ---------------------------------------------------------------- tmux 補助

def _auto_name():
    r = tmux("list-sessions", "-F", "#{session_name}")
    existing = set(r.stdout.split()) if r.returncode == 0 else set()
    i = 1
    while f"t{i}" in existing:
        i += 1
    return f"t{i}"


def _capture_screen(name, lines):
    args = ["capture-pane", "-p", "-J", "-t", name]
    if lines:
        args += ["-S", f"-{lines}"]
    r = tmux(*args)
    return r.stdout if r.returncode == 0 else ""


def _wait_completion(name, until_re, timeout):
    """完了境界の4層: dead / until 一致 / (出力静止 ∧ シェルに戻った) / timeout。"""
    deadline = time.monotonic() + timeout
    start = read_offset(name)
    last_size = None
    stable = 0
    until = re.compile(until_re) if until_re else None
    while True:
        alive = session_exists(name)
        size = os.path.getsize(logpath(name)) if os.path.exists(logpath(name)) else 0
        if until and size > start:
            with open(logpath(name), "rb") as f:
                f.seek(start)
                new = f.read().decode("utf-8", "replace")
            if until.search(strip_control(new)):
                return True, "until"
        if not alive:
            return True, "dead"
        if size == last_size:
            stable += 1
            if stable >= STABLE_POLLS and pane_current_command(name) in SHELLS:
                return True, "quiescent"
        else:
            stable = 0
        last_size = size
        if time.monotonic() >= deadline:
            return False, "timeout"
        time.sleep(POLL)


def rtk_rewrite(text):
    """委譲（要件C・併設）: `rtk rewrite "<cmd>"` で既知コマンドを rtk 形へ書き換える。
    exit 0/3 → 書換後文字列、1/2 → 元文字列。rtk 不在・失敗・複数行は素通し（フォールバック）。"""
    if "\n" in text.strip():
        return text
    rtk = shutil.which("rtk")
    if not rtk:
        return text
    try:
        p = subprocess.run([rtk, "rewrite", text],
                           capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return text
    if p.returncode in (0, 3) and p.stdout.strip():
        return p.stdout.rstrip("\n")
    return text


# ---------------------------------------------------------------- 操作（return で返す）

def open_session(name=None, shell="bash"):
    """専用 tmux セッションを新規に握る。返り値 (session_id, attach_hint)。"""
    os.makedirs(SOCKDIR, exist_ok=True)
    name = name or _auto_name()
    if session_exists(name):
        raise AitermError(f"session '{name}' は既に存在します（list で確認）", 2)
    r = tmux("new-session", "-d", "-s", name, "-f", "/dev/null", shell)
    if r.returncode != 0:
        raise AitermError("tmux new-session 失敗: " + r.stderr.strip(), 2)
    open(logpath(name), "a").close()
    tmux("pipe-pane", "-t", name, "-o", f"cat >> {logpath(name)}")
    write_offset(name, 0)
    return name, attach_hint(name)


def send(name, text, enter=True, mark=False, force=False, rtk=False, raw=False):
    """テキスト（コマンド）を送る。rtk=True で既知コマンドを rtk 形へ委譲。"""
    if not session_exists(name):
        raise AitermError(f"session '{name}' が無い（open してください）", 2)
    if not raw:
        text = PASTE_MARKERS_RE.sub("", text)
        text = ANSI_RE.sub("", text)
        text = CTRL_RE.sub("", text)
    if not force:
        for pat in DESTRUCTIVE:
            if re.search(pat, text, re.IGNORECASE):
                raise AitermError(
                    f"破壊的の可能性があるコマンドを遮断しました: /{pat}/\n"
                    f"  本当に実行するなら force を有効にして再実行してください。", 3)
    write_lastcmd(name, text)            # read --rtk の reducer 分類用（書換/mark 前の素のコマンド）
    if rtk:
        text = rtk_rewrite(text)
    if mark:
        text = text + "; printf '\\n<<<AITERM_DONE rc=%d>>>\\n' \"$?\""
    tmux("send-keys", "-t", name, "-l", "--", text)
    if enter:
        tmux("send-keys", "-t", name, "Enter")
    return f"sent {len(text)} chars to {name}" + (" (+Enter)" if enter else "")


def send_key(name, key):
    """制御キーを送る (C-c, Enter, Up...)。"""
    if not session_exists(name):
        raise AitermError(f"session '{name}' が無い", 2)
    key = KEYMAP.get(key.lower(), key)
    tmux("send-keys", "-t", name, key)
    return f"sent key {key} to {name}"


def read_output(name, wait=False, until=None, timeout=DEFAULT_TIMEOUT,
                screen=False, full=False, lines=None, range_=None, raw=False, rtk=False):
    """出力を削減して取得。返り値は表示用文字列（raw=True なら生テキスト）。"""
    if not session_exists(name) and not os.path.exists(logpath(name)):
        raise AitermError(f"session '{name}' が無い", 2)

    if screen:                                   # TUI 向け: 描画済みスクリーン
        raw_txt = _capture_screen(name, lines or 0)
        if raw:
            return raw_txt
        body, meta = reduce_output(raw_txt, name, elide=True)
        return body + "\n" + meta

    status = None
    if wait:
        _, status = _wait_completion(name, until, timeout)

    try:
        data = open(logpath(name), "rb").read()
    except OSError:
        data = b""
    if full or range_:
        text = data.decode("utf-8", "replace")
        if range_:
            lo, hi = range_
            text = "\n".join(text.split("\n")[lo:hi])
    else:
        off = read_offset(name)
        text = data[off:].decode("utf-8", "replace")
        if lines:
            text = "\n".join(text.split("\n")[-lines:])

    if not range_:
        write_offset(name, len(data))             # 既定/--full は offset を末尾へ

    if raw:
        return text if text.endswith("\n") else text + "\n"

    if rtk:                                   # コマンド別 reducer（自前移植）を観測出力へ適用
        cmd = read_lastcmd(name)
        if cmd.strip():
            framed = aiterm_rtk.strip_shell_frame(strip_control(text), cmd)
            reduced, rname = aiterm_rtk.reduce(cmd, framed)
            if reduced is not None:
                meta = (f"[aiterm {name}: rtk:{rname} 適用 / "
                        f"~{estimate_tokens(reduced)} tok (raw ~{estimate_tokens(text)} tok)]")
                if status:
                    complete = status != "timeout"
                    return reduced + "\n" + meta + f" [is_complete={complete} via {status}]"
                return reduced + "\n" + meta
        # reducer 非該当 → 汎用削減へフォールバック

    body, meta = reduce_output(text, name, elide=not range_)
    if status:
        complete = status != "timeout"
        return body + "\n" + f"{meta} [is_complete={complete} via {status}]"
    return body + "\n" + meta


def list_sessions():
    """セッション一覧（name / current command / attached / サイズ）。"""
    r = tmux("list-sessions", "-F",
             "#{session_name}\t#{pane_current_command}\t"
             "#{?session_attached,attached,detached}\t#{window_width}x#{window_height}")
    if r.returncode == 0 and r.stdout.strip():
        return r.stdout.rstrip()
    return "(セッション無し)"


def close_session(name):
    """セッションを閉じ、ログ／offset を削除。"""
    tmux("kill-session", "-t", name)
    for p in (logpath(name), offsetpath(name)):
        try:
            os.remove(p)
        except OSError:
            pass
    return f"closed {name}"


def kill_all():
    """socket 上の全セッションを削除。"""
    tmux("kill-server")
    return "killed all sessions on this socket"

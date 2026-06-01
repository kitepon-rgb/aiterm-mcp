/**
 * core — CLI/MCP が共有する純粋ロジック層（Node/TS 版）。
 *
 * 1個のローカル専用 tmux セッションを握り、send でキーストロークを流し、read で画面/出力を
 * トークン削減して受け取る。SSH/docker は専用機能にせず send(id, "ssh host") で中に入る（ネスト）。
 * セッションは tmux サーバ常駐ゆえ、本プロセスが毎回終了しても次回 read で再接続できる。
 *
 * 設計: docs/ai-terminal-design-plan.md / docs/mcp-server-plan.md。出力削減は rag/ の RTK を移植。
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as rtk from "./rtk.js";

const SOCKDIR = path.join(process.env.TMPDIR ?? "/tmp", "claude-tmux-sockets");
const SOCK = path.join(SOCKDIR, "claude.sock");

// 完了検出
export const DEFAULT_TIMEOUT = 10.0;
const POLL = 0.25;
const STABLE_POLLS = 2; // 連続でログサイズ不変ならば静止とみなす回数
const SHELLS = new Set(["bash", "sh", "zsh", "fish", "dash"]);

// 出力削減（RTK の CAP 思想を移植）
const MAX_LINES_BEFORE_ELIDE = 60;
const HEAD_LINES = 30;
const TAIL_LINES = 20;
const DEDUP_MIN_RUN = 3; // 同一行がこれ以上連続したら 1 行＋件数に畳む

// 安全: send 前に弾く破壊的コマンド（外部システム境界の防御）
const DESTRUCTIVE: RegExp[] = [
  /\brm\s+-[rfRF]*[rf][rfRF]*\s+(\/|~|\$HOME|\/\*|\.\s*$|\*\s*$)/i,
  /\bmkfs(\.\w+)?\b/i,
  /\bdd\b[^\n]*\bof=\/dev\//i,
  />\s*\/dev\/(sd|nvme|hd|mmcblk)/i,
  /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba)?sh\b/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/i, // fork bomb
  /\bchmod\s+-R\s+0*0\s+\//i,
  /\bgit\s+reset\s+--hard\b/i,
];

// CSI/OSC/ESC エスケープ・制御文字
const ANSI_RE = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]/g;
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g; // \t(09) \n(0a) は残す
const PASTE_MARKERS_RE = /\x1b\[20[01]~/g;

// よく使う制御キーの別名（tmux のキー名へ）
const KEYMAP: Record<string, string> = {
  "ctrl-c": "C-c", "c-c": "C-c", "ctrl-d": "C-d", "c-d": "C-d",
  "ctrl-z": "C-z", "c-z": "C-z", "ctrl-l": "C-l", "ctrl-r": "C-r",
  enter: "Enter", tab: "Tab", esc: "Escape", escape: "Escape",
  up: "Up", down: "Down", left: "Left", right: "Right",
  space: "Space", bspace: "BSpace", backspace: "BSpace",
};

export class AitermError extends Error {
  code: number;
  constructor(message: string, code = 1) {
    super(message);
    this.code = code;
  }
}

function tmux(...args: string[]): { code: number; stdout: string; stderr: string } {
  // maxBuffer は既定 1MiB。capture-pane（大きなスクロールバック）や多セッションの list-sessions で
  // 頭打ちになり stdout が切れる/空になる。Python の subprocess.run は無制限だったので 64MiB へ広げる。
  const r = spawnSync("tmux", ["-S", SOCK, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  // ENOBUFS（出力が 64MiB 超）を「code=1 の失敗」へ握り潰すと部分/空 stdout を正常扱いしてしまう。区別して投げる。
  // EXPECTED-FAILURE: 外部システム境界（tmux 出力過大）
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOBUFS") {
    throw new AitermError(`tmux 出力が 64MiB を超えました（${args[0]}）。範囲を絞って読んでください。`, 2);
  }
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function sessionExists(name: string): boolean {
  return tmux("has-session", "-t", name).code === 0;
}

function paneCurrentCommand(name: string): string {
  const r = tmux("display-message", "-p", "-t", name, "#{pane_current_command}");
  return r.code === 0 ? r.stdout.trim() : "";
}

function logpath(name: string): string {
  return path.join(SOCKDIR, name + ".log");
}
function offsetpath(name: string): string {
  return path.join(SOCKDIR, name + ".offset");
}
function lastcmdpath(name: string): string {
  return path.join(SOCKDIR, name + ".lastcmd");
}

function readOffset(name: string): number {
  try {
    const n = parseInt(fs.readFileSync(offsetpath(name), "utf8").trim(), 10);
    return Number.isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}
function writeOffset(name: string, off: number): void {
  fs.writeFileSync(offsetpath(name), String(off));
}
function writeLastcmd(name: string, cmd: string): void {
  try {
    fs.writeFileSync(lastcmdpath(name), cmd);
  } catch {
    /* noop */
  }
}
function readLastcmd(name: string): string {
  try {
    return fs.readFileSync(lastcmdpath(name), "utf8");
  } catch {
    return "";
  }
}

export function attachHint(name: string): string {
  return (
    `このセッションを自分の目で見る/介入する:\n` +
    `  tmux -S ${SOCK} attach -t ${name}\n` +
    `  （抜けるには Ctrl-b d）`
  );
}

// ---------------------------------------------------------------- 出力削減

function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4.0);
}

export function stripControl(text: string): string {
  text = text.replace(/\r\n/g, "\n"); // CRLF 正規化
  const out: string[] = [];
  for (let line of text.split("\n")) {
    if (line.includes("\r")) {
      const parts = line.split("\r");
      line = parts[parts.length - 1]; // 行中の\rは進捗上書き＝最終状態だけ残す
    }
    line = line.replace(ANSI_RE, "").replace(CTRL_RE, "");
    out.push(line.replace(/\s+$/, "")); // rstrip
  }
  return out.join("\n");
}

function collapseBlanks(lines: string[]): string[] {
  const out: string[] = [];
  let blanks = 0;
  for (const ln of lines) {
    if (ln === "") {
      blanks++;
      if (blanks <= 1) out.push(ln);
    } else {
      blanks = 0;
      out.push(ln);
    }
  }
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

function dedupRuns(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  const n = lines.length;
  while (i < n) {
    let j = i;
    while (j < n && lines[j] === lines[i]) j++;
    const run = j - i;
    if (run >= DEDUP_MIN_RUN && lines[i] !== "") out.push(`${lines[i]}  〈×${run}〉`);
    else out.push(...lines.slice(i, j));
    i = j;
  }
  return out;
}

/** RTK 4戦略を移植: 制御除去 / 空白正規化 / 連続重複圧縮 / head+tail 折りたたみ。返り値 [body, meta]。 */
export function reduceOutput(raw: string, name: string, elide = true): [string, string] {
  const rawLinesN = (raw.match(/\n/g)?.length ?? 0) + (raw && !raw.endsWith("\n") ? 1 : 0);
  const cleaned = stripControl(raw);
  let lines = collapseBlanks(cleaned.split("\n"));
  lines = dedupRuns(lines);
  let elided = 0;
  if (elide && lines.length > MAX_LINES_BEFORE_ELIDE) {
    elided = lines.length - HEAD_LINES - TAIL_LINES;
    const hint = `… 〈${elided} 行省略。全文は full=true、範囲は line_range="A:B"〉 …`;
    lines = [...lines.slice(0, HEAD_LINES), hint, ...lines.slice(lines.length - TAIL_LINES)];
  }
  const body = lines.join("\n");
  const meta =
    `[aiterm ${name}: ${lines.length} 行 / ~${estimateTokens(body)} tok ` +
    `(raw ${rawLinesN} 行 / ~${estimateTokens(raw)} tok)` +
    (elided ? `; ${elided} 行 hidden]` : "]");
  return [body, meta];
}

// ---------------------------------------------------------------- tmux 補助

function autoName(): string {
  const r = tmux("list-sessions", "-F", "#{session_name}");
  const existing = new Set(r.code === 0 ? r.stdout.split(/\s+/).filter(Boolean) : []);
  let i = 1;
  while (existing.has(`t${i}`)) i++;
  return `t${i}`;
}

function captureScreen(name: string, lines: number): string {
  const args = ["capture-pane", "-p", "-J", "-t", name];
  if (lines) args.push("-S", `-${lines}`);
  const r = tmux(...args);
  return r.code === 0 ? r.stdout : "";
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/** 完了境界の4層: dead / until 一致 / (出力静止 ∧ シェルに戻った) / timeout。 */
async function waitCompletion(name: string, untilRe: string | null, timeout: number): Promise<[boolean, string]> {
  // 締切は単調時計で測る。Date.now() は NTP 補正やサスペンドで巻き戻り、長時間待ちで誤判定する（Python は time.monotonic）。
  const deadline = performance.now() + timeout * 1000;
  const start = readOffset(name);
  let lastSize: number | null = null;
  let stable = 0;
  const until = untilRe ? new RegExp(untilRe) : null;
  for (;;) {
    const alive = sessionExists(name);
    let size = 0;
    try {
      size = fs.statSync(logpath(name)).size;
    } catch {
      size = 0;
    }
    if (until && size > start) {
      const buf = fs.readFileSync(logpath(name));
      const neu = buf.subarray(start).toString("utf8");
      if (until.test(stripControl(neu))) return [true, "until"];
    }
    if (!alive) return [true, "dead"];
    if (size === lastSize) {
      stable++;
      if (stable >= STABLE_POLLS && SHELLS.has(paneCurrentCommand(name))) return [true, "quiescent"];
    } else {
      stable = 0;
    }
    lastSize = size;
    if (performance.now() >= deadline) return [false, "timeout"];
    await sleep(POLL * 1000);
  }
}

function rtkRewrite(text: string): string {
  if (text.trim().includes("\n")) return text;
  // timeout 無しだと rtk がハングしたとき send() ごと凍結する。Python は timeout=5。
  const r = spawnSync("rtk", ["rewrite", text], { encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 });
  if (r.error) return text; // rtk 不在（ENOENT）・タイムアウト（ETIMEDOUT）等は元テキストへ素通し
  if ((r.status === 0 || r.status === 3) && (r.stdout ?? "").trim()) return (r.stdout ?? "").replace(/\n+$/, "");
  return text;
}

// ---------------------------------------------------------------- 操作（return で返す / 失敗は AitermError）

export function openSession(name?: string | null, shell = "bash"): [string, string] {
  fs.mkdirSync(SOCKDIR, { recursive: true });
  const nm = name || autoName();
  if (sessionExists(nm)) throw new AitermError(`session '${nm}' は既に存在します（list で確認）`, 2);
  const r = tmux("new-session", "-d", "-s", nm, "-f", "/dev/null", shell);
  if (r.code !== 0) throw new AitermError("tmux new-session 失敗: " + r.stderr.trim(), 2);
  fs.closeSync(fs.openSync(logpath(nm), "a")); // touch
  tmux("pipe-pane", "-t", nm, "-o", `cat >> ${logpath(nm)}`);
  writeOffset(nm, 0);
  return [nm, attachHint(nm)];
}

export interface SendOpts {
  enter?: boolean;
  mark?: boolean;
  force?: boolean;
  rtk?: boolean;
  raw?: boolean;
}

export function send(name: string, text: string, o: SendOpts = {}): string {
  const enter = o.enter ?? true;
  if (!sessionExists(name)) throw new AitermError(`session '${name}' が無い（open してください）`, 2);
  if (!o.raw) {
    text = text.replace(PASTE_MARKERS_RE, "").replace(ANSI_RE, "").replace(CTRL_RE, "");
  }
  if (!o.force) {
    for (const pat of DESTRUCTIVE) {
      if (pat.test(text)) {
        throw new AitermError(
          `破壊的の可能性があるコマンドを遮断しました: /${pat.source}/\n` +
            `  本当に実行するなら force を有効にして再実行してください。`,
          3,
        );
      }
    }
  }
  writeLastcmd(name, text); // read rtk の reducer 分類用（書換/mark 前の素のコマンド）
  if (o.rtk) text = rtkRewrite(text);
  if (o.mark) text = text + `; printf '\\n<<<AITERM_DONE rc=%d>>>\\n' "$?"`;
  tmux("send-keys", "-t", name, "-l", "--", text);
  if (enter) tmux("send-keys", "-t", name, "Enter");
  // コードポイント数で数える（JS の .length は UTF-16 単位で絵文字等がズレる。Python は len()=コードポイント）。
  return `sent ${[...text].length} chars to ${name}` + (enter ? " (+Enter)" : "");
}

export function sendKey(name: string, key: string): string {
  if (!sessionExists(name)) throw new AitermError(`session '${name}' が無い`, 2);
  const k = KEYMAP[key.toLowerCase()] ?? key;
  tmux("send-keys", "-t", name, k);
  return `sent key ${k} to ${name}`;
}

export interface ReadOpts {
  wait?: boolean;
  until?: string | null;
  timeout?: number;
  screen?: boolean;
  full?: boolean;
  lines?: number | null;
  range?: [number, number | null] | null;
  raw?: boolean;
  rtk?: boolean;
}

export async function readOutput(name: string, o: ReadOpts = {}): Promise<string> {
  const timeout = o.timeout ?? DEFAULT_TIMEOUT;
  if (!sessionExists(name) && !fs.existsSync(logpath(name))) throw new AitermError(`session '${name}' が無い`, 2);

  if (o.screen) {
    const rawTxt = captureScreen(name, o.lines || 0);
    if (o.raw) return rawTxt;
    const [body, meta] = reduceOutput(rawTxt, name, true);
    return body + "\n" + meta;
  }

  let status: string | null = null;
  if (o.wait) {
    const [, st] = await waitCompletion(name, o.until ?? null, timeout);
    status = st;
  }

  let data: Buffer;
  try {
    data = fs.readFileSync(logpath(name));
  } catch {
    data = Buffer.alloc(0);
  }
  let text: string;
  if (o.full || o.range) {
    text = data.toString("utf8");
    if (o.range) {
      const [lo, hi] = o.range;
      text = text.split("\n").slice(lo, hi ?? undefined).join("\n");
    }
  } else {
    const off = readOffset(name);
    text = data.subarray(off).toString("utf8");
    if (o.lines) text = text.split("\n").slice(-o.lines).join("\n");
  }

  if (!o.range) writeOffset(name, data.length); // 既定/full は offset を末尾へ

  if (o.raw) return text.endsWith("\n") ? text : text + "\n";

  if (o.rtk) {
    // コマンド別 reducer（自前移植）を観測出力へ適用
    const cmd = readLastcmd(name);
    if (cmd.trim()) {
      const framed = rtk.stripShellFrame(stripControl(text), cmd);
      const [reduced, rname] = rtk.reduce(cmd, framed);
      if (reduced !== null) {
        const meta = `[aiterm ${name}: rtk:${rname} 適用 / ~${estimateTokens(reduced)} tok (raw ~${estimateTokens(text)} tok)]`;
        if (status) {
          const complete = status !== "timeout";
          return reduced + "\n" + meta + ` [is_complete=${complete ? "True" : "False"} via ${status}]`;
        }
        return reduced + "\n" + meta;
      }
    }
    // reducer 非該当 → 汎用削減へフォールバック
  }

  const [body, meta] = reduceOutput(text, name, !o.range);
  if (status) {
    const complete = status !== "timeout";
    return body + "\n" + meta + ` [is_complete=${complete ? "True" : "False"} via ${status}]`;
  }
  return body + "\n" + meta;
}

export function listSessions(): string {
  const r = tmux(
    "list-sessions",
    "-F",
    "#{session_name}\t#{pane_current_command}\t#{?session_attached,attached,detached}\t#{window_width}x#{window_height}",
  );
  if (r.code === 0 && r.stdout.trim()) return r.stdout.replace(/\s+$/, "");
  return "(セッション無し)";
}

export function closeSession(name: string): string {
  tmux("kill-session", "-t", name);
  for (const p of [logpath(name), offsetpath(name), lastcmdpath(name)]) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* noop */
    }
  }
  return `closed ${name}`;
}

export function killAll(): string {
  tmux("kill-server");
  return "killed all sessions on this socket";
}

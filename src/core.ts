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
import * as os from "node:os";
import { createHash } from "node:crypto";
import * as rtk from "./rtk.js";

// Windows ネイティブには tmux が無い。その場合だけ全 tmux 呼び出しを WSL 経由へ橋渡しする
// （POSIX = Linux/WSL2/macOS は従来どおり tmux を直接叩く）。
const isWin = process.platform === "win32";

// .log/.offset/.lastcmd を置くディレクトリ（Node が直接読み書きする）。
// POSIX は従来どおり。Windows は TMPDIR→TEMP→os.tmpdir() の順で Windows 側の一時領域に置く。
const SOCKDIR = path.join(
  process.env.TMPDIR ?? (isWin ? process.env.TEMP ?? os.tmpdir() : "/tmp"),
  "claude-tmux-sockets",
);
// tmux -S に渡すソケットパス。POSIX はログと同じツリーに置く。
// Windows は tmux が WSL 内で動くため、ソケットは WSL ネイティブ fs に置く必要がある
// （/mnt drvfs(9p) 上では AF_UNIX 非対応）。SOCKDIR から短い安定名を導出し、
// TMPDIR ごとの隔離（テスト）と再起動跨ぎ再接続を両立する。
const SOCK = isWin
  ? `/tmp/aiterm-${createHash("sha1").update(SOCKDIR).digest("hex").slice(0, 12)}.sock`
  : path.join(SOCKDIR, "claude.sock");

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

// Windows のドライブパス (C:\a\b) を WSL から見える /mnt/c/a/b へ変換する。
// 一時領域は常にドライブ直下なので UNC は想定外＝弾く（黙って壊れた //server パスを作らない）。
export function toWslPath(p: string): string {
  const m = /^([A-Za-z]):\/(.*)$/.exec(p.replace(/\\/g, "/"));
  if (!m) throw new AitermError(`WSL へ橋渡しできない一時パスです（ドライブ直下のみ対応）: ${p}`, 2);
  return `/mnt/${m[1].toLowerCase()}/${m[2]}`;
}

// Windows で最初の tmux 呼び出し前に一度だけ WSL+tmux の可用性を確かめ、失敗は原因別に投げる。
// -e（ログインシェル非経由）＋短い timeout で、初回セットアップ未完了の wsl によるハングも防ぐ。
let winBridgeOk = false;
function ensureWinBridge(): void {
  if (winBridgeOk) return;
  const r = spawnSync("wsl.exe", ["-e", "tmux", "-V"], { encoding: "utf8", timeout: 10000 });
  if (r.error) {
    const code = (r.error as NodeJS.ErrnoException).code;
    if (code === "ETIMEDOUT")
      throw new AitermError("WSL が応答しません（初回セットアップ未完了の可能性）。一度 `wsl` を起動してから再実行してください。", 2);
    if (code === "ENOENT")
      throw new AitermError("wsl.exe が見つかりません。Windows では WSL 上の tmux 経由で動作します。WSL と tmux を導入してください。", 2);
    throw new AitermError(`wsl.exe を起動できませんでした（${code ?? "unknown"}）。`, 2);
  }
  // wsl.exe は System32 にあるので「起動」は成功するが、ディストリ未導入や distro 内に tmux が無いと
  // 非ゼロで終わる。両方を区別せず（wsl の出力は UTF-16 で文字化けし得るため）正直に表す。
  if (r.status !== 0)
    throw new AitermError("WSL 経由で tmux を起動できませんでした。WSL のディストリ未導入、または distro 内に tmux が無い可能性があります。`wsl tmux -V` が通るか確認してください（tmux 導入例: sudo apt install tmux）。", 2);
  winBridgeOk = true;
}

function tmux(...args: string[]): { code: number; stdout: string; stderr: string } {
  // maxBuffer は既定 1MiB。capture-pane（大きなスクロールバック）や多セッションの list-sessions で
  // 頭打ちになり stdout が切れる/空になる。Python の subprocess.run は無制限だったので 64MiB へ広げる。
  // Windows は同じ tmux を WSL 経由（-e でログインシェル非経由＝$ 展開やクオート崩れを防ぐ）で叩く。
  let r;
  if (isWin) {
    ensureWinBridge();
    r = spawnSync("wsl.exe", ["-e", "tmux", "-S", SOCK, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } else {
    r = spawnSync("tmux", ["-S", SOCK, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  }
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

// session 名はファイルパス（logpath 等）と pipe-pane の /bin/sh 文字列へ流れる。英数 _ - のみ・64字に
// 限定し、パストラバーサル（../）とシェルインジェクション（' でのクオート破り・$・; 等）を全入口で断つ。
function assertSessionName(name: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name))
    throw new AitermError(`session 名は英数字と _ - のみ・64文字以内にしてください: ${JSON.stringify(name)}`, 2);
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
  // Windows は WSL 内 tmux なので、人が打つのは wsl 経由（SOCK は WSL パス）。
  const cmd = isWin ? `wsl tmux -S ${SOCK} attach -t ${name}` : `tmux -S ${SOCK} attach -t ${name}`;
  return (
    `このセッションを自分の目で見る/介入する:\n` +
    `  ${cmd}\n` +
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

// Windows 専用: pipe-pane のログは /mnt/c (9p) 境界を越えて書かれるため、tmux が完了/セッション
// 消滅を報告した後も最後の数百バイトが少し遅れて現れる。完了と判定する直前にログサイズが
// 伸びなくなるまで待ち、readOutput が末尾欠けの出力を返さないようにする（POSIX は同一fsゆえ不要）。
async function settleWinLog(name: string): Promise<void> {
  let prev = -1;
  for (let i = 0; i < 8; i++) {
    let sz = 0;
    try {
      sz = fs.statSync(logpath(name)).size;
    } catch {
      sz = 0;
    }
    if (sz === prev) return;
    prev = sz;
    await sleep(POLL * 1000);
  }
}

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
    if (!alive) {
      if (isWin) await settleWinLog(name);
      return [true, "dead"];
    }
    if (size === lastSize) {
      stable++;
      if (stable >= STABLE_POLLS && SHELLS.has(paneCurrentCommand(name))) {
        if (isWin) await settleWinLog(name);
        return [true, "quiescent"];
      }
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
  // Windows はコマンドが WSL 内で走るので rtk も WSL 側（-e）で評価する。不在は素通し。
  const r = isWin
    ? spawnSync("wsl.exe", ["-e", "rtk", "rewrite", text], { encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 })
    : spawnSync("rtk", ["rewrite", text], { encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 });
  if (r.error) return text; // rtk 不在（ENOENT）・タイムアウト（ETIMEDOUT）等は元テキストへ素通し
  if ((r.status === 0 || r.status === 3) && (r.stdout ?? "").trim()) return (r.stdout ?? "").replace(/\n+$/, "");
  return text;
}

// ---------------------------------------------------------------- 操作（return で返す / 失敗は AitermError）

export function openSession(name?: string | null, shell = "bash"): [string, string] {
  fs.mkdirSync(SOCKDIR, { recursive: true });
  const nm = name || autoName();
  assertSessionName(nm);
  if (sessionExists(nm)) throw new AitermError(`session '${nm}' は既に存在します（list で確認）`, 2);
  const r = tmux("new-session", "-d", "-s", nm, "-f", "/dev/null", shell);
  if (r.code !== 0) throw new AitermError("tmux new-session 失敗: " + r.stderr.trim(), 2);
  fs.closeSync(fs.openSync(logpath(nm), "a")); // touch
  // pipe-pane の引数は tmux 内部の /bin/sh -c で再解釈される（argv ではない）。パスは単一引用符で包み、
  // パス自身の ' は '\'' イディオムでエスケープする（名前は検証済みだが、Windows ユーザー名 O'Brien 等が
  // 一時パスに ' を持ち込み redirect を壊すのを防ぐ。空白対策も兼ねる）。Windows は WSL から見える /mnt/c 形へ。
  const pipeTarget = isWin ? toWslPath(logpath(nm)) : logpath(nm);
  const quoted = `'${pipeTarget.replace(/'/g, "'\\''")}'`;
  tmux("pipe-pane", "-t", nm, "-o", `cat >> ${quoted}`);
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
  assertSessionName(name);
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
  assertSessionName(name);
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
  assertSessionName(name);
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
    let off = readOffset(name);
    // WSL 再起動等でログが作り直されると、Windows 側に残った旧 offset が新ログ長を超え、
    // subarray が空を返して「何も読めない」状態になる。末尾越えは先頭から読み直す（POSIX では no-op）。
    if (off > data.length) off = 0;
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
  assertSessionName(name);
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

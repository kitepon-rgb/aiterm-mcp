/**
 * core — CLI/MCP が共有する純粋ロジック層（Node/TS 版）。
 *
 * 1個のローカル専用 tmux セッションを握り、send でキーストロークを流し、read で画面/出力を
 * トークン削減して受け取る。SSH/docker は専用機能にせず send(id, "ssh host") で中に入る（ネスト）。
 * セッションは tmux サーバ常駐ゆえ、本プロセスが毎回終了しても次回 read で再接続できる。
 *
 * 設計: docs/01_design-plan.md / docs/02_mcp-plan.md。出力削減は rag/ の RTK を移植。
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import * as rtk from "./rtk.js";
import { recordRuntimeError, type RuntimeErrorCode } from "./runtime-error-store.js";

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
// 通常PTYへ複数行をそのままpasteすると、途中で起動したpager/REPLが後続行を
// キー入力として消費する。POSIX shell前面では改行を持たないeval 1行へ包み、
// script全体をshell内部へ取り込んでから実行する。fish等の非POSIX shellや
// ssh/REPL前面は従来の生pasteを維持する。
const ATOMIC_MULTILINE_SHELLS = new Set(["bash", "sh", "zsh", "dash"]);
// mark の sentinel は POSIX シェル構文（; と "$?"）に依存する。これらの非 POSIX 対話シェルが
// 前面のときは "$?" が正しく展開されず sentinel が壊れるので mark を拒否する（B8）。ssh/docker で
// リモート POSIX シェルに入っている場合は前面が "ssh"/"docker" 等で本集合に含まれず＝許可される。
const NON_POSIX_MARK_SHELLS = new Set(["fish", "csh", "tcsh"]);

// mark:true が付ける完了 sentinel の検出正規表現。printf の実出力は rc=<数字>、コマンド行の
// エコーは rc=%d(リテラル)。数字アンカーでエコーに免疫化し、部分一致による早期誤完了を防ぐ（B1）。
// send の printf 書式（`rc=%d`）と対で保守すること。
const MARK_DONE_RE = /<<<AITERM_DONE rc=[0-9]+>>>/;
const LAUNCH_ID_RE = /^[0-9a-f]{32}$/;
const OPERATION_ID_RE = /^sha256:[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AGENT_LINEAGE_RE = /^[A-Za-z0-9_.:-]+(?:>[A-Za-z0-9_.:-]+)*$/;
export type AgentKind = "claude" | "codex" | "grok" | "composer";
type InitialPromptState = "none" | "not_sent" | "sent" | "pending" | "done" | "failed";

const AGENT_DONE_POLL_MS = 100;
const AGENT_DONE_SETTLE_MIN_MS = 250;
const AGENT_DONE_SCREEN_SETTLE_POLL_MS = 100;
const AGENT_DONE_SCREEN_SETTLE_MAX_POLLS = 5;
const AGENT_DONE_SCREEN_SETTLE_MIN_SAMPLES = 3;
const AGENT_SUBMIT_DELAY_MS = 250;
const AGENT_EVENT_MAX_BYTES = 1024 * 1024;
const AGENT_EVENT_TAIL_BYTES = 64 * 1024;
const CODEX_TRANSCRIPT_INCREMENT_MAX_BYTES = 16 * 1024 * 1024;
const GROK_TRANSCRIPT_INCREMENT_MAX_BYTES = 16 * 1024 * 1024;
const AGENT_METADATA_NEGATIVE_CACHE_TTL_MS = 2_000;
const AGENT_TUI_READY_TIMEOUT_MS = 30_000;
const AGENT_TUI_READY_POLL_MS = 500;
const AGENT_TUI_READY_STABLE_SAMPLES = 11;
const AGENT_TUI_READY_LINES = 45;
const CLAUDE_APPROVAL_SCREEN_LINES = 80;
// submit座礁観測（dispatch後にcomposerへ送信textが残存していないかの有界チェック）
const AGENT_SUBMIT_RESIDUE_DELAY_MS = 250;
const AGENT_SUBMIT_RESIDUE_POLL_MS = 300;
const AGENT_SUBMIT_RESIDUE_MAX_SAMPLES = 5;
const AGENT_SUBMIT_RESIDUE_TAIL_CHARS = 32;
const AGENT_SUBMIT_RESIDUE_MIN_TAIL_CHARS = 8;
const GROK_AUTH_MAX_BYTES = 64 * 1024;
const CLAUDE_RESULT_MAX_BYTES = 4 * 1024 * 1024;

// 出力削減（RTK の CAP 思想を移植）
const MAX_LINES_BEFORE_ELIDE = 60;
const HEAD_LINES = 30;
const TAIL_LINES = 20;
const MAX_LINE_CHARS_BEFORE_ELIDE = 2000;
const LINE_HEAD_CHARS = 1200;
const LINE_TAIL_CHARS = 600;
const DEDUP_MIN_RUN = 3; // 同一行がこれ以上連続したら 1 行＋件数に畳む
const MAX_FULL_BYTES = 8 * 1024 * 1024; // full/range 読取で一度にメモリへ載せる上限（B7）
const MAX_SEND_BYTES = 64 * 1024;
// macOSのPTY入力queueは、tmuxが長文を1回で流すと後半を落とすことがある。
// UTF-8境界を守って小さいtmux client roundtripに分け、各回にserver event loopがPTYへdrainできる境界を作る。
const PTY_PASTE_CHUNK_BYTES = process.platform === "darwin" ? 256 : MAX_SEND_BYTES;
const SESSION_SEND_LOCK_WAIT_MS = 10_000;
const SESSION_SEND_LOCK_POLL_MS = 25;

// 安全: send 前に弾く破壊的コマンド（外部システム境界の防御）
const DESTRUCTIVE: RegExp[] = [
  // rm -rf の危険な対象形（best-effort・force で越えられる）。先頭の任意クオート ['"]? で
  // `rm -rf "/"` / `'/'` / `"~"` を捕捉。`\.\/\*`=./*（相対 glob）、`\.\.?\/?\s*$`=. / .. / ./ / ../
  // （カレント/親そのもの）。`./build` 等の相対サブディレクトリは末尾でないので非該当（過剰ブロック回避）。
  /\brm\s+-[rfRF]*[rf][rfRF]*\s+(?:--\s+)?['"]?(\/|~|\$HOME|\.\/\*|\.\.?\/?\s*$|\*\s*$)/i,
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
// CSI / OSC(BEL or ST 終端) / DCS・PM・APC・SOS(ESC P/^/_/X … BEL or ST 終端。ペイロード本文ごと除去=B10) / 残る2文字エスケープ
const ANSI_RE =
  /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[P^_X][\s\S]*?(?:\x07|\x1b\\)|\x1b[@-_]/g;
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

class TelemetryOwnedError extends AitermError {
  readonly telemetryCode: RuntimeErrorCode;
  constructor(message: string, code: number, telemetryCode: RuntimeErrorCode, cause?: unknown) {
    super(message, code);
    this.name = "TelemetryOwnedError";
    this.telemetryCode = telemetryCode;
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause;
  }
}

function telemetryOwnedFailure(telemetryCode: RuntimeErrorCode, error: unknown, fallbackCode = 1): TelemetryOwnedError {
  if (error instanceof TelemetryOwnedError) return error;
  recordRuntimeError(telemetryCode);
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof AitermError ? error.code : fallbackCode;
  return new TelemetryOwnedError(message, code, telemetryCode, error);
}
function ownTelemetryFailure(telemetryCode: RuntimeErrorCode, error: unknown, fallbackCode = 1): never {
  throw telemetryOwnedFailure(telemetryCode, error, fallbackCode);
}

function ptyDependencyError(message: string, observe = true): never {
  const error = new AitermError(message, 2);
  if (observe) ownTelemetryFailure("AITERM.PTY_DEPENDENCY_UNAVAILABLE", error, 2);
  throw error;
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
function ensureWinBridge(observe = true): void {
  if (winBridgeOk) return;
  const r = spawnSync("wsl.exe", ["-e", "tmux", "-V"], { encoding: "utf8", timeout: 10000 });
  if (r.error) {
    const code = (r.error as NodeJS.ErrnoException).code;
    if (code === "ETIMEDOUT")
      ptyDependencyError("WSL が応答しません（初回セットアップ未完了の可能性）。一度 `wsl` を起動してから再実行してください。", observe);
    if (code === "ENOENT")
      ptyDependencyError("wsl.exe が見つかりません。Windows では WSL 上の tmux 経由で動作します。WSL と tmux を導入してください。", observe);
    ptyDependencyError(`wsl.exe を起動できませんでした（${code ?? "unknown"}）。`, observe);
  }
  // wsl.exe は System32 にあるので「起動」は成功するが、ディストリ未導入や distro 内に tmux が無いと
  // 非ゼロで終わる。両方を区別せず（wsl の出力は UTF-16 で文字化けし得るため）正直に表す。
  if (r.status !== 0)
    ptyDependencyError("WSL 経由で tmux を起動できませんでした。WSL のディストリ未導入、または distro 内に tmux が無い可能性があります。`wsl tmux -V` が通るか確認してください（tmux 導入例: sudo apt install tmux）。", observe);
  winBridgeOk = true;
}

// tmux が見つからないときの説明。macOS は tmux を同梱せず、Homebrew の bin は GUI 起動時の PATH に
// 入らないため、原因と対処（導入・自動探索・AITERM_TMUX 上書き）を正直に提示する。
function tmuxMissingMessage(): string {
  const head = "tmux が見つかりません（PATH 上に存在しません）。aiterm は実行時に tmux を必要とします。";
  const hint =
    process.platform === "darwin"
      ? "macOS では `brew install tmux` で導入してください。GUI から起動された場合、Homebrew の bin " +
        "（Apple Silicon: /opt/homebrew/bin、Intel: /usr/local/bin）が PATH に含まれないことがあります" +
        "（その場合 aiterm が自動で探索します）。"
      : "（例: Debian/Ubuntu は `sudo apt install tmux`）。";
  const override = "別の場所にある tmux を使うには AITERM_TMUX=/path/to/tmux を指定してください。";
  return `${head}${hint}${override}`;
}

// POSIX(Linux/WSL2/macOS) 用の tmux バイナリ解決。Windows の ensureWinBridge() に対応する事前確認。
// 解決順: AITERM_TMUX（明示指定）→ PATH 上の tmux → Homebrew 既定パス。一度だけ実行しキャッシュする。
// 見つからなければ tmuxMissingMessage で投げる（黙ってフォールバックせず、原因が見えるようにする）。
let tmuxBin: string | null = null;
function resolveTmux(observe = true): string {
  if (tmuxBin) return tmuxBin;
  const override = process.env.AITERM_TMUX;
  if (override) {
    const r = spawnSync(override, ["-V"], { encoding: "utf8", timeout: 5000 });
    if (!r.error && r.status === 0) return (tmuxBin = override);
    ptyDependencyError(
      `AITERM_TMUX に指定された tmux を起動できません: ${override}（\`${override} -V\` が通りません）`,
      observe,
    );
  }
  // CLI/開発時は PATH 上の tmux をそのまま使う（最優先）。
  const onPath = spawnSync("tmux", ["-V"], { encoding: "utf8", timeout: 5000 });
  if (!onPath.error && onPath.status === 0) return (tmuxBin = "tmux");
  // GUI 起動などで PATH に Homebrew の bin が無い場合、既定の場所を探す。
  // 使う場合は黙らず stderr へ告知する（stdout は JSON-RPC 専用＝index.ts の制約）。
  for (const cand of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux"]) {
    try {
      fs.accessSync(cand, fs.constants.X_OK);
      console.error(`aiterm: tmux が PATH 上に無いため ${cand} を使用します`);
      return (tmuxBin = cand);
    } catch {
      /* 次の候補へ */
    }
  }
  ptyDependencyError(tmuxMissingMessage(), observe);
}

// tmux は locale が C/POSIX/未設定だと UTF-8 を扱えない: server は send-keys/paste のマルチバイト
// 入力を破壊し（文字消失・周辺バイトの並べ替えを実測）、client は format 出力のタブ等を "_" へ
// サニタイズする。GUI 起動の MCP client は LANG を持たないことが多く、その環境で立った tmux server は
// 以後すべての入力を壊すため、UTF-8 locale が確定しない場合だけ LC_CTYPE を明示注入する。
// 利用者が C/POSIX 以外を明示設定している場合はその選択を尊重して触らない。
export function tmuxSpawnEnv(): NodeJS.ProcessEnv | undefined {
  const effective = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "";
  // 素の "C"/"POSIX" だけを壊れた既定とみなす。"C.UTF-8" を含む charset 付きの明示設定は尊重する。
  if (effective && !/^(C|POSIX)$/i.test(effective)) return undefined;
  const env: NodeJS.ProcessEnv = { ...process.env, LC_CTYPE: process.platform === "darwin" ? "UTF-8" : "C.UTF-8" };
  // LC_ALL は LC_CTYPE より優先されるため、C/POSIX の LC_ALL が残ると注入が無効になる
  delete env.LC_ALL;
  return env;
}

function tmuxCommandWithInput(
  observe: boolean,
  input: string | undefined,
  ...args: string[]
): { code: number; stdout: string; stderr: string } {
  // maxBuffer は既定 1MiB。capture-pane（大きなスクロールバック）や多セッションの list-sessions で
  // 頭打ちになり stdout が切れる/空になる。Python の subprocess.run は無制限だったので 64MiB へ広げる。
  // Windows は同じ tmux を WSL 経由（-e でログインシェル非経由＝$ 展開やクオート崩れを防ぐ）で叩く。
  let r;
  const spawnOpts = { encoding: "utf8" as const, maxBuffer: 64 * 1024 * 1024, input, env: tmuxSpawnEnv() };
  if (isWin) {
    ensureWinBridge(observe);
    r = spawnSync("wsl.exe", ["-e", "tmux", "-S", SOCK, ...args], spawnOpts);
  } else {
    // resolveTmux() は tmux を解決できなければ明確な AitermError を投げる（POSIX 版の事前確認）。
    r = spawnSync(resolveTmux(observe), ["-S", SOCK, ...args], spawnOpts);
  }
  // ENOBUFS（出力が 64MiB 超）を「code=1 の失敗」へ握り潰すと部分/空 stdout を正常扱いしてしまう。区別して投げる。
  // EXPECTED-FAILURE: 外部システム境界（tmux 出力過大）
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOBUFS") {
    throw new AitermError(`tmux 出力が 64MiB を超えました（${args[0]}）。範囲を絞って読んでください。`, 2);
  }
  // 解決済み tmux が実行時に消えた（アンインストール等）場合の ENOENT を、空 stderr の code=1 へ握り潰さない。
  // 通常は resolveTmux() が事前に弾くため発火しないが、mid-run 消滅に対する正直な防御。
  if (!isWin && r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") {
    tmuxBin = null; // 次回 resolveTmux で再解決を許す
    ptyDependencyError(tmuxMissingMessage(), observe);
  }
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function tmuxCommand(observe: boolean, ...args: string[]): { code: number; stdout: string; stderr: string } {
  return tmuxCommandWithInput(observe, undefined, ...args);
}

function tmux(...args: string[]): { code: number; stdout: string; stderr: string } {
  return tmuxCommand(true, ...args);
}
function tmuxWithInput(input: string, ...args: string[]): { code: number; stdout: string; stderr: string } {
  return tmuxCommandWithInput(true, input, ...args);
}
function tmuxCleanup(...args: string[]): { code: number; stdout: string; stderr: string } {
  return tmuxCommand(false, ...args);
}

function sessionExists(name: string): boolean {
  return tmux("has-session", "-t", name).code === 0;
}

function paneCurrentCommand(name: string): string {
  const r = tmux("display-message", "-p", "-t", name, "#{pane_current_command}");
  return r.code === 0 ? r.stdout.trim() : "";
}

function pasteBufferSupportsNoSanitizeFlag(): boolean {
  const listed = tmux("list-commands");
  if (listed.code !== 0) {
    throw new AitermError(
      `tmux paste-buffer 能力の確認に失敗しました: ${listed.stderr.trim() || `code=${listed.code}`}`,
      2,
    );
  }
  const usage = listed.stdout.split("\n").find((line) => line.startsWith("paste-buffer "));
  if (!usage) throw new AitermError("tmux list-commands にpaste-bufferがありません", 2);
  // tmux 3.4は制御文字を無変換でpasteし、-S自体が無い。3.7は既定でvis(3)変換し、
  // -Sが無変換を選ぶ。version文字比較で推測せず、実際のcommand usageにflagがあるかを見る。
  return /\[-[^\]]*S[^\]]*\]/.test(usage);
}

function splitPtyText(text: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  let chunkBytes = 0;
  for (const codePoint of text) {
    const bytes = Buffer.byteLength(codePoint, "utf8");
    if (chunk && chunkBytes + bytes > PTY_PASTE_CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = "";
      chunkBytes = 0;
    }
    chunk += codePoint;
    chunkBytes += bytes;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function quoteForPrintfB(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/'/g, `'"'"'`);
}

function atomicShellMultiline(text: string): string {
  // POSIX printf %bで元の改行・backslashを復元し、evalは現在shell内で実行する。
  // command substitutionが末尾LFを落とす点は、pty_sendのsubmitを担うEnterと同値。
  return `eval "$(command printf '%b' '${quoteForPrintfB(text)}')"`;
}

function assertSendTextSize(text: string, context = "送信文字列"): void {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > MAX_SEND_BYTES) {
    throw new AitermError(`${context}が${MAX_SEND_BYTES} bytesを超えています（${bytes} bytes）`, 2);
  }
}

// session 名はファイルパス（logpath 等）と pipe-pane の /bin/sh 文字列へ流れる。英数 _ - のみ・64字に
// 限定し、パストラバーサル（../）とシェルインジェクション（' でのクオート破り・$・; 等）を全入口で断つ。
function assertSessionName(name: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name))
    throw new AitermError(`session 名は英数字と _ - のみ・64文字以内にしてください: ${JSON.stringify(name)}`, 2);
}

function currentUid(): number {
  if (typeof process.getuid !== "function") {
    throw new AitermError("agent_done は POSIX/macOS/Linux のみ対応です（native Windows は未対応）", 2);
  }
  return process.getuid();
}

function runtimeStateBase(): string {
  const xdg = process.env.XDG_RUNTIME_DIR;
  if (xdg) {
    try {
      if (fs.statSync(xdg).isDirectory()) return xdg;
    } catch {
      /* XDG_RUNTIME_DIR が壊れている CI/非 login 環境では os.tmpdir() に戻す */
    }
  }
  return os.tmpdir();
}

function stateRoot(): string {
  const uid = currentUid();
  const base = runtimeStateBase();
  return path.join(base, `aiterm-mcp-${uid}`);
}

function ensureSecureStateRoot(): string {
  const root = stateRoot();
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const st = fs.lstatSync(root);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    throw new AitermError(`agent state root が安全な directory ではありません: ${root}`, 2);
  }
  if (st.uid !== currentUid()) {
    throw new AitermError(`agent state root の owner が現在ユーザーではありません: ${root}`, 2);
  }
  if ((st.mode & 0o077) !== 0) {
    fs.chmodSync(root, 0o700);
  }
  const agents = path.join(root, "agents");
  fs.mkdirSync(agents, { recursive: true, mode: 0o700 });
  const ast = fs.lstatSync(agents);
  if (!ast.isDirectory() || ast.isSymbolicLink() || ast.uid !== currentUid()) {
    throw new AitermError(`agent state dir が安全な directory ではありません: ${agents}`, 2);
  }
  if ((ast.mode & 0o077) !== 0) fs.chmodSync(agents, 0o700);
  return root;
}

function agentsDir(): string {
  return path.join(ensureSecureStateRoot(), "agents");
}

function agentEventPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.events.jsonl`);
}

function agentMetadataPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.agent.json`);
}

function agentWaitLockPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.wait.lock`);
}

function agentManagedClaudeSettingsPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-settings.json`);
}

function agentClaudeResultPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-result.json`);
}

function agentClaudeOperationPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-operation.json`);
}

function agentClaudeApprovalReceiptPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-approval.json`);
}

function agentClaudeDispatchReceiptPath(name: string, launchId: string, operationId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  const validated = validateOperationId(operationId);
  return path.join(agentsDir(), `${name}.${launchId}.${validated.slice("sha256:".length)}.claude-dispatch`);
}

function existingAgentsDir(): string | null {
  if (typeof process.getuid !== "function") return null;
  const root = path.join(runtimeStateBase(), `aiterm-mcp-${process.getuid()}`);
  const dir = path.join(root, "agents");
  try {
    const rst = fs.lstatSync(root);
    if (!rst.isDirectory() || rst.isSymbolicLink() || rst.uid !== process.getuid()) return null;
    if ((rst.mode & 0o077) !== 0) fs.chmodSync(root, 0o700);
    const st = fs.lstatSync(dir);
    if (!st.isDirectory() || st.isSymbolicLink() || st.uid !== process.getuid()) return null;
    if ((st.mode & 0o077) !== 0) fs.chmodSync(dir, 0o700);
    return dir;
  } catch {
    return null;
  }
}

function cleanupAgentState(name: string): void {
  assertSessionName(name);
  agentMetadataNegativeCache.delete(name);
  const dir = existingAgentsDir();
  if (!dir) return;
  const prefix = `${name}.`;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith(prefix)) continue;
      const p = path.join(dir, f);
      try {
        if (
          f.endsWith(".agent.json") ||
          f.endsWith(".events.jsonl") ||
          f.endsWith(".wait.lock") ||
          f.endsWith(".claude-settings.json") ||
          f.endsWith(".claude-mcp.json") ||
          f.endsWith(".claude-result.json") ||
          f.endsWith(".claude-operation.json") ||
          f.endsWith(".claude-approval.json") ||
          f.endsWith(".claude-dispatch")
        ) fs.unlinkSync(p);
        else if (f.endsWith(".codex-home") || f.endsWith(".grok-home") || f.endsWith(".home")) {
          fs.rmSync(p, { recursive: true, force: true });
        }
      } catch {
        /* stale agent state cleanup is best-effort */
      }
    }
  } catch {
    /* stale agent state cleanup is best-effort */
  }
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
// mark:true 送信中フラグ。存在すれば waitCompletion が sentinel 完了検出（MARK_DONE_RE）を有効化する。
function markpath(name: string): string {
  return path.join(SOCKDIR, name + ".mark");
}
function sendLockPath(name: string): string {
  assertSessionName(name);
  return path.join(SOCKDIR, name + ".send.lock");
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

function surrogateSafeEnd(text: string, end: number): number {
  return end > 0 && end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])
    ? end + 1
    : end;
}

function surrogateSafeStart(text: string, start: number): number {
  return start > 0 && start < text.length && /[\uD800-\uDBFF]/.test(text[start - 1]) && /[\uDC00-\uDFFF]/.test(text[start])
    ? start - 1
    : start;
}

function elideLongLines(lines: string[]): string[] {
  return lines.map((line) => {
    if (line.length <= MAX_LINE_CHARS_BEFORE_ELIDE) return line;
    const headEnd = surrogateSafeEnd(line, LINE_HEAD_CHARS);
    const tailStart = surrogateSafeStart(line, line.length - LINE_TAIL_CHARS);
    const omitted = tailStart - headEnd;
    return `${line.slice(0, headEnd)}… 〈行内 ${omitted} 文字省略。全文は raw:true か line_range で取得〉 …${line.slice(tailStart)}`;
  });
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
  if (elide) lines = elideLongLines(lines);
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

// 衝突リトライ用の乱数名。線形 t{i} は高並行だと全員が同じ「最小の空き番号」を見て衝突し続ける
// （TOCTOU）ため、2回目以降は 1600万通りの nonce 名に切り替えてリトライ上限内で実質確実に確保する。
function nonceName(): string {
  return `t-${randomBytes(3).toString("hex")}`;
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

/** 完了境界: dead / mark sentinel 一致 / until 一致 / (出力静止 ∧ シェル復帰)=quiescent / (ネスト中＋until/mark無しで出力静止)=nested(未確定・早期返却) / timeout。 */
async function waitCompletion(
  name: string,
  untilStr: string | null,
  untilRegex: boolean,
  timeout: number,
): Promise<[boolean, string]> {
  // 締切は単調時計で測る。Date.now() は NTP 補正やサスペンドで巻き戻り、長時間待ちで誤判定する（Python は time.monotonic）。
  const deadline = performance.now() + timeout * 1000;
  const start = readOffset(name);
  let lastSize: number | null = null;
  let stable = 0;
  // until は既定でリテラル部分一致（`$ ` や `[sudo]` 等がメタ化して永遠に待つ footgun を避ける・B4）。
  // untilRegex:true のときだけ正規表現として解釈し、不正パターンは明示エラーにする（B13 の until 部分）。
  let until: ((s: string) => boolean) | null = null;
  if (untilStr) {
    if (untilRegex) {
      let re: RegExp;
      try {
        re = new RegExp(untilStr);
      } catch (e) {
        throw new AitermError(`until 正規表現が不正です: ${JSON.stringify(untilStr)}（${(e as Error).message}）`, 2);
      }
      until = (s) => re.test(s);
    } else {
      until = (s) => s.includes(untilStr);
    }
  }
  // mark:true 送信中なら sentinel 完了検出を有効化する。エコー（rc=%d）でなく実出力（rc=<数字>）だけに
  // 一致する数字アンカー MARK_DONE_RE を使うため、until のようにエコー部分一致で早期誤完了しない（B1）。
  const markActive = fs.existsSync(markpath(name));
  for (;;) {
    let size = 0;
    try {
      size = fs.statSync(logpath(name)).size;
    } catch {
      size = 0;
    }
    if ((until || markActive) && size > start) {
      // 増分 [start, size] だけを fd で読む（毎 poll で全ファイルを読む O(n^2) を避ける・B6）。
      let neu = "";
      let fd: number | undefined;
      try {
        fd = fs.openSync(logpath(name), "r");
        const len = size - start;
        const buf = Buffer.alloc(len);
        const n = fs.readSync(fd, buf, 0, len, start);
        neu = stripControl(buf.subarray(0, Math.max(0, n)).toString("utf8"));
      } catch {
        neu = ""; // close 等でログが消えた: 次周回の !alive/statSync で決着させる
      } finally {
        if (fd !== undefined) {
          try {
            fs.closeSync(fd);
          } catch {
            /* noop */
          }
        }
      }
      // mark を until より先に判定（sentinel は確証つき完了。until はユーザ指定でエコー誤爆余地あり）。
      if (markActive && MARK_DONE_RE.test(neu)) {
        try {
          fs.unlinkSync(markpath(name)); // 同一 sentinel での再発火を防ぐ
        } catch {
          /* noop */
        }
        if (isWin) await settleWinLog(name);
        return [true, "mark"];
      }
      if (until && until(neu)) return [true, "until"];
    }
    // 出力が伸びている間は生存確認(tmux has-session の spawn)を省く＝伸長は生存の証（B6）。
    // 静止時のみ has-session を叩いて dead を判定する。dead 検出は最大 1 poll 遅れるだけ。
    const growing = lastSize !== null && size > lastSize;
    if (!growing && !sessionExists(name)) {
      if (isWin) await settleWinLog(name);
      return [true, "dead"];
    }
    if (size === lastSize) {
      stable++;
      if (stable >= STABLE_POLLS) {
        const fg = paneCurrentCommand(name);
        // サイズ標本は過去・fg は今、の時間差 race を閉じる: fg 取得（サブプロセス spawn）の間に
        // 出力が伸びていたら「静止」は不成立として周回をやり直す。閉じないと、コマンド完了直後の
        // 出力＋シェル復帰が quiescent に誤帰属され、mark/until が帰属を取り損ねる
        // （macOS CI 実測: sleep 0.6 の mark 送信が via quiescent に化けた・B1 flake の根因）。
        // 次周回の先頭で新増分に対する mark/until 判定が走る。
        if (safeStatSize(logpath(name)) !== size) {
          stable = 0;
        } else if (SHELLS.has(fg)) {
          if (isWin) await settleWinLog(name);
          return [true, "quiescent"]; // 出力静止 ∧ シェル復帰 ＝ 確証つき完了
        } else if (!until && !markActive && fg !== "") {
          // ネスト中（前面が ssh/docker/REPL 等でシェル集合外）は quiescence の「シェル復帰」条件を
          // 原理的に満たせない。until も mark も無ければこれ以上待っても確証は増えない（until/dead/
          // quiescent/mark のいずれも発火し得ない）ので、出力静止時点で「未確定」のまま早期返却する。
          // markActive のときは sentinel を待つべく早期返却せず、非シェル前面（sleep 等）でも待ち続ける。
          // fg==="" は前面コマンド取得失敗＝ネスト断定不可なので早期返却せず従来どおり timeout まで待つ。
          if (isWin) await settleWinLog(name);
          return [false, "nested"];
        }
      }
    } else {
      stable = 0;
    }
    lastSize = size;
    if (performance.now() >= deadline) return [false, "timeout"];
    await sleep(POLL * 1000);
  }
}

// 完了ステータス → is_complete 表記。確証のある層のみ True（mark/until/dead/quiescent）。
// timeout と nested（ネスト中・出力静止だが確証なし）は False。nested は until/mark を促す注記を添える。
function completionSuffix(status: string): string {
  const complete =
    status === "mark" || status === "until" || status === "dead" || status === "quiescent";
  let s = ` [is_complete=${complete ? "True" : "False"} via ${status}]`;
  if (status === "nested")
    s +=
      " ネスト中（前面が ssh/docker/REPL 等）は出力静止だけでは完了を確定できません。" +
      "until（リモートのプロンプト等の正規表現）か mark:true で完了を指定してください。";
  return s;
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

function assertNotDestructive(text: string, code: number, context = ""): void {
  for (const pat of DESTRUCTIVE) {
    if (pat.test(text)) {
      throw new AitermError(
        `${context}破壊的の可能性があるコマンドを遮断しました: /${pat.source}/\n` +
          `  本当に実行するなら force を有効にして再実行してください。`,
        code,
      );
    }
  }
}

// ---------------------------------------------------------------- 操作（return で返す / 失敗は AitermError）

export function openSession(name?: string | null, shell = "bash"): [string, string] {
  try {
    fs.mkdirSync(SOCKDIR, { recursive: true });
  } catch (error) {
    ownTelemetryFailure("AITERM.PERSISTENCE_WRITE_FAILED", error);
  }
  // macOS の /bin/bash は 3.2 で、起動時に zsh 移行バナーを出して最初の read を汚す。darwin かつ bash の
  // ときだけ -e で環境変数を渡して抑止する。-e は tmux>=3.2 が必要だが macOS の Homebrew tmux は常に該当。
  // （古い tmux<3.2 が残る Linux/WSL で -e を渡すと new-session が落ちるため、darwin 限定にする。）
  const banner =
    process.platform === "darwin" && path.basename(shell) === "bash"
      ? ["-e", "BASH_SILENCE_DEPRECATION_WARNING=1"]
      : [];
  // 並行性対策: 複数エージェントが同時に名前なし open すると autoName が同じ t{i} を返し得る（TOCTOU）。
  // 自動採番は初回のみ読みやすい t{i}、衝突したら乱数 nonce 名でリトライする（線形リトライは高並行で
  // 全員が同じ空き番号に殺到してスケールしない）。明示名は既存ならエラー（呼び手責任＝意図的共有と区別）。
  const explicit = !!name;
  let nm = name || autoName();
  assertSessionName(nm);
  for (let attempt = 0; ; attempt++) {
    if (attempt >= 20) throw new AitermError("openSession: 自動採番のリトライ上限（tmux new-session が重複以外で失敗し続けている可能性）", 2);
    if (sessionExists(nm)) {
      if (explicit) throw new AitermError(`session '${nm}' は既に存在します（list で確認）`, 2);
    } else {
      const r = tmux("new-session", "-d", "-s", nm, ...banner, "-f", "/dev/null", shell);
      if (r.code === 0) break;
      // 自動採番かつ「重複名」由来の失敗（他エージェントが同名を先に取った）なら次名でリトライ。
      const dup = /duplicate|already exists/i.test(r.stderr);
      if (explicit || !dup) throw new AitermError("tmux new-session 失敗: " + r.stderr.trim(), 2);
    }
    nm = nonceName();
    assertSessionName(nm);
  }
  // 新規セッションの .log は必ず truncate する。"a"（追記）だと外部 kill / killAll / クラッシュで
  // 同名 session だけ消えて .log が残った場合、offset=0 と相まって旧出力を新規として返す（B5）。
  // break は new-session 成功後にのみ到達＝作りたての空 session ゆえ切り詰めは安全。lastcmd/mark 残骸も掃除。
  try {
    fs.writeFileSync(logpath(nm), "");
  } catch (error) {
    ownTelemetryFailure("AITERM.PERSISTENCE_WRITE_FAILED", error);
  }
  for (const p of [lastcmdpath(nm), markpath(nm)]) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* noop */
    }
  }
  cleanupAgentState(nm);
  // pipe-pane の引数は tmux 内部の /bin/sh -c で再解釈される（argv ではない）。パスは単一引用符で包み、
  // パス自身の ' は '\'' イディオムでエスケープする（名前は検証済みだが、Windows ユーザー名 O'Brien 等が
  // 一時パスに ' を持ち込み redirect を壊すのを防ぐ。空白対策も兼ねる）。Windows は WSL から見える /mnt/c 形へ。
  const pipeTarget = isWin ? toWslPath(logpath(nm)) : logpath(nm);
  const quoted = `'${pipeTarget.replace(/'/g, "'\\''")}'`;
  const pr = tmux("pipe-pane", "-t", nm, "-o", `cat >> ${quoted}`);
  if (pr.code !== 0) {
    // 配管に失敗した session は pty_read が永遠に空を返す＝成功を装わない。作った session を片付けて明示エラー。
    try { tmuxCleanup("kill-session", "-t", nm); } catch { /* cleanup failure is not a second observation */ }
    try {
      fs.unlinkSync(logpath(nm)); // B14: 直前に作った空 .log も残さない
    } catch {
      /* noop */
    }
    ownTelemetryFailure(
      "AITERM.PERSISTENCE_WRITE_FAILED",
      new AitermError("tmux pipe-pane 失敗（出力ログを配管できないため session を破棄）: " + pr.stderr.trim(), 2),
      2,
    );
  }
  try {
    writeOffset(nm, 0);
  } catch (error) {
    ownTelemetryFailure("AITERM.PERSISTENCE_WRITE_FAILED", error);
  }
  return [nm, attachHint(nm)];
}

export interface SendOpts {
  enter?: boolean;
  mark?: boolean;
  force?: boolean;
  rtk?: boolean;
  raw?: boolean;
  /** agent operation markerを保つ内部送信境界。MCPの公開引数にはしない。 */
  preserveAgentOperation?: boolean;
  /**
   * paste-buffer に -p を付け、pane が bracketed paste mode を要求している時だけ
   * ESC[200~/201~ で包んで貼る（tmux 側で negotiation されるため未対応 pane へは素通し）。
   * agent TUI への prompt 投入専用: TUI が paste を原子的に扱い、チャンク境界での
   * キー解釈（文字化け・Enter 取り落とし）を抑える。通常シェル送信の行単位実行の
   * 挙動を変えないため、公開引数にはせず agent dispatch 経路だけが立てる。
   */
  bracketedPaste?: boolean;
}

function prepareSendText(text: string, o: Pick<SendOpts, "raw" | "force">): string {
  if (!o.raw) text = text.replace(PASTE_MARKERS_RE, "").replace(ANSI_RE, "").replace(CTRL_RE, "");
  if (!o.force) assertNotDestructive(text, 3);
  assertSendTextSize(text);
  return text;
}

function assertManagedClaudeCredentialCommandNotSent(name: string, text: string): void {
  const meta = tryLoadAgentMetadata(name);
  if (meta?.kind !== "claude") return;
  const normalized = text.replace(PASTE_MARKERS_RE, "").replace(ANSI_RE, "").replace(CTRL_RE, "").trim();
  if (!/^\/(?:login|logout)$/i.test(normalized)) return;
  throw new AitermError(
    "managed Claude sessionでは共有認証を変更する /login と /logout を送信できません。" +
      "認証操作は通常端末で一度だけ行い、必要ならこのsessionをcloseして起動し直してください。",
    2,
  );
}

export function send(name: string, text: string, o: SendOpts = {}): string {
  assertSessionName(name);
  const enter = o.enter ?? true;
  if (!sessionExists(name)) throw new AitermError(`session '${name}' が無い（open してください）`, 2);
  assertInitialPromptNotPendingForSend(name, !!o.force);
  assertManagedClaudeCredentialCommandNotSent(name, text);
  text = prepareSendText(text, o);
  if (o.mark) {
    // mark の sentinel は POSIX シェル構文。前面が fish/csh/tcsh 等の非 POSIX 対話シェルだと "$?" が
    // 壊れて sentinel が成立しない。黙って壊れた完了検出を作らず、明示エラーで until を促す（B8）。
    const fg = paneCurrentCommand(name);
    if (NON_POSIX_MARK_SHELLS.has(fg)) {
      throw new AitermError(
        `mark は POSIX シェル(bash/sh/zsh/dash)前提です。前面が ${fg} のため sentinel の "$?" が` +
          `正しく展開されません。until で完了パターンを指定してください。`,
        2,
      );
    }
  }
  const releaseSendLock = acquireSessionSendFileLock(name);
  try {
    // managed Claudeの通常送信は、lastcmd/mark/PTYのどれにも触れる前に拒否する。
    // 拒否した呼び出しが古いmarkを消したり偽のmarkを残すと、後続readが存在しない
    // sentinelを待つため、公開上の拒否は副作用ゼロでなければならない。
    if (!o.preserveAgentOperation && managedClaudeOperation(name) !== undefined) {
      throw new AitermError(
        "managed Claude agent sessionへの通常送信はturn境界を失うため拒否します。" +
          "pty_send（forceなし＝自動dispatch）を使うか、通常対話へ切り替えるならsessionをcloseしてpty_openから手動起動し直してください。",
        2,
      );
    }
    writeLastcmd(name, text); // read rtk の reducer 分類用（書換/mark 前の素のコマンド）
    if (o.rtk) text = rtkRewrite(text);
    if (o.rtk && !o.force) assertNotDestructive(text, 3, "rtk 変換後: ");
    if (o.mark) text = text + `; printf '\\n<<<AITERM_DONE rc=%d>>>\\n' "$?"`;
    assertSendTextSize(text, o.rtk || o.mark ? "変換後の送信文字列" : "送信文字列");
    const reportedText = text;
    if (!o.raw && text.includes("\n") && ATOMIC_MULTILINE_SHELLS.has(paneCurrentCommand(name))) {
      text = atomicShellMultiline(text);
    }
    if (o.mark) {
      try {
        fs.writeFileSync(markpath(name), "1"); // waitCompletion に sentinel 完了検出を有効化させる
      } catch {
        /* noop（フラグ書けなくても until/quiescence 経路は生きる） */
      }
    } else {
      // 非 mark 送信は、未消化の古い mark 完了待ちを無効化する（前コマンドの sentinel を待ち続けない）。
      try {
        fs.unlinkSync(markpath(name));
      } catch {
        /* noop */
      }
    }
    // `send-keys -l`と単発`paste-buffer`は、長文をPTY入力queueへ一度に流し、macOS CIで
    // 途中以降が欠落しても tmux 自体は code=0 を返した。macOSだけUTF-8を壊さない256byte以下に分け、
    // Linux/WSLは一括のままとする。全chunk＋Enterはsession単位のcross-process lock内で直列化する。
    const pasteSupportsNoSanitize = pasteBufferSupportsNoSanitizeFlag();
    const chunks = splitPtyText(text);
    const bufferBase = `aiterm-${process.pid}-${randomBytes(8).toString("hex")}`;
    for (let i = 0; i < chunks.length; i += 1) {
      const bufferName = `${bufferBase}-${i}`;
      const partial =
        i > 0
          ? " 先行chunkはPTYに入力済みでEnterは未送信です。再送前に入力を確認・消去してください。"
          : "";
      const loaded = tmuxWithInput(chunks[i], "load-buffer", "-b", bufferName, "-");
      if (loaded.code !== 0) {
        tmuxCleanup("delete-buffer", "-b", bufferName);
        throw new AitermError(
          `tmux bufferへの送信準備に失敗しました` +
            `（chunk ${i + 1}/${chunks.length}）: ${loaded.stderr.trim() || `code=${loaded.code}`}.${partial}`,
          2,
        );
      }
      // -r: LF→CR 置換を無効化。-Sは対応新版だけでvis(3)制御文字変換を無効化する。
      // send 自身の raw/sanitize 契約だけを真実とし、tmux 側で黙って再変換させない。
      const pasteArgs = ["paste-buffer", "-d", "-r"];
      if (o.bracketedPaste) pasteArgs.push("-p");
      if (pasteSupportsNoSanitize) pasteArgs.push("-S");
      pasteArgs.push("-b", bufferName, "-t", name);
      const pasted = tmux(...pasteArgs);
      if (pasted.code !== 0) {
        // paste 失敗時は -d で消えないbufferを明示的に掃除する。元エラーを優先する。
        tmuxCleanup("delete-buffer", "-b", bufferName);
        throw new AitermError(
          `tmux bufferのPTY送信に失敗しました` +
            `（chunk ${i + 1}/${chunks.length}）: ${pasted.stderr.trim() || `code=${pasted.code}`}.${partial}`,
          2,
        );
      }
    }
    if (enter) {
      const entered = tmux("send-keys", "-t", name, "Enter");
      if (entered.code !== 0) {
        throw new AitermError(
          `文字列はPTYに入力済みですがtmuxへEnterを送れませんでした: ` +
            `${entered.stderr.trim() || `code=${entered.code}`}。再送前に入力を確認・消去してください`,
          2,
        );
      }
    }
    // コードポイント数で数える（JS の .length は UTF-16 単位で絵文字等がズレる。Python は len()=コードポイント）。
    return `sent ${[...reportedText].length} chars to ${name}` + (enter ? " (+Enter)" : "");
  } finally {
    releaseSendLock();
  }
}

export function sendKey(name: string, key: string, o: { preserveAgentOperation?: boolean } = {}): string {
  assertSessionName(name);
  if (!sessionExists(name)) throw new AitermError(`session '${name}' が無い`, 2);
  const k = KEYMAP[key.toLowerCase()] ?? key;
  if (!o.preserveAgentOperation && managedClaudeOperation(name) !== undefined && k !== "C-c") {
    throw new AitermError(
      "managed Claude agent sessionではturn相関を壊さないC-cだけをpty_keyで送れます。" +
        "他の対話操作はpty_send（自動dispatch）、終了はpty_closeを使ってください。",
      2,
    );
  }
  tmux("send-keys", "-t", name, k);
  return `sent key ${k} to ${name}`;
}

export interface ReadOpts {
  wait?: boolean;
  until?: string | null;
  untilRegex?: boolean; // until を正規表現として扱う（既定 false＝リテラル部分一致）。B4。
  timeout?: number;
  screen?: boolean;
  full?: boolean;
  lines?: number | null;
  range?: [number, number | null] | null;
  raw?: boolean;
  rtk?: boolean;
}

// end 以下で最大の UTF-8 文字境界を返す（B3）。末尾が不完全なマルチバイト列なら、その開始位置まで
// 戻す。pipe-pane が多バイト文字の途中でフラッシュした瞬間の増分読みで先頭/末尾が U+FFFD 化するのを防ぐ。
export function utf8SafeEnd(buf: Buffer, end: number): number {
  if (end <= 0) return 0;
  const isCont = (b: number) => (b & 0xc0) === 0x80; // 継続バイト 10xxxxxx
  let i = end - 1;
  let steps = 0;
  while (i >= 0 && isCont(buf[i]) && steps < 3) {
    i--;
    steps++;
  }
  if (i < 0) return end; // 継続バイトのみの異常列: そのまま
  const lead = buf[i];
  let need: number;
  if (lead < 0x80) need = 1;
  else if ((lead & 0xe0) === 0xc0) need = 2;
  else if ((lead & 0xf0) === 0xe0) need = 3;
  else if ((lead & 0xf8) === 0xf0) need = 4;
  else return end; // 不正な先行バイト: そのまま（stripControl 等に委ねる）
  return end - i >= need ? end : i; // 末尾文字が完結していれば end、不完全なら開始位置まで戻す
}

/** 途中 offset から読んだ Buffer の先頭にある UTF-8 継続バイトを最大3バイト捨てる。 */
export function utf8SafeSliceStart(buf: Buffer): Buffer {
  let start = 0;
  while (start < buf.length && start < 3 && (buf[start] & 0xc0) === 0x80) start++;
  return buf.subarray(start);
}

export async function readOutput(name: string, o: ReadOpts = {}): Promise<string> {
  assertSessionName(name);
  const timeout = o.timeout ?? DEFAULT_TIMEOUT;
  if (!sessionExists(name) && !fs.existsSync(logpath(name))) throw new AitermError(`session '${name}' が無い`, 2);

  // wait は screen より先に処理する。従来 screen は wait ブロックの手前で return し、screen+wait で
  // 完了検出が黙殺されていた（B11）。先に待ってから最終スクリーンを撮る＝TUI の描画完了後に読める。
  let status: string | null = null;
  if (o.wait) {
    const [, st] = await waitCompletion(name, o.until ?? null, o.untilRegex ?? false, timeout);
    status = st;
  }

  if (o.screen) {
    const rawTxt = captureScreen(name, o.lines || 0);
    if (o.raw) return rawTxt;
    const [body, meta] = reduceOutput(rawTxt, name, true);
    return body + "\n" + meta + agentReadMetadataSuffix(name, rawTxt) + (status ? completionSuffix(status) : "");
  }

  // ログ全体を毎回メモリに載せず、必要な範囲だけ fd で読む（B7）。size は statSync で取る。
  let size = 0;
  try {
    size = fs.statSync(logpath(name)).size;
  } catch {
    size = 0;
  }
  const readRange = (from: number, to: number): Buffer => {
    const len = Math.max(0, to - from);
    if (len === 0) return Buffer.alloc(0);
    let fd: number | undefined;
    try {
      fd = fs.openSync(logpath(name), "r");
      const buf = Buffer.alloc(len);
      const n = fs.readSync(fd, buf, 0, len, from);
      return n === len ? buf : buf.subarray(0, Math.max(0, n));
    } catch {
      return Buffer.alloc(0);
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {
          /* noop */
        }
      }
    }
  };

  let text: string;
  let nextOffset = size; // 既定/full は offset を末尾へ
  if (o.full || o.range) {
    // full/range は全体が対象だが、巨大ログは末尾 MAX_FULL_BYTES に制限してメモリを守る（B7）。
    let from = 0;
    if (size > MAX_FULL_BYTES) from = size - MAX_FULL_BYTES;
    text = utf8SafeSliceStart(readRange(from, size)).toString("utf8");
    if (from > 0) text = `[… 先頭 ${from} バイトを省略（ログがサイズ上限を超過。close で破棄されます）…]\n` + text;
    if (o.range) {
      const [lo, hi] = o.range;
      text = text.split("\n").slice(lo, hi ?? undefined).join("\n");
    } else if (o.lines) {
      // full + lines は末尾 N 行にする（従来は full 経路で lines を黙殺していた footgun・B11）。
      text = text.split("\n").slice(-o.lines).join("\n");
    }
  } else {
    let off = readOffset(name);
    // WSL 再起動等でログが作り直されると、Windows 側に残った旧 offset が新ログ長を超え、
    // 空を返して「何も読めない」状態になる。末尾越えは先頭から読み直す（POSIX では no-op）。
    if (off > size) off = 0;
    const initial = readRange(off, size); // 増分のみをメモリに載せる
    const buf = utf8SafeSliceStart(initial);
    // 先頭の継続バイトは捨て、末尾の不完全マルチバイト列は次回へ持ち越す（B3）。
    const safeLen = utf8SafeEnd(buf, buf.length);
    text = buf.subarray(0, safeLen).toString("utf8");
    nextOffset = off + (initial.length - buf.length) + safeLen;
    if (o.lines) text = text.split("\n").slice(-o.lines).join("\n");
  }

  if (!o.range) writeOffset(name, nextOffset);

  if (o.raw) return text.endsWith("\n") ? text : text + "\n";

  if (o.rtk) {
    // コマンド別 reducer（自前移植）を観測出力へ適用
    const cmd = readLastcmd(name);
    if (cmd.trim()) {
      const framed = rtk.stripShellFrame(stripControl(text), cmd);
      const [reduced, rname] = rtk.reduce(cmd, framed);
      if (reduced !== null) {
        const meta = `[aiterm ${name}: rtk:${rname} 適用 / ~${estimateTokens(reduced)} tok (raw ~${estimateTokens(text)} tok)]`;
        const agentMeta = agentReadMetadataSuffix(name);
        if (status) return reduced + "\n" + meta + agentMeta + completionSuffix(status);
        return reduced + "\n" + meta + agentMeta;
      }
    }
    // reducer 非該当 → 汎用削減へフォールバック
  }

  const [body, meta] = reduceOutput(text, name, !o.range);
  const agentMeta = agentReadMetadataSuffix(name);
  if (status) return body + "\n" + meta + agentMeta + completionSuffix(status);
  return body + "\n" + meta + agentMeta;
}

export function listSessions(): string {
  const r = tmux(
    "list-sessions",
    "-F",
    "#{session_name}\t#{pane_current_command}\t#{?session_attached,attached,detached}\t#{window_width}x#{window_height}",
  );
  if (r.code === 0 && r.stdout.trim()) {
    return r.stdout
      .replace(/\s+$/, "")
      .split("\n")
      .map((line) => {
        const name = line.split("\t", 1)[0];
        const meta = tryLoadAgentMetadata(name);
        if (!meta) return line;
        const agent = [
          `agent=${meta.kind}`,
          "agent_done=true",
          meta.write_scope === undefined ? null : `write_scope=${JSON.stringify(meta.write_scope)}`,
          meta.vendor_session_id ? `vendor_session_id=${meta.vendor_session_id}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        return `${line}\t${agent}`;
      })
      .join("\n");
  }
  return "(セッション無し)";
}

// factory diagnostics 用の安全な状態語彙。通常の未設定と、状態を安全に確定できない失敗を混同しない。
export type DiagnosticStatus = "ready" | "not_applicable" | "unverified";

/**
 * `pty_list` 相当を read-only に照会し、内容を返さず session 件数だけを返す。
 * session 名・前面コマンド・PTY 出力を診断応答へ持ち出さないため、factory が安全に readiness を
 * 見られる。socket 不在は「セッション未設定」であって障害ではない。
 */
export function readOnlyPtyListDiagnostic(runTmux = tmux): { status: DiagnosticStatus; session_count: number | null } {
  try {
    const r = runTmux("list-sessions", "-F", "#{session_name}");
    if (r.code === 0) {
      return { status: "ready", session_count: r.stdout.split(/\r?\n/).filter(Boolean).length };
    }
    // tmux は専用 socket に server がいない通常状態を exit 1 で返す。その他の失敗を「空」と
    // 偽装しないため、メッセージを公開せず unverified に留める。
    if (/no server running|failed to connect/i.test(r.stderr)) {
      return { status: "not_applicable", session_count: null };
    }
  } catch {
    // tmux 未導入・WSL bridge 不全等。絶対 path や生 stderr を診断 JSON に出さない。
  }
  return { status: "unverified", session_count: null };
}

function closeSessionInternal(name: string, observeDependency = true): string {
  assertSessionName(name);
  {
    // 別プロセスの待機は in-memory Set に映らない。生きた file lock があれば close で state を消さない
    const foreign = liveWaitLocks(name);
    if (foreign.length > 0) {
      const d = foreign[0];
      throw new AitermError(
        `agent session '${name}' は別プロセス${d.pid != null ? `（pid ${d.pid}）` : ""}の agent_done 待機中のため close できません`,
        2,
      );
    }
  }
  {
    const sending = liveSendLocks(name);
    if (sending.length > 0) {
      const d = sending[0];
      throw new AitermError(
        `session '${name}' は別プロセス${d.pid != null ? `（pid ${d.pid}）` : ""}の送信中のため close できません`,
        2,
      );
    }
  }
  (observeDependency ? tmux : tmuxCleanup)("kill-session", "-t", name);
  for (const p of [logpath(name), offsetpath(name), lastcmdpath(name), markpath(name), sendLockPath(name)]) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* noop */
    }
  }
  cleanupAgentState(name);
  return `closed ${name}`;
}

export function closeSession(name: string): string {
  return closeSessionInternal(name, true);
}

export type PtyCloseResult = {
  schema: "aiterm.pty-close-result.v1";
  session_id: string;
  outcome: "closed" | "already_closed";
};

/**
 * Durable caller向けのclose receipt。
 *
 * closeSessionInternalのidempotent cleanupは維持し、呼出時点でtmux sessionが
 * 存在したかだけを固定語彙で返す。MCP response loss後も同じsession IDで再試行すれば
 * already_closedとなり、close完了を文字列解析なしで確定できる。
 */
export function closeSessionResult(name: string): PtyCloseResult {
  assertSessionName(name);
  const existed = sessionExists(name);
  closeSessionInternal(name, true);
  return {
    schema: "aiterm.pty-close-result.v1",
    session_id: name,
    outcome: existed ? "closed" : "already_closed",
  };
}

export function killAll(): string {
  {
    // 別プロセスの待機（file lock が生きているもの）も巻き添えにしない
    const foreign = liveWaitLocks(null);
    if (foreign.length > 0) {
      const list = foreign.map((d) => `${d.session}${d.pid != null ? `(pid ${d.pid})` : ""}`).join(",");
      throw new AitermError(`agent_done 待機中の session があるため killAll できません: ${list}`, 2);
    }
  }
  {
    const sending = liveSendLocks(null);
    if (sending.length > 0) {
      const list = sending.map((d) => `${d.session}${d.pid != null ? `(pid ${d.pid})` : ""}`).join(",");
      throw new AitermError(`送信中の session があるため killAll できません: ${list}`, 2);
    }
  }
  tmux("kill-server");
  // B9: SOCKDIR 内の .log/.offset/.lastcmd/.mark/.send.lock 残骸も掃除する。
  try {
    for (const f of fs.readdirSync(SOCKDIR)) {
      if (/\.(log|offset|lastcmd|mark)$/.test(f) || f.endsWith(".send.lock")) {
        try {
          fs.unlinkSync(path.join(SOCKDIR, f));
        } catch {
          /* noop */
        }
      }
    }
  } catch {
    /* SOCKDIR 不在等は無視 */
  }
  const adir = existingAgentsDir();
  if (adir) {
    try {
      for (const f of fs.readdirSync(adir)) {
        if (
          f.endsWith(".agent.json") ||
          f.endsWith(".events.jsonl") ||
          f.endsWith(".wait.lock") ||
          f.endsWith(".claude-settings.json") ||
          f.endsWith(".claude-mcp.json") ||
          f.endsWith(".claude-result.json") ||
          f.endsWith(".claude-operation.json") ||
          f.endsWith(".claude-dispatch") ||
          f.endsWith(".codex-home") ||
          f.endsWith(".grok-home") ||
          f.endsWith(".home")
        ) {
          try {
            fs.rmSync(path.join(adir, f), { recursive: true, force: true });
          } catch {
            /* noop */
          }
        }
      }
    } catch {
      /* agent state dir 不在等は無視 */
    }
  }
  agentMetadataNegativeCache.clear();
  return "killed all sessions on this socket";
}

// ── agent_done: vendor の構造化完了記録を PTY 送信の完了境界として使う ────
interface AgentMetadata {
  kind: AgentKind;
  aiterm_session: string;
  launch_id: string;
  event_file: string;
  created_at: string;
  cwd: string | null;
  // launcher の能力宣言。省略時は能力制限なし。
  write_scope?: string;
  vendor_session_id: string | null;
  initial_prompt: InitialPromptState;
  launch_operation_id?: string | null;
  launch_request_digest?: string | null;
  hook_route: "shared_claude_settings" | "shared_codex_home" | "shared_grok_home";
  completion_route?: "codex_transcript" | "grok_transcript";
  agent_role?: "subagent";
  parent_session_id?: string;
  delegation_depth?: number;
  lineage?: string;
  delegation_allowed?: true;
  node_platform: NodeJS.Platform;
  codex_home?: string;
  claude_settings?: string;
  result_file?: string;
  grok_home?: string;
  grok_auth_path?: string | null;
}

interface AgentLineageContext {
  agentRole: "subagent";
  parentSessionId: string;
  delegationDepth: number;
  lineage: string;
  delegationAllowed: true;
}

interface AgentLineageSeed {
  parentSessionId: string;
  delegationDepth: number;
  lineagePrefix: string;
}

function readAgentLineageSeed(): AgentLineageSeed {
  const role = process.env.AITERM_AGENT_ROLE;
  const session = process.env.AITERM_AGENT_SESSION_ID;
  const depthRaw = process.env.AITERM_AGENT_DEPTH;
  const lineage = process.env.AITERM_AGENT_LINEAGE;
  const delegationAllowed = process.env.AITERM_AGENT_DELEGATION_ALLOWED;
  const nested = [role, session, depthRaw, lineage, delegationAllowed].some((value) => value !== undefined);
  if (!nested) {
    return { parentSessionId: "host-root", delegationDepth: 1, lineagePrefix: "host-root" };
  }
  if (
    role !== "subagent" ||
    delegationAllowed !== "true" ||
    !session ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(session) ||
    !depthRaw ||
    !/^\d+$/.test(depthRaw) ||
    !lineage ||
    lineage.length > 4096 ||
    !AGENT_LINEAGE_RE.test(lineage)
  ) {
    throw new AitermError("継承したAITERM sub-agent lineage環境が不正です", 2);
  }
  const parentDepth = Number(depthRaw);
  if (!Number.isSafeInteger(parentDepth) || parentDepth < 1 || parentDepth >= 1_000_000) {
    throw new AitermError("継承したAITERM_AGENT_DEPTHが不正です", 2);
  }
  return { parentSessionId: session, delegationDepth: parentDepth + 1, lineagePrefix: lineage };
}

function createAgentLineageContext(
  kind: AgentKind,
  sessionId: string,
  seed: AgentLineageSeed,
): AgentLineageContext {
  const lineage = `${seed.lineagePrefix}>${kind}:${sessionId}`;
  if (lineage.length > 4096 || !AGENT_LINEAGE_RE.test(lineage)) {
    throw new AitermError("AITERM sub-agent lineageが上限または形式に違反しました", 2);
  }
  return {
    agentRole: "subagent",
    parentSessionId: seed.parentSessionId,
    delegationDepth: seed.delegationDepth,
    lineage,
    delegationAllowed: true,
  };
}

function agentLineageFields(context: AgentLineageContext): Pick<
  AgentMetadata,
  "agent_role" | "parent_session_id" | "delegation_depth" | "lineage" | "delegation_allowed"
> {
  return {
    agent_role: context.agentRole,
    parent_session_id: context.parentSessionId,
    delegation_depth: context.delegationDepth,
    lineage: context.lineage,
    delegation_allowed: context.delegationAllowed,
  };
}

function subagentInstruction(meta: AgentMetadata): string {
  if (
    meta.agent_role !== "subagent" ||
    !meta.parent_session_id ||
    !Number.isSafeInteger(meta.delegation_depth) ||
    !meta.lineage ||
    meta.delegation_allowed !== true
  ) {
    throw new AitermError("sub-agent instructionに必要なlineage metadataがありません", 2);
  }
  return [
    "<aiterm_subagent_context>",
    "あなたはaitermから起動されたsub-agentであり、root agentではありません。",
    `AITERM_AGENT_LAUNCH_ID=${meta.launch_id}`,
    `role=${meta.agent_role}`,
    `parent_session_id=${meta.parent_session_id}`,
    `delegation_depth=${meta.delegation_depth}`,
    `lineage=${meta.lineage}`,
    "delegation_allowed=true",
    "任務の所有権を保ち、結果を親へ返してください。必要なら追加のsub-agentへ委譲してよいです。",
    "ただし、同じ任務全体を同型agentへ反射的に丸投げして自己複製ループを作らないでください。",
    "</aiterm_subagent_context>",
  ].join("\n");
}

interface AgentDoneEvent {
  type: "agent_done";
  vendor: AgentKind;
  aiterm_session: string;
  launch_id: string;
  vendor_session_id: string | null;
  turn_id: string | null;
  operation_id: string | null;
  reason: string;
  done_status: "turn_done";
  stop_hook_active?: boolean;
  result_digest?: string;
  result_bytes?: number;
  at: string;
}

interface ClaudeOperationMarker {
  operationId: string | null;
}

export interface ClaudeOperationResult {
  schema: "aiterm.claude-operation-result.v1";
  action: "issue" | "recover";
  status: "accepted" | "pending" | "completed" | "unknown";
  session_id: string;
  operation_id: string;
  raw_output: string | null;
  reason: "operation_not_found" | "result_unknown" | null;
  // issue時のみdispatch由来のsubmit座礁観測を載せる（recover等はnull）。falseは成立の保証ではない。
  submit_residue: boolean | null;
}

export type ClaudeApprovalDecision = "approve_once" | "deny";

export interface ClaudeApprovalChoice {
  decision: ClaudeApprovalDecision;
  index: number;
  label: string;
}

export interface ClaudeApprovalResult {
  schema: "aiterm.claude-approval-result.v1";
  action: "inspect" | "respond";
  status: "approval_required" | "submitted";
  session_id: string;
  operation_id: string | null;
  prompt_digest: string;
  choices: ClaudeApprovalChoice[];
  selected_choice: ClaudeApprovalDecision | null;
  at: string;
}

interface AgentDoneParseResult {
  event: AgentDoneEvent | null;
  malformed: boolean;
}

interface AgentDoneWaitResult {
  event: AgentDoneEvent | null;
  malformedEvents: number;
}

interface AgentDoneScanResult extends AgentDoneWaitResult {
  ambiguousVendorSession: boolean;
}

interface AgentScreenSample {
  screen: string;
  logSize: number;
}

interface AgentScreenSettleResult {
  unstable: boolean;
  samples: number;
}

interface AgentTuiReadyWaitResult {
  ready: boolean;
  samples: number;
  lastScreen: string;
}


const DEFAULT_AGENT_DONE_TIMEOUT = 600;
const agentMetadataNegativeCache = new Map<string, number>();
let agentTuiReadyStableSamplesTestOverride: number | null = null;


function claudeHookScriptPath(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "claude-stop-hook.js");
}

// process.execPath は Homebrew 等では Cellar の版付き実体を指す。長寿命 MCP server の起動後に
// runtime が更新されるとその実体だけが消え、既に生成済みの hook が exit 127 になる。
// hook は server と同じ継承 PATH から node を毎回解決し、安定した package script を実行する。
function nodeHookCommand(hookScript: string): string {
  return `${shq("node")} ${shq(hookScript)}`;
}

function safeStatSize(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

function readFileRange(p: string, from: number, to: number): Buffer {
  const len = Math.max(0, to - from);
  if (len === 0) return Buffer.alloc(0);
  let fd: number | undefined;
  try {
    fd = fs.openSync(p, "r");
    const buf = Buffer.alloc(len);
    const n = fs.readSync(fd, buf, 0, len, from);
    return n === len ? buf : buf.subarray(0, Math.max(0, n));
  } catch {
    return Buffer.alloc(0);
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        /* noop */
      }
    }
  }
}

function writeJson0600(p: string, v: unknown): void {
  // truncate-in-place はクラッシュ/ENOSPC の窓で空・途中 JSON を残すので、temp→rename の原子的置換にする
  const tmp = `${p}.${randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  try {
    fs.chmodSync(tmp, 0o600);
  } catch {
    /* noop */
  }
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* noop */
    }
    throw e;
  }
}

function writeText0600(p: string, text: string): void {
  fs.writeFileSync(p, text, { mode: 0o600 });
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* noop */
  }
}

function createEmpty0600NoFollow(p: string): void {
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  const fd = fs.openSync(
    p,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | nofollow,
    0o600,
  );
  fs.closeSync(fd);
}

function realCodexHome(): string {
  return process.env.CODEX_HOME || path.join(process.env.HOME ?? os.homedir(), ".codex");
}

// config.toml の top-level model / model_reasoning_effort ピンを起動報告用に読む。TOML パーサは
// 持ち込まず基本形（key = "値"）だけ解決する。行はあるが値を解析できない場合も「継承あり」として
// 正直に報告する（黙って CLI 既定扱いにしない）。
type CodexConfigPin = { present: boolean; value: string | null };
function readCodexConfigPins(configPath: string): { model: CodexConfigPin; effort: CodexConfigPin } {
  let body: string;
  try {
    body = fs.readFileSync(configPath, "utf8");
  } catch {
    return { model: { present: false, value: null }, effort: { present: false, value: null } };
  }
  const rows = body.split(/\r?\n/);
  let firstTable = rows.findIndex((l) => /^\s*\[/.test(l));
  if (firstTable === -1) firstTable = rows.length;
  const pick = (key: string): CodexConfigPin => {
    for (const l of rows.slice(0, firstTable)) {
      const m = l.match(new RegExp(`^\\s*(?:"${key}"|'${key}'|${key})\\s*=\\s*(.*)$`));
      if (m) {
        const v = m[1].trim().match(/^"([^"\\]*)"\s*(?:#.*)?$/);
        return { present: true, value: v ? v[1] : null };
      }
    }
    return { present: false, value: null };
  };
  return { model: pick("model"), effort: pick("model_reasoning_effort") };
}

function codexConfigSummary(configPath: string): string {
  let body: string;
  try {
    body = fs.readFileSync(configPath, "utf8");
  } catch {
    return "";
  }
  const rows = body.split(/\r?\n/);
  const mcpServers = rows.filter((line) => /^\s*\[mcp_servers\./.test(line)).length;
  const firstTable = rows.findIndex((line) => /^\s*\[/.test(line));
  const topLevel = rows.slice(0, firstTable === -1 ? rows.length : firstTable);
  const valueOf = (key: string): string | null => {
    const row = topLevel.find((line) => new RegExp(`^\\s*(?:"${key}"|'${key}'|${key})\\s*=\\s*(.+?)\\s*(?:#.*)?$`).test(line));
    if (!row) return null;
    const raw = row.match(/=\s*(.+?)(?:\s+#.*)?$/)?.[1].trim() ?? null;
    if (!raw) return null;
    const quoted = raw.match(/^(?:"([^"\\]*)"|'([^'\\]*)')$/);
    return quoted ? quoted[1] ?? quoted[2] : raw;
  };
  const bits = [`mcp_servers ${mcpServers} 個継承`];
  const approvalPolicy = valueOf("approval_policy");
  const sandboxMode = valueOf("sandbox_mode");
  if (approvalPolicy) bits.push(`approval_policy=${approvalPolicy}`);
  if (sandboxMode) bits.push(`sandbox_mode=${sandboxMode}`);
  return `共有 config: ${bits.join(" / ")}`;
}

function createClaudeCorrelationSettings(name: string, launchId: string): string {
  const hookScript = claudeHookScriptPath();
  if (!fs.existsSync(hookScript)) {
    throw new AitermError(`Claude Stop hook wrapper が見つかりません。npm run build を実行してください: ${hookScript}`, 2);
  }
  const settings = agentManagedClaudeSettingsPath(name, launchId);
  writeJson0600(settings, {
    hooks: {
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: nodeHookCommand(hookScript),
              timeout: 10,
            },
          ],
        },
      ],
    },
  });
  return settings;
}

function realGrokHome(): string {
  return path.resolve(process.env.GROK_HOME || path.join(process.env.HOME ?? os.homedir(), ".grok"));
}

function resolveAndValidateGrokAuth(srcHome: string): string | null {
  const inheritedSet = Object.prototype.hasOwnProperty.call(process.env, "GROK_AUTH_PATH");
  const inherited = process.env.GROK_AUTH_PATH;
  if (inheritedSet && (!inherited || !path.isAbsolute(inherited))) throw new AitermError("GROK_AUTH_PATH は空でない絶対パスで指定してください", 2);
  const authPath = inherited ?? path.join(srcHome, "auth.json");
  let fd: number | undefined;
  try {
    fd = fs.openSync(authPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.nlink !== 1 || st.uid !== currentUid() || (st.mode & 0o077) !== 0 || st.size > GROK_AUTH_MAX_BYTES) {
      throw new AitermError("Grok 認証正本の安全検証に失敗しました", 2);
    }
    const value: unknown = JSON.parse(fs.readFileSync(fd, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new AitermError("Grok 認証正本のJSONが不正です", 2);
    // auth file 自体は O_NOFOLLOW で開いているが、中間 directory の symlink は辿り得る。
    // vendor に渡す正本を path swap の入口にしないため、字句正規化した絶対 path と realpath を
    // 一致させ、canonical な祖先も root まで検証する。same-UID race の排他は vendor lock の責務。
    const lexicalPath = path.resolve(authPath);
    const canonicalPath = fs.realpathSync(authPath);
    if (lexicalPath !== canonicalPath) throw new AitermError("Grok 認証正本の path に symlink を含められません", 2);
    for (let dir = path.dirname(canonicalPath); ; dir = path.dirname(dir)) {
      const dirSt = fs.lstatSync(dir);
      // /tmp のような root 所有 + sticky の共有 directory は、本人所有の private な
      // 直下 directory を他 UID が rename/unlink できないため許可する。sticky 無しの
      // group/other writable 祖先は path swap が可能なので従来どおり拒否する。
      const writableByOthers = (dirSt.mode & 0o022) !== 0;
      const protectedSharedRoot = dirSt.uid === 0 && (dirSt.mode & 0o1000) !== 0;
      if (
        !dirSt.isDirectory()
        || dirSt.isSymbolicLink()
        || (dirSt.uid !== currentUid() && dirSt.uid !== 0)
        || (writableByOthers && !protectedSharedRoot)
      ) {
        throw new AitermError("Grok 認証正本の祖先 directory が安全ではありません", 2);
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
    }
    return canonicalPath;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT" && !inheritedSet && process.env.XAI_API_KEY) return null;
    if (e instanceof AitermError) throw e;
    throw new AitermError((e as NodeJS.ErrnoException).code === "ENOENT" ? "Grok 認証正本が見つかりません。先に grok login が必要です" : "Grok 認証正本を安全に開けません", 2);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function writeAgentMetadata(meta: AgentMetadata): void {
  writeJson0600(agentMetadataPath(meta.aiterm_session, meta.launch_id), meta);
}

function validateOperationId(operationId: unknown): string {
  if (typeof operationId !== "string" || !OPERATION_ID_RE.test(operationId)) {
    throw new AitermError("operation_id は sha256:<64 lowercase hex> で指定してください", 2);
  }
  return operationId;
}

function writeClaudeOperationMarker(meta: AgentMetadata, operationId: string | null): void {
  if (meta.kind !== "claude") throw new AitermError("operation_id はClaude agent sessionだけで使用できます", 2);
  writeJson0600(agentClaudeOperationPath(meta.aiterm_session, meta.launch_id), {
    schema: "aiterm.claude-operation-marker.v1",
    operation_id: operationId === null ? null : validateOperationId(operationId),
  });
}

function readClaudeOperationMarker(meta: AgentMetadata): ClaudeOperationMarker | null {
  if (meta.kind !== "claude") return null;
  const file = agentClaudeOperationPath(meta.aiterm_session, meta.launch_id);
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | nofollow);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new AitermError(`Claude operation markerを確認できません: ${(error as Error).message}`, 2);
  }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.uid !== currentUid() || st.nlink !== 1 || (st.mode & 0o077) !== 0 || st.size > 1024) {
      throw new AitermError("Claude operation markerの安全検証に失敗しました", 2);
    }
    let value: any;
    try {
      value = JSON.parse(fs.readFileSync(fd, "utf8"));
    } catch {
      throw new AitermError("Claude operation markerを読めません", 2);
    }
    const keys = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
    if (
      keys.join(",") !== "operation_id,schema" ||
      value.schema !== "aiterm.claude-operation-marker.v1" ||
      (value.operation_id !== null &&
        (typeof value.operation_id !== "string" || !OPERATION_ID_RE.test(value.operation_id)))
    ) {
      throw new AitermError("Claude operation markerが不正です", 2);
    }
    return { operationId: value.operation_id };
  } finally {
    fs.closeSync(fd);
  }
}

function reserveClaudeOperation(meta: AgentMetadata, operationId: string): void {
  const validated = validateOperationId(operationId);
  const active = readClaudeOperationMarker(meta);
  if (active?.operationId === validated) {
    throw new AitermError(
      `operation ${validated} は既にdispatch済みです。再送しません。pty_read(agent_transcript:true, operation_id:...)で回収してください。`,
      2,
    );
  }
  if (active) {
    throw new AitermError(
      `${active.operationId ? `別のoperation ${active.operationId}` : "operation_idなしのClaude turn"} が未解決です。` +
        "Stop結果を回収するか、C-c後もStopが来なければsessionをcloseしてから次のoperationを送ってください。",
      2,
    );
  }
  const receipt = agentClaudeDispatchReceiptPath(meta.aiterm_session, meta.launch_id, validated);
  try {
    createEmpty0600NoFollow(receipt);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    let st: fs.Stats;
    try {
      st = fs.lstatSync(receipt);
    } catch {
      throw new AitermError("Claude dispatch receiptを確認できません", 2);
    }
    if (!st.isFile() || st.isSymbolicLink() || st.uid !== currentUid() || st.nlink !== 1 || (st.mode & 0o077) !== 0) {
      throw new AitermError("Claude dispatch receiptの安全検証に失敗しました", 2);
    }
    throw new AitermError(`operation ${validated} は既にdispatch済みです。再送しません。`, 2);
  }
  try {
    writeClaudeOperationMarker(meta, validated);
  } catch (error) {
    try { fs.unlinkSync(receipt); } catch { /* marker未作成時のrollback失敗は元エラーを優先 */ }
    throw error;
  }
}

function reserveAnonymousClaudeTurn(meta: AgentMetadata): void {
  const active = readClaudeOperationMarker(meta);
  if (active) {
    throw new AitermError(
      `${active.operationId ? `operation ${active.operationId}` : "operation_idなしのClaude turn"} が未解決です。` +
        "Stop結果を回収するかsessionをcloseするまで次のturnを送れません。",
      2,
    );
  }
  writeClaudeOperationMarker(meta, null);
}

function managedClaudeOperation(name: string): ClaudeOperationMarker | null | undefined {
  let meta: AgentMetadata;
  try {
    meta = loadAgentMetadata(name);
  } catch (error) {
    if (error instanceof AitermError && error.message.includes("agent_done 管理セッションではありません")) return undefined;
    throw error;
  }
  if (meta.kind !== "claude") return undefined;
  return readClaudeOperationMarker(meta);
}

function canonicalClaudeApprovalScreen(screen: string): string {
  return stripControl(screen)
    .split("\n")
    .map((line) => line.replace(/^\s*[❯>]\s*/, "").replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

function parseClaudeApprovalScreen(screen: string): {
  promptDigest: string;
  choices: ClaudeApprovalChoice[];
} {
  const canonical = canonicalClaudeApprovalScreen(screen);
  const lines = canonical.split("\n");
  let question = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === "Do you want to proceed?") question = i;
  }
  if (question < 0) {
    throw new AitermError("managed Claudeの承認UIを現在画面で確認できません（Do you want to proceed? がありません）", 2);
  }

  const choices: ClaudeApprovalChoice[] = [];
  const seen = new Set<ClaudeApprovalDecision>();
  for (const line of lines.slice(question + 1)) {
    const match = line.trim().match(/^(\d+)\.\s+(.+?)\s*$/);
    if (!match) continue;
    const index = Number(match[1]);
    const label = match[2];
    const decision: ClaudeApprovalDecision | null = /^yes$/i.test(label)
      ? "approve_once"
      : /^no$/i.test(label)
        ? "deny"
        : null;
    // 「常に許可」等は意図的に公開しない。単発Yes/No以外を自動操作できる契約にしない。
    if (!decision) continue;
    if (!Number.isSafeInteger(index) || index < 1 || seen.has(decision)) {
      throw new AitermError("managed Claudeの承認UI選択肢が一意に解釈できません", 2);
    }
    seen.add(decision);
    choices.push({ decision, index, label });
  }
  if (!seen.has("approve_once") || !seen.has("deny")) {
    throw new AitermError("managed Claudeの承認UIに安全な単発Yes/No選択肢を確認できません", 2);
  }
  return {
    promptDigest: `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
    choices,
  };
}

function assertExpectedClaudeOperation(
  meta: AgentMetadata,
  expectedOperationId: string | null,
): ClaudeOperationMarker {
  const active = readClaudeOperationMarker(meta);
  if (!active) throw new AitermError("managed Claudeに未解決のactive operationがありません", 2);
  if (active.operationId !== expectedOperationId) {
    const actual = active.operationId ?? "operation_idなし";
    const expected = expectedOperationId ?? "operation_idなし";
    throw new AitermError(`active operationが一致しません（expected=${expected}, actual=${actual}）`, 2);
  }
  return active;
}

export function runClaudeApproval({
  action,
  session_id: name,
  operation_id: operationIdInput,
  approval_choice: approvalChoice,
  observed_prompt_digest: observedPromptDigest,
}: {
  action: "inspect" | "respond";
  session_id: string;
  operation_id?: string | null;
  approval_choice?: ClaudeApprovalDecision;
  observed_prompt_digest?: string;
}): ClaudeApprovalResult {
  assertSessionName(name);
  if (!sessionExists(name)) throw new AitermError(`session '${name}' が無い`, 2);
  const meta = loadAgentMetadata(name);
  if (meta.kind !== "claude") throw new AitermError("claude_approvalはmanaged Claude agent sessionだけで使用できます", 2);
  const operationId = operationIdInput == null ? null : validateOperationId(operationIdInput);

  if (action === "inspect") {
    if (approvalChoice != null || observedPromptDigest != null) {
      throw new AitermError("claude_approval inspectにapproval_choice／observed_prompt_digestは指定できません", 2);
    }
    assertExpectedClaudeOperation(meta, operationId);
    const observed = parseClaudeApprovalScreen(captureScreen(name, CLAUDE_APPROVAL_SCREEN_LINES));
    return {
      schema: "aiterm.claude-approval-result.v1",
      action,
      status: "approval_required",
      session_id: name,
      operation_id: operationId,
      prompt_digest: observed.promptDigest,
      choices: observed.choices,
      selected_choice: null,
      at: new Date().toISOString(),
    };
  }

  if (action !== "respond") throw new AitermError(`claude_approval actionが不正です: ${action}`, 2);
  if (approvalChoice == null || observedPromptDigest == null) {
    throw new AitermError("claude_approval respondにはapproval_choiceとobserved_prompt_digestが必要です", 2);
  }
  if (!OPERATION_ID_RE.test(observedPromptDigest)) {
    throw new AitermError("observed_prompt_digestはsha256:<64 lowercase hex>で指定してください", 2);
  }

  const releaseSendLock = acquireSessionSendFileLock(name);
  try {
    // inspect後にoperationまたは画面が変わっていないことを、入力と同じsend lock内で再検証する。
    assertExpectedClaudeOperation(meta, operationId);
    const observed = parseClaudeApprovalScreen(captureScreen(name, CLAUDE_APPROVAL_SCREEN_LINES));
    if (observed.promptDigest !== observedPromptDigest) {
      throw new AitermError("承認UIがinspect後に変化しました。再度inspectしてから判断してください", 2);
    }
    const choice = observed.choices.find((entry) => entry.decision === approvalChoice);
    if (!choice) throw new AitermError(`承認UIに${approvalChoice}の安全な選択肢がありません`, 2);
    const sent = tmux("send-keys", "-t", name, String(choice.index), "Enter");
    if (sent.code !== 0) {
      throw new AitermError(`Claude承認入力を送れませんでした: ${sent.stderr.trim() || `code=${sent.code}`}`, 2);
    }
    const at = new Date().toISOString();
    const result: ClaudeApprovalResult = {
      schema: "aiterm.claude-approval-result.v1",
      action,
      status: "submitted",
      session_id: name,
      operation_id: operationId,
      prompt_digest: observed.promptDigest,
      choices: observed.choices,
      selected_choice: approvalChoice,
      at,
    };
    // prompt本文は保存せず、相関ID・digest・選択だけをowner-only receiptへ残す。
    writeJson0600(agentClaudeApprovalReceiptPath(name, meta.launch_id), result);
    return result;
  } finally {
    releaseSendLock();
  }
}

function hasClaudeDispatchReceipt(meta: AgentMetadata, operationId: string): boolean {
  const file = agentClaudeDispatchReceiptPath(meta.aiterm_session, meta.launch_id, operationId);
  let st: fs.Stats;
  try {
    st = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new AitermError(`Claude dispatch receiptを確認できません: ${(error as Error).message}`, 2);
  }
  if (
    !st.isFile() ||
    st.isSymbolicLink() ||
    st.uid !== currentUid() ||
    st.nlink !== 1 ||
    (st.mode & 0o077) !== 0 ||
    st.size !== 0
  ) {
    throw new AitermError("Claude dispatch receiptの安全検証に失敗しました", 2);
  }
  return true;
}

function normalizeInitialPromptState(v: unknown): InitialPromptState {
  if (v === true) return "pending";
  if (v === false || v == null) return "none";
  if (
    v === "none" ||
    v === "not_sent" ||
    v === "sent" ||
    v === "pending" ||
    v === "done" ||
    v === "failed"
  ) {
    return v;
  }
  return "none";
}

function setInitialPromptState(meta: AgentMetadata, state: InitialPromptState): void {
  meta.initial_prompt = state;
  writeAgentMetadata(meta);
}

// wait lock の鮮度猶予: lock は open(O_EXCL)→pid 書込みの2段なので、中身が読めない直後の lock を
// stale と誤判定しないための下限。これより古くて pid が読めない lock だけ残骸として回収する。
const WAIT_LOCK_FRESH_MS = 5_000;

interface WaitLockProbe {
  pid: number | null;
  at: string | null;
  live: boolean;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH=不在。EPERM 等の判定不能は生存扱い（誤回収より拒否に倒す）
    return (e as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

// wait lock が「生きた待機」か「消滅プロセスの残骸」かを判定する。
// 前提: 呼び出し側は in-memory agentWaitLocks を先に確認している。よって pid=自プロセスの lock は
// 例外経路で release が漏れた残骸と確定できる。
function probeWaitLock(p: string): WaitLockProbe {
  let pid: number | null = null;
  let at: string | null = null;
  let ageMs = 0;
  try {
    const st = fs.lstatSync(p);
    if (!st.isFile() || st.isSymbolicLink()) return { pid: null, at: null, live: true };
    ageMs = Math.max(0, Date.now() - st.mtimeMs);
    const v = JSON.parse(fs.readFileSync(p, "utf8").split("\n", 1)[0]) as { pid?: unknown; at?: unknown };
    if (typeof v.pid === "number" && Number.isInteger(v.pid) && v.pid > 0) pid = v.pid;
    if (typeof v.at === "string") at = v.at;
  } catch {
    /* pid 不明のまま鮮度判定に落ちる */
  }
  if (pid == null) return { pid: null, at, live: ageMs < WAIT_LOCK_FRESH_MS };
  if (pid === process.pid) return { pid, at, live: false };
  return { pid, at, live: isPidAlive(pid) };
}

function unlinkStaleWaitLock(p: string): void {
  try {
    const st = fs.lstatSync(p);
    const uid = typeof process.getuid === "function" ? process.getuid() : null;
    if (st.isFile() && !st.isSymbolicLink() && (uid == null || st.uid === uid)) fs.unlinkSync(p);
  } catch {
    /* noop */
  }
}

function liveSendLocks(name: string | null): Array<{ session: string; pid: number | null; at: string | null }> {
  let files: string[];
  try {
    files = fs.readdirSync(SOCKDIR);
  } catch {
    return [];
  }
  const out: Array<{ session: string; pid: number | null; at: string | null }> = [];
  for (const f of files) {
    if (!f.endsWith(".send.lock")) continue;
    const session = f.slice(0, -".send.lock".length);
    if (name != null && session !== name) continue;
    const p = path.join(SOCKDIR, f);
    const probe = probeWaitLock(p);
    if (probe.live) out.push({ session, pid: probe.pid, at: probe.at });
    // dead send lockはここでunlinkしない。probe後に別processが同pathへ新しいlive lockを作る
    // ABAが起きると、そのlive lockを消して二重owner化できる。close/killAllがsessionを止めた後に掃除する。
  }
  return out;
}

function acquireSessionSendFileLock(name: string): () => void {
  const p = sendLockPath(name);
  const token = randomBytes(16).toString("hex");
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  const deadline = Date.now() + SESSION_SEND_LOCK_WAIT_MS;
  let fd: number | null = null;
  let lastProbe: WaitLockProbe = { pid: null, at: null, live: true };
  while (fd == null) {
    try {
      fd = fs.openSync(p, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | nofollow, 0o600);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      lastProbe = probeWaitLock(p);
      if (!lastProbe.live) {
        const detail = lastProbe.pid != null ? `pid ${lastProbe.pid}` : "owner不明";
        throw new AitermError(
          `session '${name}' に前回送信のlock残骸があります（${detail}）。` +
            `自動回収は並行送信の混線を招くため行いません。pty_closeでsessionを閉じてから再作成するか、` +
            `不要な全sessionをpty_kill_allで停止して残骸を掃除してください`,
          2,
        );
      }
      if (Date.now() >= deadline) {
        const detail = lastProbe.pid != null ? `pid ${lastProbe.pid}` : "owner不明";
        throw new AitermError(
          `session '${name}' は別プロセスの送信中です（${detail}）。${SESSION_SEND_LOCK_WAIT_MS}ms待ってもlockを取得できませんでした`,
          2,
        );
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SESSION_SEND_LOCK_POLL_MS);
    }
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString(), token }) + "\n", "utf8");
  } catch (error) {
    try {
      fs.closeSync(fd);
    } catch {
      /* noop */
    }
    // pathを再確認せずunlinkすると、外部置換後のlockを消し得る。書込失敗は残骸としてfail closedし、
    // close/killAllのsession停止後cleanupへ委ねる。
    throw error;
  }
  fs.closeSync(fd);
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* Windows等でmode強制できなくてもOS user temp境界とO_EXCLは維持される */
  }
  return () => {
    try {
      const st = fs.lstatSync(p);
      if (!st.isFile() || st.isSymbolicLink()) return;
      const current = JSON.parse(fs.readFileSync(p, "utf8").split("\n", 1)[0]) as { token?: unknown };
      if (current.token === token) fs.unlinkSync(p);
    } catch {
      /* 別ownerのlockや置換済みpathは消さない */
    }
  };
}

// close/killAll 用: 生きた別プロセス待機の wait lock を列挙する（stale 残骸は数えない）。
function liveWaitLocks(name: string | null): Array<{ session: string; pid: number | null; at: string | null }> {
  const dir = existingAgentsDir();
  if (!dir) return [];
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out: Array<{ session: string; pid: number | null; at: string | null }> = [];
  for (const f of files) {
    if (!f.endsWith(".wait.lock")) continue;
    const session = f.slice(0, f.indexOf("."));
    if (name != null && session !== name) continue;
    const probe = probeWaitLock(path.join(dir, f));
    if (probe.live) out.push({ session, pid: probe.pid, at: probe.at });
  }
  return out;
}



function createClaudeAgentMetadata(
  name: string,
  cwd: string | null,
  initialPrompt: InitialPromptState,
  launchOperationId: string | null,
  launchRequestDigest: string | null,
  lineageContext: AgentLineageContext,
): AgentMetadata {
  const launchId = randomBytes(16).toString("hex");
  const eventFile = agentEventPath(name, launchId);
  const resultFile = agentClaudeResultPath(name, launchId);
  createEmpty0600NoFollow(eventFile);
  createEmpty0600NoFollow(resultFile);
  const claudeSettings = createClaudeCorrelationSettings(name, launchId);
  const meta: AgentMetadata = {
    kind: "claude",
    aiterm_session: name,
    launch_id: launchId,
    event_file: eventFile,
    created_at: new Date().toISOString(),
    cwd,
    vendor_session_id: randomUUID(),
    initial_prompt: initialPrompt,
    launch_operation_id: launchOperationId,
    launch_request_digest: launchRequestDigest,
    hook_route: "shared_claude_settings",
    ...agentLineageFields(lineageContext),
    node_platform: process.platform,
    claude_settings: claudeSettings,
    result_file: resultFile,
  };
  writeAgentMetadata(meta);
  return meta;
}

function createCodexAgentMetadata(
  name: string,
  cwd: string | null,
  initialPrompt: InitialPromptState,
  overrides: { model?: string | null; effort?: string | null } = {},
  writeScope?: string,
  lineageContext?: AgentLineageContext,
): AgentMetadata {
  const launchId = randomBytes(16).toString("hex");
  const eventFile = agentEventPath(name, launchId);
  createEmpty0600NoFollow(eventFile);
  const codexHome = realCodexHome();
  const meta: AgentMetadata = {
    kind: "codex",
    aiterm_session: name,
    launch_id: launchId,
    event_file: eventFile,
    created_at: new Date().toISOString(),
    cwd,
    ...(writeScope === undefined ? {} : { write_scope: writeScope }),
    vendor_session_id: null,
    initial_prompt: initialPrompt,
    hook_route: "shared_codex_home",
    completion_route: "codex_transcript",
    ...(lineageContext ? agentLineageFields(lineageContext) : {}),
    node_platform: process.platform,
    codex_home: codexHome,
  };
  writeAgentMetadata(meta);
  return meta;
}

function createGrokAgentMetadata(
  kind: "grok" | "composer",
  name: string,
  cwd: string | null,
  initialPrompt: InitialPromptState,
  authPath: string | null,
  writeScope?: string,
  lineageContext?: AgentLineageContext,
): AgentMetadata {
  const launchId = randomBytes(16).toString("hex");
  const eventFile = agentEventPath(name, launchId);
  createEmpty0600NoFollow(eventFile);
  const grokHome = realGrokHome();
  const meta: AgentMetadata = {
    kind,
    aiterm_session: name,
    launch_id: launchId,
    event_file: eventFile,
    created_at: new Date().toISOString(),
    cwd,
    ...(writeScope === undefined ? {} : { write_scope: writeScope }),
    vendor_session_id: randomUUID(),
    initial_prompt: initialPrompt,
    hook_route: "shared_grok_home",
    completion_route: "grok_transcript",
    ...(lineageContext ? agentLineageFields(lineageContext) : {}),
    node_platform: process.platform,
    grok_home: grokHome,
    grok_auth_path: authPath,
  };
  writeAgentMetadata(meta);
  return meta;
}

function loadAgentLineageFields(m: Partial<AgentMetadata>, required: boolean): ReturnType<typeof agentLineageFields> | {} {
  const present =
    m.agent_role !== undefined ||
    m.parent_session_id !== undefined ||
    m.delegation_depth !== undefined ||
    m.lineage !== undefined ||
    m.delegation_allowed !== undefined;
  if (!present && !required) return {};
  if (
    m.agent_role !== "subagent" ||
    typeof m.parent_session_id !== "string" ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(m.parent_session_id) ||
    !Number.isSafeInteger(m.delegation_depth) ||
    (m.delegation_depth as number) < 1 ||
    typeof m.lineage !== "string" ||
    m.lineage.length > 4096 ||
    !AGENT_LINEAGE_RE.test(m.lineage) ||
    m.delegation_allowed !== true
  ) {
    throw new AitermError("agent metadata のsub-agent lineageが不正です", 2);
  }
  return agentLineageFields({
    agentRole: "subagent",
    parentSessionId: m.parent_session_id,
    delegationDepth: m.delegation_depth as number,
    lineage: m.lineage,
    delegationAllowed: true,
  });
}

function loadAgentMetadata(name: string): AgentMetadata {
  assertSessionName(name);
  const dir = agentsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${name}.`) && f.endsWith(".agent.json"));
  if (files.length === 0) {
    throw new AitermError(
      `session '${name}' は agent_done 管理セッションではありません。claude_agent／codex_agent 等の launcher で起動してください。`,
      2,
    );
  }
  if (files.length !== 1) {
    throw new AitermError(`session '${name}' の agent metadata が複数あります。閉じて起動し直してください。`, 2);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
  } catch (e) {
    throw new AitermError(`agent metadata を読めません: ${(e as Error).message}`, 2);
  }
  const m = raw as Partial<AgentMetadata>;
  if (
    (m.kind !== "claude" && m.kind !== "codex" && m.kind !== "grok" && m.kind !== "composer") ||
    m.aiterm_session !== name ||
    typeof m.launch_id !== "string" ||
    !LAUNCH_ID_RE.test(m.launch_id)
  ) {
    throw new AitermError(`agent metadata が不正です: ${files[0]}`, 2);
  }
  const expectedEvent = agentEventPath(name, m.launch_id);
  if (m.event_file !== expectedEvent) {
    throw new AitermError("agent metadata の path が現在の secure state root と一致しません", 2);
  }
  if (m.kind === "claude") {
    const expectedSettings = agentManagedClaudeSettingsPath(name, m.launch_id);
    const expectedResult = agentClaudeResultPath(name, m.launch_id);
    const launchOperationId = m.launch_operation_id ?? null;
    const launchRequestDigest = m.launch_request_digest ?? null;
    if (
      m.hook_route !== "shared_claude_settings" ||
      m.claude_settings !== expectedSettings ||
      typeof m.vendor_session_id !== "string" ||
      !UUID_RE.test(m.vendor_session_id) ||
      m.result_file !== expectedResult ||
      ((launchOperationId === null) !== (launchRequestDigest === null)) ||
      (launchOperationId !== null && !OPERATION_ID_RE.test(launchOperationId)) ||
      (launchRequestDigest !== null && !OPERATION_ID_RE.test(launchRequestDigest))
    ) {
      throw new AitermError("agent metadata の path が現在の secure state root と一致しません", 2);
    }
    return {
      kind: "claude",
      aiterm_session: name,
      launch_id: m.launch_id,
      event_file: expectedEvent,
      created_at: typeof m.created_at === "string" ? m.created_at : "",
      cwd: typeof m.cwd === "string" ? m.cwd : null,
      ...(typeof m.write_scope === "string" ? { write_scope: m.write_scope } : {}),
      vendor_session_id: m.vendor_session_id,
      initial_prompt: normalizeInitialPromptState(m.initial_prompt),
      launch_operation_id: launchOperationId,
      launch_request_digest: launchRequestDigest,
      hook_route: "shared_claude_settings",
      ...loadAgentLineageFields(m, true),
      node_platform: process.platform,
      claude_settings: expectedSettings,
      result_file: expectedResult,
    };
  }
  if (m.kind === "codex") {
    const expectedHome = realCodexHome();
    if (m.hook_route !== "shared_codex_home" || m.completion_route !== "codex_transcript" || m.codex_home !== expectedHome) {
      throw new AitermError("agent metadata の path が現在の secure state root と一致しません", 2);
    }
    return {
      kind: "codex",
      aiterm_session: name,
      launch_id: m.launch_id,
      event_file: expectedEvent,
      created_at: typeof m.created_at === "string" ? m.created_at : "",
      cwd: typeof m.cwd === "string" ? m.cwd : null,
      ...(typeof m.write_scope === "string" ? { write_scope: m.write_scope } : {}),
      vendor_session_id: typeof m.vendor_session_id === "string" ? m.vendor_session_id : null,
      initial_prompt: normalizeInitialPromptState(m.initial_prompt),
      hook_route: "shared_codex_home",
      completion_route: "codex_transcript",
      ...loadAgentLineageFields(m, true),
      node_platform: process.platform,
      codex_home: expectedHome,
    };
  }
  const expectedGrokHome = realGrokHome();
  if (
    m.hook_route !== "shared_grok_home" ||
    m.completion_route !== "grok_transcript" ||
    m.grok_home !== expectedGrokHome ||
    typeof m.vendor_session_id !== "string" ||
    !UUID_RE.test(m.vendor_session_id)
  ) {
    throw new AitermError("agent metadata の path が現在の secure state root と一致しません", 2);
  }
  const expectedAuthPath = resolveAndValidateGrokAuth(realGrokHome());
  if ((typeof m.grok_auth_path === "string" ? m.grok_auth_path : null) !== expectedAuthPath) {
    throw new AitermError("agent metadata の認証正本が現在の設定と一致しません", 2);
  }
  return {
    kind: m.kind,
    aiterm_session: name,
    launch_id: m.launch_id,
    event_file: expectedEvent,
    created_at: typeof m.created_at === "string" ? m.created_at : "",
    cwd: typeof m.cwd === "string" ? m.cwd : null,
    ...(typeof m.write_scope === "string" ? { write_scope: m.write_scope } : {}),
    vendor_session_id: m.vendor_session_id,
    initial_prompt: normalizeInitialPromptState(m.initial_prompt),
    hook_route: "shared_grok_home",
    completion_route: "grok_transcript",
    ...loadAgentLineageFields(m, true),
    node_platform: process.platform,
    grok_home: expectedGrokHome,
    grok_auth_path: expectedAuthPath,
  };
}

function parseAgentDoneEvent(line: string, meta: AgentMetadata): AgentDoneParseResult {
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return { event: null, malformed: true };
  }
  const ev = obj as Partial<AgentDoneEvent>;
  if (
    ev.type !== "agent_done" ||
    ev.vendor !== meta.kind ||
    ev.aiterm_session !== meta.aiterm_session ||
    ev.launch_id !== meta.launch_id ||
    ev.done_status !== "turn_done"
  ) {
    return { event: null, malformed: false };
  }
  if (meta.vendor_session_id && ev.vendor_session_id !== meta.vendor_session_id) {
    return { event: null, malformed: false };
  }
  if (
    meta.kind === "claude" &&
    (typeof ev.vendor_session_id !== "string" ||
      !ev.vendor_session_id ||
      (ev.operation_id != null &&
        (typeof ev.operation_id !== "string" || !OPERATION_ID_RE.test(ev.operation_id))) ||
      typeof ev.result_digest !== "string" ||
      !/^[0-9a-f]{64}$/.test(ev.result_digest) ||
      !Number.isInteger(ev.result_bytes) ||
      (ev.result_bytes as number) < 0 ||
      (ev.result_bytes as number) > CLAUDE_RESULT_MAX_BYTES)
  ) {
    return { event: null, malformed: true };
  }
  return {
    event: {
      type: "agent_done",
      vendor: meta.kind,
      aiterm_session: meta.aiterm_session,
      launch_id: meta.launch_id,
      vendor_session_id: typeof ev.vendor_session_id === "string" ? ev.vendor_session_id : null,
      turn_id: typeof ev.turn_id === "string" ? ev.turn_id : null,
      operation_id:
        typeof ev.operation_id === "string" && OPERATION_ID_RE.test(ev.operation_id) ? ev.operation_id : null,
      reason: typeof ev.reason === "string" ? ev.reason : "Stop",
      done_status: "turn_done",
      stop_hook_active: !!ev.stop_hook_active,
      result_digest: typeof ev.result_digest === "string" && /^[0-9a-f]{64}$/.test(ev.result_digest) ? ev.result_digest : undefined,
      result_bytes: Number.isInteger(ev.result_bytes) && (ev.result_bytes as number) >= 0 ? ev.result_bytes : undefined,
      at: typeof ev.at === "string" ? ev.at : new Date().toISOString(),
    },
    malformed: false,
  };
}

function scanAgentDoneLines(
  lines: string[],
  meta: AgentMetadata,
  expectedOperationId: string | null = null,
): AgentDoneScanResult {
  let malformedEvents = 0;
  let candidate: AgentDoneEvent | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (Buffer.byteLength(line, "utf8") > 64 * 1024) {
      malformedEvents++;
      continue;
    }
    const parsed = parseAgentDoneEvent(line, meta);
    if (parsed.malformed) {
      malformedEvents++;
      continue;
    }
    const ev = parsed.event;
    if (!ev) continue;
    if (expectedOperationId && ev.operation_id !== expectedOperationId) continue;
    if (meta.vendor_session_id) return { event: ev, malformedEvents, ambiguousVendorSession: false };
    if (
      candidate?.vendor_session_id &&
      ev.vendor_session_id &&
      candidate.vendor_session_id !== ev.vendor_session_id
    ) {
      return { event: null, malformedEvents, ambiguousVendorSession: true };
    }
    if (!candidate) candidate = ev;
  }
  return { event: candidate, malformedEvents, ambiguousVendorSession: false };
}

function bindAgentVendorSession(meta: AgentMetadata, ev: AgentDoneEvent): void {
  if (!meta.vendor_session_id && ev.vendor_session_id) {
    meta.vendor_session_id = ev.vendor_session_id;
  }
}

// 復旧案内の aiterm-wait は --cursor 0 を明示する: cursor 省略時の既定は waiter 起動時 EOF のため、
// 案内表示〜実行の間に done event が書かれていると読み飛ばして timeout まで座る。event file は
// per-launch 新規作成＋launch_id フィルタ付き走査なので、0 起点は取りこぼしゼロかつ安全。
function bindCompletedInitialPrompt(meta: AgentMetadata): void {
  if (meta.initial_prompt !== "pending" && meta.initial_prompt !== "sent") return;
  if (meta.kind === "codex") {
    const done = latestCodexCompletion(meta);
    if (!done) {
      throw new AitermError(
        `agent session '${meta.aiterm_session}' は起動時 prompt の完了待ちです。${agentWaitGuide(meta.aiterm_session)}`,
        2,
      );
    }
    bindAgentVendorSession(meta, done);
    setInitialPromptState(meta, "done");
    return;
  }
  if ((meta.kind === "grok" || meta.kind === "composer") && meta.completion_route === "grok_transcript") {
    if (!latestGrokCompletion(meta)) {
      throw new AitermError(
        `agent session '${meta.aiterm_session}' は起動時 prompt の完了待ちです。${agentWaitGuide(meta.aiterm_session)}`,
        2,
      );
    }
    setInitialPromptState(meta, "done");
    return;
  }
  const size = safeStatSize(meta.event_file);
  if (size === 0) {
    throw new AitermError(
      `agent session '${meta.aiterm_session}' は起動時 prompt の完了待ちです。${agentWaitGuide(meta.aiterm_session)}`,
      2,
    );
  }
  const text = readFileRange(meta.event_file, 0, size).toString("utf8");
  const lines = text.split("\n");
  const tail = lines.pop() ?? "";
  const scanned = scanAgentDoneLines(lines, meta);
  if (scanned.ambiguousVendorSession) {
    throw new AitermError("agent event file に複数の vendor_session_id が混在しています。該当セッションを閉じて起動し直してください。", 2);
  }
  if (!scanned.event) {
    const malformed = scanned.malformedEvents ? ` malformed_events=${scanned.malformedEvents}` : "";
    const partial = tail.trim() ? " partial_event=true" : "";
    throw new AitermError(
      `agent session '${meta.aiterm_session}' は起動時 prompt の完了 event をまだ確認できません。${agentWaitGuide(meta.aiterm_session)}${malformed}${partial}`,
      2,
    );
  }
  bindAgentVendorSession(meta, scanned.event);
  setInitialPromptState(meta, "done");
}

function tryLoadAgentMetadata(name: string): AgentMetadata | null {
  try {
    return loadAgentMetadata(name);
  } catch {
    return null;
  }
}

function latestAgentDoneEvent(meta: AgentMetadata, expectedOperationId: string | null = null): AgentDoneEvent | null {
  if (meta.kind === "codex") return latestCodexCompletion(meta);
  if ((meta.kind === "grok" || meta.kind === "composer") && meta.completion_route === "grok_transcript") {
    return latestGrokCompletion(meta);
  }
  const size = safeStatSize(meta.event_file);
  if (size === 0) return null;
  const isTailRead = size > AGENT_EVENT_TAIL_BYTES;
  let text = readFileRange(meta.event_file, isTailRead ? size - AGENT_EVENT_TAIL_BYTES : 0, size).toString("utf8");
  if (isTailRead) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline === -1) return null;
    text = text.slice(firstNewline + 1);
  }
  let latest: AgentDoneEvent | null = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || Buffer.byteLength(line, "utf8") > 64 * 1024) continue;
    const parsed = parseAgentDoneEvent(line, meta);
    if (parsed.event && (!expectedOperationId || parsed.event.operation_id === expectedOperationId)) latest = parsed.event;
  }
  return latest;
}

function completedClaudeOperationEvent(meta: AgentMetadata, operationId: string): AgentDoneEvent | null {
  const size = safeStatSize(meta.event_file);
  if (size === 0) return null;
  if (size > AGENT_EVENT_MAX_BYTES) {
    throw new AitermError("agent event file が大きすぎるためClaude operationを安全に回収できません", 2);
  }
  const text = readFileRange(meta.event_file, 0, size).toString("utf8");
  const lines = text.split("\n");
  const tail = lines.pop() ?? "";
  if (tail.length > 0) throw new AitermError("Claude operation event fileに未完結lineがあります", 2);
  let match: AgentDoneEvent | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (Buffer.byteLength(line, "utf8") > 64 * 1024) {
      throw new AitermError("Claude operation event lineが上限を超えています", 2);
    }
    const parsed = parseAgentDoneEvent(line, meta);
    if (parsed.malformed) throw new AitermError("Claude operation eventが不正です", 2);
    if (!parsed.event || parsed.event.operation_id !== operationId) continue;
    if (match !== null) throw new AitermError("Claude operation completion eventが重複しています", 2);
    match = parsed.event;
  }
  return match;
}

function recoverAgentVendorSession(meta: AgentMetadata): void {
  if (meta.vendor_session_id) return;
  if (meta.kind === "codex") {
    const transcript = bindCodexTranscriptSession(meta);
    if (!transcript) return;
    if (meta.initial_prompt === "pending" && latestCodexCompletion(meta)) setInitialPromptState(meta, "done");
    return;
  }
  const size = safeStatSize(meta.event_file);
  if (size === 0) return;
  if (size > AGENT_EVENT_MAX_BYTES) {
    throw new AitermError(
      "agent event file が大きすぎるため timeout 後のsessionを安全に回収できません。該当セッションを閉じて起動し直してください。",
      2,
    );
  }
  const text = readFileRange(meta.event_file, 0, size).toString("utf8");
  const lines = text.split("\n");
  lines.pop(); // hook は newline 完結eventだけを確定済みとして扱う。
  const scanned = scanAgentDoneLines(lines, meta);
  if (scanned.ambiguousVendorSession) {
    throw new AitermError(
      "agent event file に複数の vendor_session_id が混在しています。該当セッションを閉じて起動し直してください。",
      2,
    );
  }
  if (!scanned.event?.vendor_session_id) return;
  bindAgentVendorSession(meta, scanned.event);
  writeAgentMetadata(meta);
}

function findLatestCodexTranscript(codexHome: string, vendorSessionId: string): string | null {
  const sessionsDir = path.join(codexHome, "sessions");
  let latestFile: string | null = null;
  let latestMtime = -Infinity;
  const visit = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (!entry.isFile() || !entry.name.startsWith("rollout-") || !entry.name.endsWith(".jsonl") || !entry.name.includes(vendorSessionId)) continue;
      try {
        const mtimeMs = fs.statSync(file).mtimeMs;
        if (mtimeMs > latestMtime) {
          latestFile = file;
          latestMtime = mtimeMs;
        }
      } catch {
        // 探索中に消えた transcript は候補にしない。候補が無ければ明示エラーにする。
      }
    }
  };
  visit(sessionsDir);
  return latestFile;
}

function listCodexTranscripts(codexHome: string): string[] {
  const sessionsDir = path.join(codexHome, "sessions");
  const files: string[] = [];
  const visit = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) files.push(file);
    }
  };
  visit(sessionsDir);
  return files.sort();
}

function codexTranscriptMatchesLaunch(file: string, meta: AgentMetadata): boolean {
  const createdAt = Date.parse(meta.created_at);
  try {
    const st = fs.statSync(file);
    if (Number.isFinite(createdAt) && st.mtimeMs + 5_000 < createdAt) return false;
  } catch {
    return false;
  }
  const size = Math.min(safeStatSize(file), 1024 * 1024);
  if (size === 0) return false;
  const marker = `AITERM_AGENT_LAUNCH_ID=${meta.launch_id}`;
  let rootCli = false;
  let launchMarker = false;
  for (const line of readFileRange(file, 0, size).toString("utf8").split("\n")) {
    if (!line.trim()) continue;
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record?.type === "session_meta") {
      rootCli = record?.payload?.originator === "codex-tui" && record?.payload?.source === "cli";
      if (!rootCli) return false;
    }
    if (
      record?.type === "response_item" &&
      record?.payload?.type === "message" &&
      record?.payload?.role === "developer" &&
      Array.isArray(record?.payload?.content)
    ) {
      launchMarker ||= record.payload.content.some(
        (item: any) =>
          (item?.type === "input_text" || item?.type === "output_text") &&
          typeof item?.text === "string" &&
          item.text.includes(marker),
      );
    }
    if (rootCli && launchMarker) return true;
  }
  return false;
}

function codexTranscriptSessionId(file: string): string | null {
  const size = Math.min(safeStatSize(file), AGENT_EVENT_TAIL_BYTES);
  if (size === 0) return null;
  const text = readFileRange(file, 0, size).toString("utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record?.type === "session_meta" && typeof record?.payload?.id === "string" && record.payload.id) {
        return record.payload.id;
      }
    } catch {
      // startup中の未完結行は後のpollで読み直す。
    }
  }
  return null;
}

function codexRootTranscript(meta: AgentMetadata): string | null {
  if (meta.kind !== "codex" || !meta.codex_home) return null;
  if (meta.vendor_session_id) return findLatestCodexTranscript(meta.codex_home, meta.vendor_session_id);
  if (meta.hook_route === "shared_codex_home") {
    const matches = listCodexTranscripts(meta.codex_home).filter((file) => codexTranscriptMatchesLaunch(file, meta));
    if (matches.length > 1) {
      throw new AitermError("共有CODEX_HOMEに同じlaunch markerのroot rolloutが複数あります。sessionを閉じて起動し直してください。", 2);
    }
    return matches[0] ?? null;
  }
  return listCodexTranscripts(meta.codex_home)[0] ?? null;
}

function bindCodexTranscriptSession(meta: AgentMetadata): string | null {
  const transcript = codexRootTranscript(meta);
  if (!transcript) return null;
  const vendorSessionId = codexTranscriptSessionId(transcript);
  if (vendorSessionId && !meta.vendor_session_id) {
    meta.vendor_session_id = vendorSessionId;
    writeAgentMetadata(meta);
  }
  return transcript;
}

function codexCompletionEvent(
  meta: AgentMetadata,
  vendorSessionId: string | null,
  record: any,
): AgentDoneEvent | null {
  if (
    record?.type !== "event_msg" ||
    record?.payload?.type !== "task_complete" ||
    typeof record?.payload?.turn_id !== "string" ||
    !record.payload.turn_id
  ) return null;
  return {
    type: "agent_done",
    vendor: "codex",
    aiterm_session: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor_session_id: vendorSessionId,
    turn_id: record.payload.turn_id,
    operation_id: null,
    reason: "Codex transcript task_complete",
    done_status: "turn_done",
    stop_hook_active: false,
    at: typeof record.timestamp === "string" ? record.timestamp : new Date().toISOString(),
  };
}

function latestCodexCompletion(meta: AgentMetadata): AgentDoneEvent | null {
  const transcript = codexRootTranscript(meta);
  if (!transcript) return null;
  const vendorSessionId = meta.vendor_session_id ?? codexTranscriptSessionId(transcript);
  let latest: AgentDoneEvent | null = null;
  for (const line of readTranscriptLines(transcript)) {
    if (!line.trim()) continue;
    try {
      latest = codexCompletionEvent(meta, vendorSessionId, JSON.parse(line)) ?? latest;
    } catch {
      // Codexが末尾を書込み中なら、その行は次の観測で完結してから読む。
    }
  }
  return latest;
}

function grokSessionDirectory(meta: AgentMetadata): string | null {
  if ((meta.kind !== "grok" && meta.kind !== "composer") || !meta.grok_home || !meta.vendor_session_id) return null;
  const cwd = meta.cwd ?? process.cwd();
  return path.join(meta.grok_home, "sessions", encodeURIComponent(cwd), meta.vendor_session_id);
}

function grokEventsTranscript(meta: AgentMetadata): string | null {
  const dir = grokSessionDirectory(meta);
  return dir ? path.join(dir, "events.jsonl") : null;
}

function grokCompletionEvent(meta: AgentMetadata, record: any): AgentDoneEvent | null {
  if (
    (meta.kind !== "grok" && meta.kind !== "composer") ||
    record?.type !== "turn_ended" ||
    (record?.outcome !== "completed" && record?.outcome !== "cancelled")
  ) return null;
  const turnId = typeof record?.ts === "string" || typeof record?.ts === "number" ? String(record.ts) : null;
  return {
    type: "agent_done",
    vendor: meta.kind,
    aiterm_session: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor_session_id: meta.vendor_session_id,
    turn_id: turnId,
    operation_id: null,
    reason: `Grok transcript turn_ended:${record.outcome}`,
    done_status: "turn_done",
    stop_hook_active: false,
    at: typeof record?.ts === "string" ? record.ts : new Date().toISOString(),
  };
}

function latestGrokCompletion(meta: AgentMetadata): AgentDoneEvent | null {
  const transcript = grokEventsTranscript(meta);
  if (!transcript || !fs.existsSync(transcript)) return null;
  let latest: AgentDoneEvent | null = null;
  for (const line of readTranscriptLines(transcript)) {
    if (!line.trim()) continue;
    try {
      latest = grokCompletionEvent(meta, JSON.parse(line)) ?? latest;
    } catch {
      // 末尾書込み中のlineは次の観測で完結してから読む。
    }
  }
  return latest;
}

function grokInitializationComplete(meta: AgentMetadata): boolean {
  const transcript = grokEventsTranscript(meta);
  if (!transcript || !fs.existsSync(transcript)) return false;
  const size = safeStatSize(transcript);
  const from = Math.max(0, size - GROK_TRANSCRIPT_INCREMENT_MAX_BYTES);
  const lines = readFileRange(transcript, from, size).toString("utf8").split("\n");
  if (from > 0) lines.shift();
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (record?.type === "mcp_init_completed") return true;
      if (record?.type === "mcp_init_started") return false;
    } catch {
      // 末尾書込み中や無関係な破損lineはready判定を進めない。
    }
  }
  return false;
}

function agentCompletionCursor(meta: AgentMetadata): number {
  if ((meta.kind === "grok" || meta.kind === "composer") && meta.completion_route === "grok_transcript") {
    const transcript = grokEventsTranscript(meta);
    return transcript ? safeStatSize(transcript) : 0;
  }
  if (meta.kind !== "codex") return safeStatSize(meta.event_file);
  const transcript = bindCodexTranscriptSession(meta);
  if (meta.completion_route !== "codex_transcript") {
    meta.completion_route = "codex_transcript";
    writeAgentMetadata(meta);
  }
  return transcript ? safeStatSize(transcript) : 0;
}

function transcriptUnavailable(): never {
  throw new AitermError(`transcript がまだありません。ターン完了後に再取得してください。${agentWaitGuide()}`, 2);
}

function transcriptNotFound(vendor: AgentKind): never {
  throw new AitermError(
    `最終 assistant メッセージを特定できませんでした（vendor=${vendor}）。screen で確認してください。`,
    2,
  );
}

function readTranscriptLines(file: string): string[] {
  try {
    return fs.readFileSync(file, "utf8").split("\n");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") transcriptUnavailable();
    throw new AitermError(`transcript を読めません: ${(e as Error).message}`, 2);
  }
}

function readClaudeResultText(
  meta: AgentMetadata,
  done: AgentDoneEvent,
  operationId: string | null,
): string {
  if (meta.kind !== "claude" || !meta.result_file || !done.result_digest || done.result_bytes == null) {
    transcriptUnavailable();
  }
  let st: fs.Stats;
  try {
    st = fs.lstatSync(meta.result_file);
  } catch {
    transcriptUnavailable();
  }
  if (
    !st.isFile() ||
    st.isSymbolicLink() ||
    st.uid !== currentUid() ||
    st.nlink !== 1 ||
    (st.mode & 0o077) !== 0 ||
    st.size > CLAUDE_RESULT_MAX_BYTES + 4096
  ) {
    throw new AitermError("Claude result file の安全検証に失敗しました", 2);
  }
  let result: any;
  try {
    result = JSON.parse(fs.readFileSync(meta.result_file, "utf8"));
  } catch {
    throw new AitermError("Claude result file を読めません", 2);
  }
  const keys = result && typeof result === "object" && !Array.isArray(result) ? Object.keys(result).sort() : [];
  if (
    keys.join(",") !== "operation_id,result_bytes,result_digest,schema,text,vendor_session_id" ||
    result.schema !== "aiterm.claude-turn-result.v2" ||
    result.operation_id !== done.operation_id ||
    (operationId !== null && result.operation_id !== operationId) ||
    result.vendor_session_id !== meta.vendor_session_id ||
    result.result_digest !== done.result_digest ||
    result.result_bytes !== done.result_bytes ||
    typeof result.text !== "string" ||
    Buffer.byteLength(result.text, "utf8") !== done.result_bytes ||
    createHash("sha256").update(result.text, "utf8").digest("hex") !== done.result_digest
  ) {
    throw new AitermError("Claude result file が完了eventと一致しません", 2);
  }
  return result.text;
}

const CLAUDE_COMPLETION_MARKER_SETTLE_TIMEOUT_MS = 1_000;

function claudeCompletionWasPublishedAfterMarker(
  meta: AgentMetadata,
  marker: ClaudeOperationMarker,
): boolean {
  let markerStat: fs.Stats;
  let resultStat: fs.Stats;
  try {
    markerStat = fs.lstatSync(agentClaudeOperationPath(meta.aiterm_session, meta.launch_id));
    resultStat = fs.lstatSync(meta.result_file ?? "");
  } catch {
    return false;
  }
  if (resultStat.mtimeMs < markerStat.mtimeMs) return false;
  const done = latestAgentDoneEvent(meta, marker.operationId);
  return done !== null && done.operation_id === marker.operationId;
}

async function settlePublishedClaudeCompletionMarker(
  meta: AgentMetadata,
  marker: ClaudeOperationMarker,
): Promise<ClaudeOperationMarker | null> {
  if (!claudeCompletionWasPublishedAfterMarker(meta, marker)) return marker;
  const deadline = performance.now() + CLAUDE_COMPLETION_MARKER_SETTLE_TIMEOUT_MS;
  let active: ClaudeOperationMarker | null = marker;
  while (active && performance.now() < deadline) {
    await sleep(AGENT_DONE_POLL_MS);
    active = readClaudeOperationMarker(meta);
  }
  return active;
}

/** agent vendor の構造化 transcript から直近完了ターンの最終回答を読む。 */
export async function readAgentTranscript(
  name: string,
  o: { lines?: number | null; operation_id?: string | null } = {},
): Promise<string> {
  const meta = loadAgentMetadata(name);
  const operationId = o.operation_id == null ? null : validateOperationId(o.operation_id);
  if (operationId && meta.kind !== "claude") {
    throw new AitermError("operation_id付き回収はClaude agent sessionだけで使用できます", 2);
  }
  if (meta.kind === "claude") {
    let active = readClaudeOperationMarker(meta);
    if (active) active = await settlePublishedClaudeCompletionMarker(meta, active);
    if (active) {
      const label = active.operationId ? `operation ${active.operationId}` : "operation_idなしのClaude turn";
      throw new AitermError(`${label} はまだ完了していません。Stop完了後に同じsessionから再取得してください。${agentWaitGuide(name)}`, 2);
    }
  }
  // wait timeout は「失敗」ではなく状態不明。後着した同一launchの完了eventから
  // vendor session をbindし、promptを再送せず結果だけ回収できるようにする。
  recoverAgentVendorSession(meta);
  if (!meta.vendor_session_id) {
    throw new AitermError(
      `agent session '${name}' はまだターンが完了していません。agent_done 完了後に再取得してください。${agentWaitGuide(name)}`,
      2,
    );
  }

  const done = latestAgentDoneEvent(meta, operationId);
  if (operationId && !done) {
    throw new AitermError(`operation ${operationId} はまだ完了していません。同じoperation_idで後から再取得してください。${agentWaitGuide(name)}`, 2);
  }
  const turnId = done?.turn_id ?? null;
  let text = "";

  if (meta.kind === "claude") {
    if (!done) transcriptUnavailable();
    text = readClaudeResultText(meta, done, operationId);
  } else if (meta.kind === "codex") {
    if (!meta.codex_home) transcriptUnavailable();
    const transcript = findLatestCodexTranscript(meta.codex_home, meta.vendor_session_id);
    if (!transcript) transcriptUnavailable();
    const lines = readTranscriptLines(transcript);
    const matching: string[] = [];
    let finalAnswer = "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let record: any;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      const payload = record?.payload;
      if (
        record?.type === "response_item" &&
        payload?.type === "message" &&
        payload?.role === "assistant" &&
        payload?.internal_chat_message_metadata_passthrough?.turn_id === turnId &&
        Array.isArray(payload?.content)
      ) {
        for (const item of payload.content) {
          if (item?.type === "output_text" && typeof item.text === "string") matching.push(item.text);
        }
      }
      if (
        record?.type === "event_msg" &&
        payload?.type === "agent_message" &&
        payload?.phase === "final_answer" &&
        typeof payload?.message === "string"
      ) {
        finalAnswer = payload.message;
      }
    }
    text = matching.join("\n") || finalAnswer;
  } else {
    if (!meta.grok_home) transcriptUnavailable();
    // cwd 未指定で起動した TUI はサーバープロセスの cwd を継承する。metadata に null が残る既存
    // launch との互換のため、その実際の起動 cwd を path 導出に使う（launch 側は変更しない）。
    const cwd = meta.cwd ?? process.cwd();
    const transcript = path.join(
      meta.grok_home,
      "sessions",
      encodeURIComponent(cwd),
      meta.vendor_session_id,
      "chat_history.jsonl",
    );
    const lines = readTranscriptLines(transcript);
    let lastUser = -1;
    const records: any[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        records.push(record);
        if (record?.type === "user" && !("synthetic_reason" in record)) lastUser = records.length - 1;
      } catch {
        // 外部 transcript の壊れた1行は残りの完結行を読む妨げにしない。
      }
    }
    text = records
      .slice(lastUser + 1)
      .filter((record) => record?.type === "assistant" && typeof record?.content === "string")
      .map((record) => record.content)
      .join("\n");
  }

  if (!text.trim()) transcriptNotFound(meta.kind);
  if (o.lines != null) text = text.split("\n").slice(-o.lines).join("\n");
  const rawChars = text.length;
  const [body, outputMeta] = reduceOutput(text, name, true);
  const transcriptMeta = [
    "agent_transcript",
    `vendor=${meta.kind}`,
    `turn_id=${turnId ?? "unknown"}`,
    done?.operation_id ? `operation_id=${done.operation_id}` : null,
    `raw_chars=${rawChars}`,
  ].filter(Boolean).join(" ");
  return `${body}\n${outputMeta} [${transcriptMeta}]`;
}

function inferAgentFrontend(name: string, meta: AgentMetadata, screen?: string): string {
  const fg = paneCurrentCommand(name);
  const view = screen ?? captureScreen(name, AGENT_TUI_READY_LINES);
  if (isAgentTuiReady(meta.kind, view)) return "agent_tui";
  if (SHELLS.has(fg)) {
    if (/(^|\n)\s*>\s/.test(view)) return "shell_continuation";
    return "shell";
  }
  return "unknown";
}

function agentReadMetadataSuffix(name: string, screen?: string): string {
  const now = Date.now();
  const negativeCacheUntil = agentMetadataNegativeCache.get(name);
  if (negativeCacheUntil && negativeCacheUntil > now) return "";
  let meta: AgentMetadata;
  try {
    meta = loadAgentMetadata(name);
  } catch (e) {
    if (e instanceof AitermError && e.message.includes("agent_done 管理セッションではありません")) {
      agentMetadataNegativeCache.set(name, now + AGENT_METADATA_NEGATIVE_CACHE_TTL_MS);
    }
    return "";
  }
  agentMetadataNegativeCache.delete(name);
  const ev = latestAgentDoneEvent(meta);
  const bits = [
    "agent",
    `vendor=${meta.kind}`,
    `initial_prompt=${meta.initial_prompt}`,
    `agent_event_seen=${ev ? "true" : "false"}`,
    "completion_attribution=none",
    ev?.turn_id ? `last_turn_id=${ev.turn_id}` : null,
    `frontend=${inferAgentFrontend(name, meta, screen)}`,
  ].filter(Boolean);
  return ` [${bits.join(" ")}]`;
}

function assertInitialPromptNotPendingForSend(name: string, force: boolean): void {
  if (force) return;
  const meta = tryLoadAgentMetadata(name);
  if (!meta) return;
  if (meta.initial_prompt !== "pending" && meta.initial_prompt !== "sent") return;
  throw new AitermError(
    `agent session '${name}' は起動時 prompt の完了待ちです。通常 pty_send は混入防止のため送信しません。` +
      `${agentWaitGuide(name)}完了後に再度 pty_send するか、手動介入が必要な場合だけ force:true を明示してください。`,
    2,
  );
}


// aiterm-wait の exit 契約（CLI と各所の案内文で共有する正）。exit≠完了: outcome が done の時だけ完了。
export const AITERM_WAIT_OUTCOME_NOTE =
  `exit 0=done / 3=timeout（既定${DEFAULT_AGENT_DONE_TIMEOUT}秒・未完了） / 4=closed。receiptのoutcomeが正で、done以外は未完了`;

// 親ホストの識別（MCP initialize の clientInfo.name）。完了待ちコマンドを「親のターンを塞がない
// 起動形」で名指しするためだけに使う。分からない時は汎用文へ落ち、機能は一切変えない。
let parentClientName: string | null = null;

export function setParentClient(name: string | null): void {
  const trimmed = typeof name === "string" ? name.trim() : "";
  parentClientName = trimmed === "" ? null : trimmed;
}

// 完了待ちを親のターンを塞がない形で起動する具体形。ホストが分かる時は実際の呼び出し形を名指しする
// （抽象名詞の「バックグラウンドで」だけでは親が foreground 実行へ落ちるため・ADR 0017）。
export function agentWaitLaunchForm(command: string): string {
  if (parentClientName === "claude-code") {
    return `Bash(command: ${JSON.stringify(command)}, run_in_background: true)`;
  }
  return `\`${command}\` を親のターンを塞がない別プロセスとして起動`;
}

// dispatch / 起動時 prompt 送信後の共通案内。第一文で「待たない」を宣言し、待ち方は後段に置く。
export function agentDispatchGuide(session: string, cursor: number): string {
  const cmd = `aiterm-wait --session ${session} --cursor ${cursor}`;
  return (
    `投げっぱなしでよい＝ここで待たない。親は自分の作業へ戻るか、このターンを終える。\n` +
    `完了通知: ${agentWaitLaunchForm(cmd)}。exit が完了通知（${AITERM_WAIT_OUTCOME_NOTE}）。\n` +
    `foreground 実行は親を最大 ${DEFAULT_AGENT_DONE_TIMEOUT} 秒塞ぐので使わない。回収: pty_read(agent_transcript:true)`
  );
}

// 未完了 session へ触った時の共通案内。ここでも待つのは waiter プロセスであって親ではない。
export function agentWaitGuide(session?: string): string {
  const cmd = `aiterm-wait --session ${session ?? "<session_id>"} --cursor 0`;
  return `完了通知は ${agentWaitLaunchForm(cmd)} で受ける（親はここで待たない・polling 不要）。receipt の outcome=done を確認してから再取得する。`;
}

export interface AgentWaitObservation {
  schema: "aiterm.agent-wait-result.v1";
  session_id: string;
  launch_id: string;
  vendor: AgentKind;
  // running は timeout=0（待たずに一度だけ観測する照会）専用の「まだ終わっていない」。
  // timeout は「指定秒だけ待って終わらなかった」で、両者を1語に潰さない（ADR 0018）。
  outcome: "done" | "running" | "timeout" | "closed";
  operation_id: string | null;
  vendor_session_id: string | null;
  turn_id: string | null;
  malformed_events: number;
  at: string | null;
}

async function observeCodexDone(
  meta: AgentMetadata,
  timeout: number,
  requestedCursor: number | null | undefined,
): Promise<AgentWaitObservation> {
  const metadataFile = agentMetadataPath(meta.aiterm_session, meta.launch_id);
  let transcript = codexRootTranscript(meta);
  const startOffset = requestedCursor ?? (transcript ? safeStatSize(transcript) : 0);
  let cursor = startOffset;
  let carry = "";
  let malformedEvents = 0;
  let discardLeadingFragment = false;
  let initializedBoundary = false;
  const deadline = performance.now() + timeout * 1000;
  const observation = (
    outcome: AgentWaitObservation["outcome"],
    ev: AgentDoneEvent | null = null,
  ): AgentWaitObservation => ({
    schema: "aiterm.agent-wait-result.v1",
    session_id: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor: "codex",
    outcome,
    operation_id: null,
    vendor_session_id: ev?.vendor_session_id ?? meta.vendor_session_id ?? null,
    turn_id: ev?.turn_id ?? null,
    malformed_events: malformedEvents,
    at: ev?.at ?? null,
  });

  for (;;) {
    if (!fs.existsSync(metadataFile)) return observation("closed");
    transcript ??= codexRootTranscript(meta);
    if (transcript) {
      if (!initializedBoundary) {
        if (cursor > 0) {
          const previous = readFileRange(transcript, cursor - 1, cursor).toString("utf8");
          discardLeadingFragment = previous !== "\n";
        }
        initializedBoundary = true;
      }
      const size = safeStatSize(transcript);
      if (size < cursor) {
        throw new AitermError("Codex transcript が完了待機中に短くなりました。該当セッションを閉じて起動し直してください。", 2);
      }
      if (size - startOffset > CODEX_TRANSCRIPT_INCREMENT_MAX_BYTES) {
        throw new AitermError("Codex transcript のturn増分が大きすぎます。該当セッションを閉じて起動し直してください。", 2);
      }
      if (size > cursor) {
        carry += readFileRange(transcript, cursor, size).toString("utf8");
        cursor = size;
        const parts = carry.split("\n");
        carry = parts.pop() ?? "";
        if (discardLeadingFragment && parts.length > 0) {
          parts.shift();
          discardLeadingFragment = false;
        }
        const vendorSessionId = meta.vendor_session_id ?? codexTranscriptSessionId(transcript);
        for (const line of parts) {
          if (!line.trim()) continue;
          if (Buffer.byteLength(line, "utf8") > AGENT_EVENT_MAX_BYTES) {
            malformedEvents++;
            continue;
          }
          try {
            const done = codexCompletionEvent(meta, vendorSessionId, JSON.parse(line));
            if (done) return observation("done", done);
          } catch {
            malformedEvents++;
          }
        }
      }
    }
    if (performance.now() >= deadline) return observation(timeout === 0 ? "running" : "timeout");
    await sleep(AGENT_DONE_POLL_MS);
  }
}

async function observeGrokDone(
  meta: AgentMetadata,
  timeout: number,
  requestedCursor: number | null | undefined,
): Promise<AgentWaitObservation> {
  const metadataFile = agentMetadataPath(meta.aiterm_session, meta.launch_id);
  const transcript = grokEventsTranscript(meta);
  if (!transcript) throw new AitermError("Grok transcriptのsession相関情報がありません", 2);
  const startOffset = requestedCursor ?? safeStatSize(transcript);
  let cursor = startOffset;
  let carry = "";
  let malformedEvents = 0;
  let discardLeadingFragment = false;
  let initializedBoundary = false;
  const deadline = performance.now() + timeout * 1000;
  const observation = (
    outcome: AgentWaitObservation["outcome"],
    ev: AgentDoneEvent | null = null,
  ): AgentWaitObservation => ({
    schema: "aiterm.agent-wait-result.v1",
    session_id: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor: meta.kind,
    outcome,
    operation_id: null,
    vendor_session_id: meta.vendor_session_id,
    turn_id: ev?.turn_id ?? null,
    malformed_events: malformedEvents,
    at: ev?.at ?? null,
  });

  for (;;) {
    if (!fs.existsSync(metadataFile)) return observation("closed");
    if (fs.existsSync(transcript)) {
      if (!initializedBoundary) {
        if (cursor > 0) {
          const previous = readFileRange(transcript, cursor - 1, cursor).toString("utf8");
          discardLeadingFragment = previous !== "\n";
        }
        initializedBoundary = true;
      }
      const size = safeStatSize(transcript);
      if (size < cursor) {
        throw new AitermError("Grok transcript が完了待機中に短くなりました。該当セッションを閉じて起動し直してください。", 2);
      }
      if (size - startOffset > GROK_TRANSCRIPT_INCREMENT_MAX_BYTES) {
        throw new AitermError("Grok transcript のturn増分が大きすぎます。該当セッションを閉じて起動し直してください。", 2);
      }
      if (size > cursor) {
        carry += readFileRange(transcript, cursor, size).toString("utf8");
        cursor = size;
        const parts = carry.split("\n");
        carry = parts.pop() ?? "";
        if (discardLeadingFragment && parts.length > 0) {
          parts.shift();
          discardLeadingFragment = false;
        }
        for (const line of parts) {
          if (!line.trim()) continue;
          if (Buffer.byteLength(line, "utf8") > AGENT_EVENT_MAX_BYTES) {
            malformedEvents++;
            continue;
          }
          try {
            const done = grokCompletionEvent(meta, JSON.parse(line));
            if (done) return observation("done", done);
          } catch {
            malformedEvents++;
          }
        }
      }
    }
    if (performance.now() >= deadline) return observation(timeout === 0 ? "running" : "timeout");
    await sleep(AGENT_DONE_POLL_MS);
  }
}

// 外部waiterプロセス用の純リーダー観測。lock・PTY・metadata書込・dispatch状態には一切触れない。
// Codexはrollout transcript、他vendorはevent fileを増分走査し、vendor_session_idのbind永続化を
// 行わない（waiterは観測者であって所有者でない）。
export async function observeAgentDone(
  name: string,
  o: { operation_id?: string | null; timeout?: number; cursor?: number | null } = {},
): Promise<AgentWaitObservation> {
  const meta = loadAgentMetadata(name);
  const operationId = o.operation_id == null ? null : validateOperationId(o.operation_id);
  if (operationId && meta.kind !== "claude") {
    throw new AitermError("operation_id はClaude agent sessionだけで使用できます", 2);
  }
  if (o.cursor != null && (!Number.isInteger(o.cursor) || o.cursor < 0)) {
    throw new AitermError("cursor は0以上の整数byte offsetで指定してください", 2);
  }
  const timeout = o.timeout ?? DEFAULT_AGENT_DONE_TIMEOUT;
  if (meta.kind === "codex" && meta.completion_route === "codex_transcript") {
    return observeCodexDone(meta, timeout, o.cursor);
  }
  if ((meta.kind === "grok" || meta.kind === "composer") && meta.completion_route === "grok_transcript") {
    return observeGrokDone(meta, timeout, o.cursor);
  }
  const metadataFile = agentMetadataPath(meta.aiterm_session, meta.launch_id);
  // 境界の優先順: dispatch receipt の event_cursor（起動順序に依存しない）→ operation相関
  // （operation_idの一意性で先頭から全走査できる）→ waiter起動時EOF（waiter先行起動が前提）。
  const startOffset = o.cursor ?? (operationId ? 0 : safeStatSize(meta.event_file));
  const deadline = performance.now() + timeout * 1000;
  let cursor = startOffset;
  let carry = "";
  let malformedEvents = 0;
  const observation = (
    outcome: AgentWaitObservation["outcome"],
    ev: AgentDoneEvent | null = null,
  ): AgentWaitObservation => ({
    schema: "aiterm.agent-wait-result.v1",
    session_id: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor: meta.kind,
    outcome,
    operation_id: ev?.operation_id ?? operationId,
    vendor_session_id: ev?.vendor_session_id ?? meta.vendor_session_id ?? null,
    turn_id: ev?.turn_id ?? null,
    malformed_events: malformedEvents,
    at: ev?.at ?? null,
  });
  for (;;) {
    if (!fs.existsSync(metadataFile)) return observation("closed");
    const size = safeStatSize(meta.event_file);
    if (size < cursor) {
      cursor = 0;
      carry = "";
    }
    if (size > cursor) {
      if (size - cursor > AGENT_EVENT_MAX_BYTES) {
        throw new AitermError("agent event file の増分が大きすぎます。該当セッションを閉じて起動し直してください。", 2);
      }
      carry += readFileRange(meta.event_file, cursor, size).toString("utf8");
      cursor = size;
      const parts = carry.split("\n");
      carry = parts.pop() ?? "";
      const scanned = scanAgentDoneLines(parts, meta, operationId);
      malformedEvents += scanned.malformedEvents;
      if (scanned.ambiguousVendorSession) {
        throw new AitermError("agent event file に複数の vendor_session_id が混在しています。該当セッションを閉じて起動し直してください。", 2);
      }
      if (scanned.event) return observation("done", scanned.event);
    }
    // timeout=0 は「待たずに一度だけ見る」照会＝未完了は失敗ではなく running。
    // 1秒以上を指定した待機の未完了は従来どおり timeout で、待ち方の意味は変えない。
    if (performance.now() >= deadline) return observation(timeout === 0 ? "running" : "timeout");
    await sleep(AGENT_DONE_POLL_MS);
  }
}


function isAgentTuiReady(kind: AgentKind, screen: string): boolean {
  if (kind === "claude") {
    return screen.includes("Claude Code") && /(^|\n)\s*❯/.test(screen);
  }
  if (kind === "codex") {
    return screen.includes("OpenAI Codex") && /(^|\n)\s*[›>]/.test(screen);
  }
  // Grok Build 0.2.117 は起動完了後に製品名を消し、model footerだけを残す。
  // Composerも同じfrontendでmodel名だけが異なるため、両方をvendor UIの根拠にする。
  const grokFrontend = screen.includes("Grok Build") || /\b(?:Grok|Composer)\s+[\w.()-]+/.test(screen);
  return grokFrontend && /(^|\n|\s)❯/.test(screen);
}

// Codex/Claude は実行中に「(esc to interrupt)」を表示する（実機採取）。startup 側の処理
// （MCP initialize 等）が走ったまま composer だけ描画されている画面は入力受付とみなさない。
// Grok/Composer は busy 表示文字列の実機根拠が未採取のため対象外（誤ブロックで起動不能にしない）。
const AGENT_TUI_BUSY_KINDS: ReadonlySet<AgentKind> = new Set(["codex", "claude"]);
const AGENT_TUI_BUSY_RE = /esc to interrupt/i;

// ready gate 用: 入力欄マーカーがあっても busy 表示中は ready と数えない。
// frontend 推定（inferAgentFrontend）は「agent TUI が前面か」を見るだけなので isAgentTuiReady のまま。
function isAgentTuiIdleReady(kind: AgentKind, screen: string): boolean {
  if (!isAgentTuiReady(kind, screen)) return false;
  return !(AGENT_TUI_BUSY_KINDS.has(kind) && AGENT_TUI_BUSY_RE.test(screen));
}

async function waitAgentTuiReadyImpl(
  kind: AgentKind,
  sample: () => string,
  sleepFn: (ms: number) => Promise<void>,
  opts: {
    timeoutMs?: number;
    pollMs?: number;
    stableSamples?: number;
  } = {},
): Promise<AgentTuiReadyWaitResult> {
  const timeoutMs = opts.timeoutMs ?? AGENT_TUI_READY_TIMEOUT_MS;
  const pollMs = opts.pollMs ?? AGENT_TUI_READY_POLL_MS;
  const stableSamples = opts.stableSamples ?? agentTuiReadyStableSamplesTestOverride ?? AGENT_TUI_READY_STABLE_SAMPLES;
  const deadline = performance.now() + timeoutMs;
  let samples = 0;
  let readyStreak = 0;
  let lastScreen = "";
  for (;;) {
    lastScreen = sample();
    samples++;
    if (isAgentTuiIdleReady(kind, lastScreen)) {
      readyStreak++;
      if (readyStreak >= stableSamples) return { ready: true, samples, lastScreen };
    } else {
      readyStreak = 0;
    }
    if (performance.now() >= deadline) return { ready: false, samples, lastScreen };
    await sleepFn(pollMs);
  }
}

async function waitAgentTuiReady(
  name: string,
  meta: AgentMetadata,
  timeoutMs = AGENT_TUI_READY_TIMEOUT_MS,
): Promise<AgentTuiReadyWaitResult> {
  return waitAgentTuiReadyImpl(
    meta.kind,
    () => {
      if ((meta.kind === "grok" || meta.kind === "composer") && !grokInitializationComplete(meta)) return "";
      return captureScreen(name, AGENT_TUI_READY_LINES);
    },
    sleep,
    { timeoutMs },
  );
}

async function waitAgentTuiReadyByKind(
  name: string,
  kind: AgentKind,
  timeoutMs = AGENT_TUI_READY_TIMEOUT_MS,
): Promise<AgentTuiReadyWaitResult> {
  return waitAgentTuiReadyImpl(
    kind,
    () => captureScreen(name, AGENT_TUI_READY_LINES),
    sleep,
    { timeoutMs },
  );
}

// ---- submit座礁観測 -------------------------------------------------------
// dispatch は非ブロックのため submit の成立自体は保証できない（実被弾: Codex が MCP initialize で
// ハングしたまま prompt が composer に未 submit で座礁し、2時間気づけなかった）。
// ここでは「送信 text の末尾が composer 領域（画面末尾の最後の入力欄マーカー行以降）に残存している」
// という陽性の証拠だけを有界ポーリングで観測し、receipt に載せる。
// residue=true は座礁の強い疑い。false は「残存を観測せず」であり submit 成立の保証ではない
// （TUI が長文 paste を折りたたみ表示する場合は検出できない）。null は判定不能（tail が短い等）。

export interface AgentSubmitResidueResult {
  residue: boolean | null;
  samples: number;
}

function normalizeResidueText(s: string): string {
  return s.replace(/\s+/g, "");
}

function agentSubmitResidueTail(text: string): string | null {
  // 行単位でなく text 全体の正規化末尾から取る: 最終行が短い prompt（「以上」等の締め行）でも
  // 直前行の内容を含む末尾 32 codepoint で観測できる。composer は末尾（カーソル位置）を表示し、
  // submit 済みの transcript echo は長文では先頭側を表示するため、末尾一致は座礁側に偏る。
  const cps = [...normalizeResidueText(text)];
  if (cps.length < AGENT_SUBMIT_RESIDUE_MIN_TAIL_CHARS) return null;
  return cps.slice(-AGENT_SUBMIT_RESIDUE_TAIL_CHARS).join("");
}

function agentSubmitResidueOnScreen(kind: AgentKind, screen: string, tail: string): boolean | null {
  const lines = screen.split("\n");
  // 入力欄マーカーは ready 判定と同じ記号を行頭基準で探す。submit 済みの transcript echo は
  // マーカー行より上に出るため、最後のマーカー行以降だけを composer 領域として見る。
  const markerRe = kind === "codex" ? /^\s*[›>]/ : kind === "claude" ? /^\s*❯/ : /(^|\s)❯/;
  let markerIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (markerRe.test(lines[i])) {
      markerIdx = i;
      break;
    }
  }
  if (markerIdx < 0) return null;
  return normalizeResidueText(lines.slice(markerIdx).join("")).includes(tail);
}

async function detectAgentSubmitResidueImpl(
  kind: AgentKind,
  text: string,
  sample: () => string,
  sleepFn: (ms: number) => Promise<void>,
  opts: { delayMs?: number; pollMs?: number; maxSamples?: number } = {},
): Promise<AgentSubmitResidueResult> {
  const tail = agentSubmitResidueTail(text);
  if (!tail) return { residue: null, samples: 0 };
  const delayMs = opts.delayMs ?? AGENT_SUBMIT_RESIDUE_DELAY_MS;
  const pollMs = opts.pollMs ?? AGENT_SUBMIT_RESIDUE_POLL_MS;
  const maxSamples = opts.maxSamples ?? AGENT_SUBMIT_RESIDUE_MAX_SAMPLES;
  if (delayMs > 0) await sleepFn(delayMs);
  let samples = 0;
  let last: boolean | null = null;
  for (let i = 0; i < maxSamples; i++) {
    last = agentSubmitResidueOnScreen(kind, sample(), tail);
    samples++;
    // 残存が消えた（または判定不能になった）時点で確定。true だけは描画遅延と区別するため
    // 全サンプル持続した場合にのみ報告する。
    if (last !== true) return { residue: last, samples };
    if (i < maxSamples - 1) await sleepFn(pollMs);
  }
  return { residue: true, samples };
}

async function detectAgentSubmitResidue(name: string, kind: AgentKind, text: string): Promise<AgentSubmitResidueResult> {
  return detectAgentSubmitResidueImpl(kind, text, () => captureScreen(name, AGENT_TUI_READY_LINES), sleep);
}

export function agentSubmitResidueWarning(name: string, residue: boolean | null): string {
  if (residue !== true) return "";
  return (
    `\n警告: submit_residue=true＝送信 text が composer に残存しており submit 未成立の疑いがある` +
    `（実行中 turn への queued message が表示されている可能性もある）。` +
    `pty_read(${name}, screen:true) で状態を確認してから、座礁していれば pty_key(${name}, "Enter") で再 submit、` +
    `破棄するなら pty_key(${name}, "Escape") を使う。盲目的に Enter を送らない（queued だった場合の二重 submit 防止）。`
  );
}

async function settleAgentDoneScreenImpl(
  sample: () => AgentScreenSample,
  sleepFn: (ms: number) => Promise<void>,
  opts: {
    minDelayMs?: number;
    pollMs?: number;
    maxPolls?: number;
    minSamples?: number;
  } = {},
): Promise<AgentScreenSettleResult> {
  const minDelayMs = opts.minDelayMs ?? AGENT_DONE_SETTLE_MIN_MS;
  const pollMs = opts.pollMs ?? AGENT_DONE_SCREEN_SETTLE_POLL_MS;
  const maxPolls = opts.maxPolls ?? AGENT_DONE_SCREEN_SETTLE_MAX_POLLS;
  const minSamples = opts.minSamples ?? AGENT_DONE_SCREEN_SETTLE_MIN_SAMPLES;
  if (minDelayMs > 0) await sleepFn(minDelayMs);
  let prev = sample();
  let samples = 1;
  let stableStreak = 1;
  for (let i = 0; i < maxPolls; i++) {
    if (pollMs > 0) await sleepFn(pollMs);
    const current = sample();
    samples++;
    if (current.screen === prev.screen && current.logSize === prev.logSize) {
      stableStreak++;
      if (samples >= minSamples && stableStreak >= 2) return { unstable: false, samples };
    } else {
      stableStreak = 1;
    }
    prev = current;
  }
  return { unstable: true, samples };
}


export async function __testSettleAgentDoneScreen(
  samples: AgentScreenSample[],
  opts: { minDelayMs?: number; pollMs?: number; maxPolls?: number; minSamples?: number } = {},
): Promise<AgentScreenSettleResult & { sleeps: number[] }> {
  if (samples.length === 0) throw new AitermError("screen settle test samples が空です", 2);
  let i = 0;
  const sleeps: number[] = [];
  const result = await settleAgentDoneScreenImpl(
    () => samples[Math.min(i++, samples.length - 1)],
    async (ms) => {
      sleeps.push(ms);
    },
    opts,
  );
  return { ...result, sleeps };
}

export function __testIsAgentTuiReady(kind: AgentKind, screen: string): boolean {
  return isAgentTuiReady(kind, screen);
}

export async function __testWaitAgentTuiReady(
  kind: AgentKind,
  samples: string[],
  opts: { timeoutMs?: number; pollMs?: number; stableSamples?: number } = {},
): Promise<AgentTuiReadyWaitResult & { sleeps: number[] }> {
  if (samples.length === 0) throw new AitermError("agent ready test samples が空です", 2);
  let i = 0;
  const sleeps: number[] = [];
  const result = await waitAgentTuiReadyImpl(
    kind,
    () => samples[Math.min(i++, samples.length - 1)],
    async (ms) => {
      sleeps.push(ms);
    },
    opts,
  );
  return { ...result, sleeps };
}

export function __testIsAgentTuiIdleReady(kind: AgentKind, screen: string): boolean {
  return isAgentTuiIdleReady(kind, screen);
}

export async function __testDetectAgentSubmitResidue(
  kind: AgentKind,
  text: string,
  samples: string[],
  opts: { delayMs?: number; pollMs?: number; maxSamples?: number } = {},
): Promise<AgentSubmitResidueResult & { sleeps: number[] }> {
  let i = 0;
  const sleeps: number[] = [];
  const result = await detectAgentSubmitResidueImpl(
    kind,
    text,
    () => samples[Math.min(i++, samples.length - 1)],
    async (ms) => {
      sleeps.push(ms);
    },
    opts,
  );
  return { ...result, sleeps };
}

export function __testSetAgentTuiReadyStableSamples(value: number | null): void {
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 1000)) {
    throw new AitermError("test ready stable samplesが不正です", 2);
  }
  agentTuiReadyStableSamplesTestOverride = value;
}


export interface InitialAgentPromptOpts {
  ready_timeout?: number;
}

async function sendAgentPromptText(name: string, text: string): Promise<void> {
  send(name, text, {
    enter: false,
    force: true,
    raw: false,
    mark: false,
    rtk: false,
    preserveAgentOperation: true,
    bracketedPaste: true,
  });
  await sleep(AGENT_SUBMIT_DELAY_MS);
  sendKey(name, "Enter", { preserveAgentOperation: true });
}

export interface InitialAgentPromptResult {
  text: string;
  // 初回 prompt を dispatch した場合のvendor完了正本境界。ready 失敗で未送信なら null。
  event_cursor: number | null;
  // submit座礁観測。true=composerに残存を確認（未submitの疑い）/ false=残存を観測せず / null=判定不能・未実施。
  submit_residue: boolean | null;
}

export async function sendInitialAgentPrompt(
  name: string,
  text: string,
  o: InitialAgentPromptOpts = {},
): Promise<InitialAgentPromptResult> {
  assertSessionName(name);
  const meta = loadAgentMetadata(name);
  if (meta.initial_prompt === "done") {
    throw new AitermError(`agent session '${name}' の起動時 prompt は既に完了しています`, 2);
  }
  if (meta.initial_prompt === "pending" || meta.initial_prompt === "sent") {
    throw new AitermError(
      `agent session '${name}' は起動時 prompt の完了待ちです。初回応答完了後に再度操作してください。`,
      2,
    );
  }
  setInitialPromptState(meta, "not_sent");
  const ready = await waitAgentTuiReady(name, meta, o.ready_timeout ?? AGENT_TUI_READY_TIMEOUT_MS);
  if (!ready.ready) {
    return {
      text:
        `initial_prompt=not_sent vendor=${meta.kind} ready=false samples=${ready.samples}\n` +
        `agent session '${name}' の ${agentLabel(meta.kind)} TUI が入力受付状態になりません。prompt は送信していません。`,
      event_cursor: null,
      submit_residue: null,
    };
  }
  const startOffset = agentCompletionCursor(meta);
  try {
    if (meta.kind === "claude") {
      prepareSendText(text, { raw: false, force: true });
      reserveAnonymousClaudeTurn(meta);
    }
    await sendAgentPromptText(name, text);
    setInitialPromptState(meta, "pending");
  } catch (e) {
    setInitialPromptState(meta, "failed");
    throw e;
  }
  const residue = await detectAgentSubmitResidue(name, meta.kind, text);
  return {
    text:
      `initial_prompt=pending vendor=${meta.kind} event_cursor=${startOffset}\n` +
      `起動時 prompt を送信した。${agentDispatchGuide(name, startOffset)}` +
      agentSubmitResidueWarning(name, residue.residue),
    event_cursor: startOffset,
    submit_residue: residue.residue,
  };
}

export function isAgentSession(name: string): boolean {
  assertSessionName(name);
  return tryLoadAgentMetadata(name) !== null;
}

export interface AgentDispatchReceipt {
  schema: "aiterm.agent-dispatch.v1";
  session_id: string;
  launch_id: string;
  vendor: AgentKind;
  // vendor別完了正本のbyte境界（Codex=rollout transcript、他vendor=event file）。
  event_cursor: number;
  operation_id: string | null;
  // submit座礁観測。true=composerに残存を確認（未submitの疑い）/ false=残存を観測せず
  // （submit成立の保証ではない）/ null=判定不能。
  submit_residue: boolean | null;
}

// v0.16.0: 親をブロックする wait 経路は廃止した。send は ready gate と submit 分離を内蔵した
// dispatch として即返り、event_cursor（送信直前のvendor完了正本境界）を receipt で返す。
// 完了通知は aiterm-wait（--cursor で境界を渡す）、回収は pty_read / claude_turn recover が担う。
export async function dispatchAgentTurn(
  name: string,
  text: string,
  o: { operation_id?: string | null; ready_timeout?: number; force?: boolean; raw?: boolean } = {},
): Promise<AgentDispatchReceipt> {
  assertSessionName(name);
  const meta = loadAgentMetadata(name);
  assertManagedClaudeCredentialCommandNotSent(name, text);
  const operationId = o.operation_id == null ? null : validateOperationId(o.operation_id);
  if (operationId && meta.kind !== "claude") {
    throw new AitermError("operation_id はClaude agent sessionだけで使用できます", 2);
  }
  bindCompletedInitialPrompt(meta);
  // Codex/Grok/Composerはbind済みのfollow-upでも毎回idleを確認してからtranscript境界を切る。
  // Grok/Composerはsession IDが起動前から既知でも、共有MCPの初期化完了前には送信しない。
  // 同じcursorへ複数turnを帰属させる余地や、初期化中TUIへの早送信を作らない。
  if (meta.kind !== "claude" || !meta.vendor_session_id) {
    const ready = await waitAgentTuiReady(name, meta, o.ready_timeout ?? AGENT_TUI_READY_TIMEOUT_MS);
    if (!ready.ready) {
      throw new AitermError(
        `agent session '${name}' の ${agentLabel(meta.kind)} TUI が入力受付状態になりません。文字列は送信していません。` +
          "少し後で pty_read(screen:true) を確認し、TUI が起動済みなら再度 pty_send してください。",
        2,
      );
    }
  }
  const startOffset = agentCompletionCursor(meta);
  if (meta.kind === "claude") {
    // durable／anonymousを分岐する前に同じsend preflightを通す。拒否されるpromptの
    // receipt／active markerだけを残して、来ないStopを待つ状態を作らない。
    prepareSendText(text, { raw: o.raw, force: o.force });
    if (operationId) {
      reserveClaudeOperation(meta, operationId);
    } else reserveAnonymousClaudeTurn(meta);
  }
  send(name, text, {
    enter: false,
    force: o.force,
    raw: o.raw,
    mark: false,
    rtk: false,
    preserveAgentOperation: meta.kind === "claude",
    bracketedPaste: true,
  });
  // Codex TUI は literal text 投入直後の Enter を取り落とすことがある。agent 経路だけ submit を分離する。
  await sleep(AGENT_SUBMIT_DELAY_MS);
  sendKey(name, "Enter", { preserveAgentOperation: meta.kind === "claude" });
  const residue = await detectAgentSubmitResidue(name, meta.kind, text);
  return {
    schema: "aiterm.agent-dispatch.v1",
    session_id: meta.aiterm_session,
    launch_id: meta.launch_id,
    vendor: meta.kind,
    event_cursor: startOffset,
    operation_id: operationId,
    submit_residue: residue.residue,
  };
}

export async function runClaudeOperation({
  session_id: name,
  action,
  operation_id: operationIdInput,
  text,
}: {
  session_id: string;
  action: "issue" | "recover";
  operation_id: string;
  text?: string | null;
}): Promise<ClaudeOperationResult> {
  assertSessionName(name);
  if (action !== "issue" && action !== "recover") {
    throw new AitermError('action は "issue" または "recover" を指定してください', 2);
  }
  const operationId = validateOperationId(operationIdInput);
  const meta = loadAgentMetadata(name);
  if (meta.kind !== "claude") throw new AitermError("claude_turnはmanaged Claude agent sessionだけで使用できます", 2);

  let dispatchReceipt: AgentDispatchReceipt | null = null;
  if (action === "issue") {
    if (typeof text !== "string" || text.length === 0) {
      throw new AitermError("claude_turn issueには空でないtextが必要です", 2);
    }
    // v0.16.0: issue は dispatch-only。完了通知は aiterm-wait --operation、回収は recover が担う。
    dispatchReceipt = await dispatchAgentTurn(name, text, { operation_id: operationId });
  } else {
    if (text != null) throw new AitermError("claude_turn recoverにtextは指定できません", 2);
  }

  const inspected = inspectClaudeOperation(meta, operationId, action);
  // issue は dispatch の submit 座礁観測を捨てずに返す（観測を払ったのに信号を返さない契約矛盾を作らない）。
  const result = dispatchReceipt ? { ...inspected, submit_residue: dispatchReceipt.submit_residue } : inspected;
  if (action === "issue" && result.status === "pending") {
    return { ...result, status: "accepted" };
  }
  return result;
}

function inspectClaudeOperation(
  meta: AgentMetadata,
  operationId: string,
  action: "issue" | "recover",
): ClaudeOperationResult {
  const base = {
    schema: "aiterm.claude-operation-result.v1" as const,
    action,
    session_id: meta.aiterm_session,
    operation_id: operationId,
    submit_residue: null as boolean | null,
  };
  const active = readClaudeOperationMarker(meta);
  if (active) {
    if (active.operationId !== operationId) {
      throw new AitermError(
        `${active.operationId ? `別のoperation ${active.operationId}` : "operation_idなしのClaude turn"} が未解決です`,
        2,
      );
    }
    return { ...base, status: "pending", raw_output: null, reason: null };
  }
  if (!hasClaudeDispatchReceipt(meta, operationId)) {
    return { ...base, status: "unknown", raw_output: null, reason: "operation_not_found" };
  }
  const done = completedClaudeOperationEvent(meta, operationId);
  if (!done) return { ...base, status: "unknown", raw_output: null, reason: "result_unknown" };
  if (!meta.vendor_session_id && done.vendor_session_id) {
    bindAgentVendorSession(meta, done);
    writeAgentMetadata(meta);
  }
  const rawOutput = readClaudeResultText(meta, done, operationId);
  return { ...base, status: "completed", raw_output: rawOutput, reason: null };
}

// ── 対話型エージェント起動（Claude / Codex / Grok Build(Grok) / Grok Build(Composer)）──────
// aiterm の永続端末に、指定モデルの対話エージェント TUI を起動する。以後は pty_read で画面を
// 読み、pty_send で操作する＝aiterm の対話パラダイムそのもの。モデルはツールごとに固定し、
// reasoning effort は引数で渡す。CLI 未導入環境は明示エラー（動くフリをしない）。
function resolveAgentBin(kind: AgentKind): string | null {
  const home = process.env.HOME ?? os.homedir();
  const [envVar, rel, name] =
    kind === "claude"
      ? ["CLAUDE_BIN", [".local", "bin", "claude"], "claude"]
      : kind === "codex"
      ? ["CODEX_BIN", [".local", "bin", "codex"], "codex"]
      : ["GROK_BIN", [".grok", "bin", "grok"], "grok"];
  const fromEnv = process.env[envVar as string];
  if (fromEnv) {
    // 明示指定 env は実在を検証する。存在しないパスを黙って返すと、session を作って
    // `'/typo' ...` を送信し bash が command not found を出すだけで openAgent は「起動した」と
    // 偽成功を返す（既定パス/PATH 経路は検証するのに env だけ無検証だった非対称の解消・A3）。
    if (isUsableExecutableFile(fromEnv)) return fromEnv;
    throw new AitermError(`${envVar} に指定された ${name} が存在しません: ${fromEnv}`, 2);
  }
  const cand = path.join(home, ...(rel as string[]));
  if (isUsableExecutableFile(cand)) return cand;
  const w = spawnSync(isWin ? "where" : "which", [name as string], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (w.status === 0 && (w.stdout ?? "").trim()) {
    const resolved = w.stdout.trim().split(/\r?\n/)[0];
    if (isUsableExecutableFile(resolved)) return resolved;
  }
  return null;
}

const CLAUDE_AUTH_STATUS_TIMEOUT_MS = 5_000;

function assertClaudeAuthenticationReady(bin: string): void {
  const result = spawnSync(bin, ["auth", "status", "--json"], {
    encoding: "utf8",
    timeout: CLAUDE_AUTH_STATUS_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
  });
  let status: unknown = null;
  try {
    status = JSON.parse((result.stdout ?? "").trim());
  } catch {
    status = null;
  }
  if (
    result.error == null &&
    result.status === 0 &&
    status !== null &&
    typeof status === "object" &&
    !Array.isArray(status) &&
    (status as { loggedIn?: unknown }).loggedIn === true
  ) {
    return;
  }
  if (
    status !== null &&
    typeof status === "object" &&
    !Array.isArray(status) &&
    (status as { loggedIn?: unknown }).loggedIn === false
  ) {
    throw new AitermError(
      "Claude Codeの認証を利用できません。sessionは作成していません。" +
        "通常端末で `claude doctor` を実行し、Keychain／credential storeを直してから一度だけ `claude auth login` を実行してください。" +
        "managed Claude session内で /login を繰り返さないでください。",
      2,
    );
  }
  const timedOut = result.error && (result.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
  throw new AitermError(
    `Claude Codeの認証状態を起動前に確認できません${timedOut ? "（5秒でtimeout）" : ""}。sessionは作成していません。` +
      "`claude auth status --json` と `claude doctor` が成功することを通常端末で確認してください。",
    2,
  );
}

function isUsableExecutableFile(candidate: string): boolean {
  try {
    if (!fs.statSync(candidate).isFile()) return false;
    if (isWin) return /\.(?:exe|cmd|bat|com)$/i.test(candidate);
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** vendor CLI の存在だけを安全に要約する。認証状態・実行出力・解決先 path は返さない。 */
export function vendorLauncherDiagnostic(kind: AgentKind): DiagnosticStatus {
  try {
    return resolveAgentBin(kind) ? "ready" : "not_applicable";
  } catch {
    return "unverified";
  }
}

// 単一引用符で安全に包む（' は '\'' で脱出）。send は raw:true で送るため自前で quote する。
function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

// grok CLI はモデル未指定だと端末側 default に従うため、ツール契約として既定 slug を固定する。
// codex は既定 slug を持たず端末 config／CLI 既定に委ねる（起動応答で実効値を報告する）。
const GROK_MODEL_DEFAULTS: Record<"grok" | "composer", string> = {
  grok: "grok-4.5",
  composer: "grok-composer-2.5-fast",
};
const CLAUDE_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

function buildAgentCmd(
  kind: AgentKind,
  bin: string,
  model: string | null,
  effort: string | null,
  prompt: string | null,
  meta: AgentMetadata | null = null,
): string {
  const parts: string[] = [shq(bin)];
  if (kind === "claude") {
    if (meta?.kind === "claude") {
      parts.push(
        "--setting-sources",
        shq("user,project,local"),
        "--settings",
        shq(meta.claude_settings ?? ""),
        "--session-id",
        shq(meta.vendor_session_id ?? ""),
        "--append-system-prompt",
        shq(subagentInstruction(meta)),
      );
    }
    if (model) parts.push("--model", shq(model));
    if (effort) parts.push("--effort", shq(effort));
  } else if (kind === "codex") {
    // `codex --help` で確認した実在フラグ。read-only 宣言だけはCLI sandboxへ落とし、
    // launcher自身が実効能力壁を作る。パス説明はCodex CLIに同等のallowlist引数がないため宣言のまま残す。
    if (meta?.kind === "codex" && meta.write_scope === "read-only") parts.push("--sandbox", "read-only");
    // model/effort は共有configを書き換えず、CLI引数で明示して起動単位に優先する。
    if (model) parts.push("-m", shq(model));
    if (effort) parts.push("-c", `model_reasoning_effort=${shq(effort)}`);
    if (meta?.kind === "codex" && meta.hook_route === "shared_codex_home") {
      parts.push("-c", `developer_instructions=${shq(subagentInstruction(meta))}`);
    }
  } else {
    // grok / composer は同じ grok CLI をモデル違いで起動。--effort は headless（grok -p）専用で
    // 対話 TUI では警告の上無視されるため渡さない（openAgent が指定を事前拒否する）。
    parts.push("--no-auto-update");
    if (meta?.kind === "grok" || meta?.kind === "composer") parts.push("--no-alt-screen");
    parts.push("--model", shq(model ?? GROK_MODEL_DEFAULTS[kind]));
    if ((meta?.kind === "grok" || meta?.kind === "composer") && meta.hook_route === "shared_grok_home") {
      parts.push("--session-id", shq(meta.vendor_session_id ?? ""), "--rules", shq(subagentInstruction(meta)));
    }
    if ((meta?.kind === "grok" || meta?.kind === "composer") && prompt) parts.push("--verbatim");
  }
  if (prompt) parts.push(shq(prompt)); // 初手プロンプト（任意）
  return parts.join(" ");
}

function agentEnvPrefix(meta: AgentMetadata | null, sid: string): string {
  if (!meta) return "";
  const common = [
    `AITERM_AGENT_KIND=${shq(meta.kind)}`,
    `AITERM_SESSION_ID=${shq(sid)}`,
    `AITERM_AGENT_SESSION_ID=${shq(sid)}`,
    `AITERM_AGENT_LAUNCH_ID=${shq(meta.launch_id)}`,
    `AITERM_AGENT_ROLE=${shq(meta.agent_role ?? "subagent")}`,
    `AITERM_AGENT_PARENT_SESSION_ID=${shq(meta.parent_session_id ?? "host-root")}`,
    `AITERM_AGENT_DEPTH=${shq(String(meta.delegation_depth ?? 1))}`,
    `AITERM_AGENT_LINEAGE=${shq(meta.lineage ?? `host-root>${meta.kind}:${sid}`)}`,
    `AITERM_AGENT_DELEGATION_ALLOWED=${shq(meta.delegation_allowed === true ? "true" : "false")}`,
  ];
  if (meta.kind === "claude") {
    return common.join(" ") + " ";
  }
  if (meta.kind === "codex") {
    return common.join(" ") + " ";
  }
  return [
    ...(meta.grok_auth_path ? [`GROK_AUTH_PATH=${shq(meta.grok_auth_path)}`] : []),
    "GROK_DISABLE_AUTOUPDATER=1",
    ...common,
  ].join(" ") + " ";
}

function agentLabel(kind: AgentKind): string {
  return kind === "claude"
    ? "Claude Code"
    : kind === "composer"
    ? "Grok Build(Composer)"
    : kind === "grok"
      ? "Grok Build(Grok)"
      : "Codex";
}

// 起動応答にモデル/effort の実効値と出所を明示する。codex は端末 config のピン（model /
// model_reasoning_effort）が対話子へ波及する構造のため、引数・端末config継承・CLI既定の
// どれで起動したかを起動時点で可視化し、実効 effort=ultra は proactive 自動委譲 ON を警告する。
function buildAgentLaunchNote(
  kind: AgentKind,
  model: string | null,
  effort: string | null,
  meta: AgentMetadata | null,
): string {
  const writeScopeNote = meta?.write_scope === undefined
    ? ""
    : kind === "codex" && meta.write_scope === "read-only"
      ? `\n能力宣言: write_scope=${JSON.stringify(meta.write_scope)}。Codex CLIへ --sandbox read-only を付与し、書込みを実効禁止。`
      : `\n能力宣言: write_scope=${JSON.stringify(meta.write_scope)}。${kind === "grok" || kind === "composer" ? "このCLIには起動sandbox機構がないため" : "パス単位のsandbox allowlistに対応するCLI引数がないため"}宣言の記録のみ（構造的unsupported）。`;
  if (kind === "claude") {
    return `起動設定: model=${model ?? "CLI既定"} effort=${effort ?? "CLI既定"}。${writeScopeNote}`;
  }
  if (kind !== "codex") {
    return (
      `起動設定: model=${model ?? GROK_MODEL_DEFAULTS[kind]}（${model ? "引数" : "ツール既定"}）。` +
      "reasoning effort は対話 TUI 非対応＝未指定で起動。" + writeScopeNote
    );
  }
  const configPath =
    meta?.kind === "codex" && meta.codex_home
      ? path.join(meta.codex_home, "config.toml")
      : path.join(realCodexHome(), "config.toml");
  const pins = readCodexConfigPins(configPath);
  const describePin = (arg: string | null, pin: CodexConfigPin): string =>
    arg
      ? `${arg}（引数）`
      : pin.present
        ? pin.value
          ? `${pin.value}（端末config継承）`
          : "端末config継承（値未解析）"
        : "CLI既定";
  const effectiveEffort = effort ?? (pins.effort.present ? pins.effort.value : null);
  const launch =
    `起動設定: model=${describePin(model, pins.model)} effort=${describePin(effort, pins.effort)}。` +
    (effectiveEffort === "ultra"
      ? "⚠ effort=ultra は max 推論＋proactive 自動委譲 ON（子エージェント自動生成・使用量急増に注意）。"
      : "");
  const summary = meta?.kind === "codex" && meta.codex_home ? codexConfigSummary(configPath) : "";
  return (summary ? `${launch}\n${summary}\n` : launch) + writeScopeNote;
}

function claudeLaunchRequestDigest({
  sessionName,
  model,
  effort,
  cwd,
  agentDone,
}: {
  sessionName: string;
  model: string | null;
  effort: string | null;
  cwd: string | null;
  agentDone: boolean;
}): string {
  const canonical = JSON.stringify({
    schema: "aiterm.claude-agent-launch-request.v1",
    provider: "claude",
    session_name: sessionName,
    model,
    reasoning_effort: effort,
    cwd,
    managed_completion: agentDone,
  });
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function requireMatchingClaudeLaunch(name: string, operationId: string, requestDigest: string): AgentMetadata {
  const meta = loadAgentMetadata(name);
  if (meta.kind !== "claude") {
    throw new AitermError(`session '${name}' は相関対象のClaude agent sessionではありません`, 2);
  }
  if (meta.launch_operation_id !== operationId || meta.launch_request_digest !== requestDigest) {
    throw new AitermError(
      `session '${name}' のClaude launch identityが一致しません。既存sessionをcloseするまで再利用できません`,
      2,
    );
  }
  return meta;
}

function existingAgentLaunchResult(
  kind: AgentKind,
  sid: string,
  model: string | null,
  effort: string | null,
): [string, string] {
  return [
    sid,
    `${agentLabel(kind)} の相関済みlaunchを既存session ${sid} から回収した。` +
      `${buildAgentLaunchNote(kind, model, effort, null)}CLIは再送していません。\n${attachHint(sid)}`,
  ];
}

export function openAgent(
  kind: AgentKind,
  opts: {
    session_name?: string | null;
    model?: string | null;
    reasoning_effort?: string | null;
    cwd?: string | null;
    prompt?: string | null;
    agent_done?: boolean | null;
    launch_operation_id?: string | null;
    write_scope?: string;
  } = {},
): [string, string] {
  const label = agentLabel(kind);
  // 前提検証は session を作る前に全部済ませる（失敗の残骸 session を作らない）。
  // model/effort → bin → cwd の順: model/effort 検証は CLI 不在の端末でも同じ結果になる（テスト可能性）。
  let model: string | null = null;
  if (opts.model != null) {
    model = opts.model.trim();
    if (!model) throw new AitermError("model が空文字です（省略するか有効なモデル名を指定してください）", 2);
  }
  const effort = opts.reasoning_effort ?? null;
  const writeScope = opts.write_scope;
  if (effort && kind === "claude" && !CLAUDE_EFFORTS.has(effort)) {
    throw new AitermError("Claude Code の reasoning_effort は low/medium/high/xhigh/max のいずれかです", 2);
  }
  // grok CLI の --effort は headless（grok -p）専用で、対話 TUI では警告の上無視される。
  // 黙って no-op の引数を受けない＝起動前に明示エラーで拒否する（codex は CLI 側の値集合が
  // 版で変わるため縛らず送信まで通す）。
  if (effort && kind === "grok") {
    throw new AitermError(
      `${label} は reasoning_effort を指定できません。grok CLI の --effort は headless（grok -p）専用で、` +
        "対話 TUI では警告の上無視されます（grok-4.5 の TUI 既定 effort は high）。" +
        "effort 制御が必要なら通常 PTY で `grok -p --effort low|medium|high ...` を使ってください",
      2,
    );
  }
  if (effort && kind === "composer") {
    throw new AitermError(
      `${label} は reasoning_effort を指定できません。grok-composer-2.5-fast は reasoning effort 非対応です` +
        "（モデルカタログ supports_reasoning_effort=false）",
      2,
    );
  }
  const agentDone = !!opts.agent_done;
  const launchOperationId = opts.launch_operation_id == null
    ? null
    : validateOperationId(opts.launch_operation_id);
  if (launchOperationId !== null) {
    if (kind !== "claude") {
      throw new AitermError("launch_operation_idはClaude agentだけで指定できます", 2);
    }
    if (!opts.session_name) {
      throw new AitermError("launch_operation_idには明示session_nameが必要です", 2);
    }
    assertSessionName(opts.session_name);
    if (!agentDone) {
      throw new AitermError("launch_operation_idにはagent_done:trueが必要です", 2);
    }
    if (opts.prompt != null) {
      throw new AitermError("launch_operation_id付きlaunchにpromptは指定できません", 2);
    }
  }
  // 継承lineageの破損はsession作成前にfail loudする。root callerにはhost-root/depth 1を割り当てる。
  const lineageSeed = readAgentLineageSeed();
  let bin: string | null;
  try {
    bin = resolveAgentBin(kind);
  } catch (error) {
    ownTelemetryFailure("AITERM.VENDOR_LAUNCHER_FAILED", error, 2);
  }
  if (!bin) {
    const where = kind === "claude" ? "~/.local/bin/claude" : kind === "codex" ? "~/.local/bin/codex" : "~/.grok/bin/grok";
    ownTelemetryFailure("AITERM.VENDOR_LAUNCHER_FAILED", new AitermError(`${label} の CLI が見つかりません（${where} か PATH が必要）`, 2), 2);
  }
  // cwd 検証（session を作る前に。cd 失敗はシェル内で静かに死に「起動した」と偽成功を返すため）。
  let cwd: string | null = null;
  if (opts.cwd != null) {
    if (!opts.cwd.trim()) {
      throw new AitermError("cwd が空文字です（省略するか有効なディレクトリを指定してください）", 2); // A6
    }
    if (opts.cwd.startsWith("~")) {
      // statSync は ~ を展開しない。「存在しません」でなく展開されない旨を正直に伝える（A6）。
      throw new AitermError(`cwd の ~ は展開されません。絶対パスで指定してください: ${opts.cwd}`, 2);
    }
    let st: fs.Stats | null = null;
    try {
      st = fs.statSync(opts.cwd);
    } catch {
      st = null;
    }
    if (!st || !st.isDirectory()) {
      throw new AitermError(`cwd '${opts.cwd}' がディレクトリとして存在しません`, 2);
    }
    cwd = opts.cwd;
  }
  const launchRequestDigest = launchOperationId === null
    ? null
    : claudeLaunchRequestDigest({
        sessionName: opts.session_name as string,
        model,
        effort,
        cwd,
        agentDone,
      });
  if (launchOperationId !== null && sessionExists(opts.session_name as string)) {
    requireMatchingClaudeLaunch(opts.session_name as string, launchOperationId, launchRequestDigest as string);
    return existingAgentLaunchResult("claude", opts.session_name as string, model, effort);
  }
  if (kind === "claude") assertClaudeAuthenticationReady(bin);
  // Windows は起動コマンドが WSL 内 bash で走る（tmux ブリッジ）。bin/cwd を /mnt/c/... 形へ変換して
  // 渡す（ログの toWslPath と対称・A1）。前提: Windows 側に CLI を導入（resolveAgentBin が Windows
  // パスで解決）。toWslPath は session を作る前に呼ぶ＝変換失敗（非ドライブパス）で残骸 session を残さない。
  // 未検証リスク: npm グローバル導入の codex.cmd/.bat シムや WSL interop 上の対話 TUI 描画は実 Windows
  // でしか確認できない（CI 非対象。docs/03_audit-sweep-2026-07.md 参照）。
  const binForCmd = isWin ? toWslPath(bin) : bin;
  const cwdForCmd = cwd && isWin ? toWslPath(cwd) : cwd;
  const grokAuthPath = agentDone && (kind === "grok" || kind === "composer") ? resolveAndValidateGrokAuth(realGrokHome()) : null;

  let sid: string;
  let hint: string;
  try {
    [sid, hint] = openSession(opts.session_name ?? null, "bash");
  } catch (error) {
    if (launchOperationId !== null && sessionExists(opts.session_name as string)) {
      requireMatchingClaudeLaunch(opts.session_name as string, launchOperationId, launchRequestDigest as string);
      return existingAgentLaunchResult("claude", opts.session_name as string, model, effort);
    }
    throw error;
  }
  let launchNote = "";
  try {
    const lineageContext = createAgentLineageContext(kind, sid, lineageSeed);
    const meta = agentDone
      ? kind === "claude"
        ? createClaudeAgentMetadata(
            sid,
            cwd,
            opts.prompt ? "pending" : "none",
            launchOperationId,
            launchRequestDigest,
            lineageContext,
          )
        : kind === "codex"
        ? createCodexAgentMetadata(sid, cwd, opts.prompt ? "pending" : "none", { model, effort }, writeScope, lineageContext)
        : createGrokAgentMetadata(kind, sid, cwd, opts.prompt ? "pending" : "none", grokAuthPath, writeScope, lineageContext)
      : null;
    if (meta) agentMetadataNegativeCache.delete(sid);
    launchNote = buildAgentLaunchNote(kind, model, effort, meta);
    const cmd = buildAgentCmd(kind, binForCmd, model, effort, opts.prompt ?? null, meta);
    const envPrefix = agentEnvPrefix(meta, sid);
    const full = cwdForCmd ? `cd ${shq(cwdForCmd)} && ${envPrefix}${cmd}` : `${envPrefix}${cmd}`;
    // force:true で送る。起動骨格は `bin '...'` の固定形で、prompt/cwd/effort は shq でクオート済みの
    // 引数＝シェルは決して破壊コマンドとして実行しない。破壊ゲート（生シェルコマンド想定）を prompt に
    // 掛けるのは純誤検知で、`codex 'rm -rf / を説明して'` 等の正当な起動を塞いでしまう（A4）。
    send(sid, full, {
      enter: true,
      mark: false,
      force: true,
      rtk: false,
      raw: true,
      preserveAgentOperation: meta?.kind === "claude",
    });
  } catch (e) {
    const failure = telemetryOwnedFailure("AITERM.VENDOR_LAUNCHER_FAILED", e);
    // 起動コマンドを投入できなかった session は空のまま残る＝残骸を作らない。片付けてから元エラーを伝える。
    try {
      closeSessionInternal(sid, false);
    } catch {
      /* 片付け失敗より元エラーの伝達を優先 */
    }
    throw failure;
  }
  const driveHint =
    agentDone && kind === "claude"
      ? `TUI の描画には数秒かかる。少し置いてから pty_read(${sid}, screen:true) で画面を読み、` +
        `turnはpty_send(${sid}, "...")で送る（自動で非ブロックdispatch＝投げっぱなしでよい・完了通知はaiterm-wait）。中断はpty_key(${sid}, "C-c")、` +
        `Stopが来ない場合の解除はpty_close(${sid})を使う。`
      : `TUI の描画には数秒かかる。少し置いてから pty_read(${sid}, screen:true) で画面を読み、` +
        `pty_send(${sid}, "...") で入力・pty_key(${sid}, "Enter"/"Up"/"C-c" 等) で操作する（対話）。`;
  return [
    sid,
    `${label} を session ${sid} で起動した。${launchNote}${agentDone ? "agent_done 待機が有効。" : ""}` +
      `${agentDone ? " 通常のproject／user環境を共有し、aiterm所有の完了相関とsub-agent lineageだけを加算。" : ""}\n${hint}\n` +
      driveHint +
      `起動直後に増分 pty_read すると空/半描画になり得るので screen:true を使う。`,
  ];
}


export async function openAgentWithInitialPrompt(
  kind: AgentKind,
  opts: {
    session_name?: string | null;
    model?: string | null;
    reasoning_effort?: string | null;
    cwd?: string | null;
    prompt?: string | null;
    ready_timeout?: number | null;
    launch_operation_id?: string | null;
    write_scope?: string;
  } = {},
): Promise<[string, string, number | null, boolean | null]> {
  const prompt = opts.prompt ?? null;
  if (opts.launch_operation_id != null && prompt !== null) {
    throw new AitermError("launch_operation_idはpromptなしのmanaged Claude launchだけで指定できます", 2);
  }
  // v0.16.0: launcher は常に managed（Stop hook つき）で立つ。手動運転したい場合は
  // pty_open で素の PTY を開き、vendor CLI を自分で send する。
  // 第3要素は「起動時点でturnが走っているか」の event_cursor: Grok/Composer の argv prompt は
  // event file 新規作成直後の起動＝境界0、prompt なしの起動は turn なし＝null。
  if (!prompt || (kind !== "codex" && kind !== "claude")) {
    const [sid, hint] = openAgent(kind, {
      session_name: opts.session_name ?? null,
      model: opts.model ?? null,
      reasoning_effort: opts.reasoning_effort ?? null,
      cwd: opts.cwd ?? null,
      prompt,
      agent_done: true,
      launch_operation_id: opts.launch_operation_id ?? null,
      write_scope: opts.write_scope,
    });
    // argv prompt（grok/composer）は composer を経由しないため submit 座礁観測の対象外。
    return [sid, hint, prompt ? 0 : null, null];
  }
  const [sid, hint] = openAgent(kind, {
    session_name: opts.session_name ?? null,
    model: opts.model ?? null,
    reasoning_effort: opts.reasoning_effort ?? null,
    cwd: opts.cwd ?? null,
    prompt: null,
    agent_done: true,
    launch_operation_id: opts.launch_operation_id ?? null,
    write_scope: opts.write_scope,
  });
  try {
    const initial = await sendInitialAgentPrompt(sid, prompt, {
      ready_timeout: opts.ready_timeout ?? undefined,
    });
    return [sid, `${hint}\n${initial.text}`, initial.event_cursor, initial.submit_residue];
  } catch (e) {
    const code = e instanceof AitermError ? e.code : 1;
    const message = e instanceof Error ? e.message : String(e);
    throw new AitermError(
      `session_id: ${sid}\n` +
        `起動後の初回 prompt 処理で失敗しました。session は調査/復旧用に残しています。\n${message}`,
      code,
    );
  }
}

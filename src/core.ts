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
import { createHash, randomBytes } from "node:crypto";
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
// mark の sentinel は POSIX シェル構文（; と "$?"）に依存する。これらの非 POSIX 対話シェルが
// 前面のときは "$?" が正しく展開されず sentinel が壊れるので mark を拒否する（B8）。ssh/docker で
// リモート POSIX シェルに入っている場合は前面が "ssh"/"docker" 等で本集合に含まれず＝許可される。
const NON_POSIX_MARK_SHELLS = new Set(["fish", "csh", "tcsh"]);

// mark:true が付ける完了 sentinel の検出正規表現。printf の実出力は rc=<数字>、コマンド行の
// エコーは rc=%d(リテラル)。数字アンカーでエコーに免疫化し、部分一致による早期誤完了を防ぐ（B1）。
// send の printf 書式（`rc=%d`）と対で保守すること。
const MARK_DONE_RE = /<<<AITERM_DONE rc=[0-9]+>>>/;

// 出力削減（RTK の CAP 思想を移植）
const MAX_LINES_BEFORE_ELIDE = 60;
const HEAD_LINES = 30;
const TAIL_LINES = 20;
const DEDUP_MIN_RUN = 3; // 同一行がこれ以上連続したら 1 行＋件数に畳む

// 安全: send 前に弾く破壊的コマンド（外部システム境界の防御）
const DESTRUCTIVE: RegExp[] = [
  // rm -rf の危険な対象形（best-effort・force で越えられる）。先頭の任意クオート ['"]? で
  // `rm -rf "/"` / `'/'` / `"~"` を捕捉。`\.\/\*`=./*（相対 glob）、`\.\.?\/?\s*$`=. / .. / ./ / ../
  // （カレント/親そのもの）。`./build` 等の相対サブディレクトリは末尾でないので非該当（過剰ブロック回避）。
  /\brm\s+-[rfRF]*[rf][rfRF]*\s+['"]?(\/|~|\$HOME|\.\/\*|\.\.?\/?\s*$|\*\s*$)/i,
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
function resolveTmux(): string {
  if (tmuxBin) return tmuxBin;
  const override = process.env.AITERM_TMUX;
  if (override) {
    const r = spawnSync(override, ["-V"], { encoding: "utf8", timeout: 5000 });
    if (!r.error && r.status === 0) return (tmuxBin = override);
    throw new AitermError(
      `AITERM_TMUX に指定された tmux を起動できません: ${override}（\`${override} -V\` が通りません）`,
      2,
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
  throw new AitermError(tmuxMissingMessage(), 2);
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
    // resolveTmux() は tmux を解決できなければ明確な AitermError を投げる（POSIX 版の事前確認）。
    r = spawnSync(resolveTmux(), ["-S", SOCK, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
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
    throw new AitermError(tmuxMissingMessage(), 2);
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
// mark:true 送信中フラグ。存在すれば waitCompletion が sentinel 完了検出（MARK_DONE_RE）を有効化する。
function markpath(name: string): string {
  return path.join(SOCKDIR, name + ".mark");
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
    const alive = sessionExists(name);
    let size = 0;
    try {
      size = fs.statSync(logpath(name)).size;
    } catch {
      size = 0;
    }
    if ((until || markActive) && size > start) {
      let neu = "";
      try {
        neu = stripControl(fs.readFileSync(logpath(name)).subarray(start).toString("utf8"));
      } catch {
        neu = ""; // close 等でログが消えた: 次周回の !alive/statSync で決着させる
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
    if (!alive) {
      if (isWin) await settleWinLog(name);
      return [true, "dead"];
    }
    if (size === lastSize) {
      stable++;
      if (stable >= STABLE_POLLS) {
        const fg = paneCurrentCommand(name);
        if (SHELLS.has(fg)) {
          if (isWin) await settleWinLog(name);
          return [true, "quiescent"]; // 出力静止 ∧ シェル復帰 ＝ 確証つき完了
        }
        // ネスト中（前面が ssh/docker/REPL 等でシェル集合外）は quiescence の「シェル復帰」条件を
        // 原理的に満たせない。until も mark も無ければこれ以上待っても確証は増えない（until/dead/
        // quiescent/mark のいずれも発火し得ない）ので、出力静止時点で「未確定」のまま早期返却する。
        // markActive のときは sentinel を待つべく早期返却せず、非シェル前面（sleep 等）でも待ち続ける。
        // fg==="" は前面コマンド取得失敗＝ネスト断定不可なので早期返却せず従来どおり timeout まで待つ。
        if (!until && !markActive && fg !== "") {
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

// ---------------------------------------------------------------- 操作（return で返す / 失敗は AitermError）

export function openSession(name?: string | null, shell = "bash"): [string, string] {
  fs.mkdirSync(SOCKDIR, { recursive: true });
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
  fs.closeSync(fs.openSync(logpath(nm), "a")); // touch
  // pipe-pane の引数は tmux 内部の /bin/sh -c で再解釈される（argv ではない）。パスは単一引用符で包み、
  // パス自身の ' は '\'' イディオムでエスケープする（名前は検証済みだが、Windows ユーザー名 O'Brien 等が
  // 一時パスに ' を持ち込み redirect を壊すのを防ぐ。空白対策も兼ねる）。Windows は WSL から見える /mnt/c 形へ。
  const pipeTarget = isWin ? toWslPath(logpath(nm)) : logpath(nm);
  const quoted = `'${pipeTarget.replace(/'/g, "'\\''")}'`;
  const pr = tmux("pipe-pane", "-t", nm, "-o", `cat >> ${quoted}`);
  if (pr.code !== 0) {
    // 配管に失敗した session は pty_read が永遠に空を返す＝成功を装わない。作った session を片付けて明示エラー。
    tmux("kill-session", "-t", nm);
    throw new AitermError("tmux pipe-pane 失敗（出力ログを配管できないため session を破棄）: " + pr.stderr.trim(), 2);
  }
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
  writeLastcmd(name, text); // read rtk の reducer 分類用（書換/mark 前の素のコマンド）
  if (o.rtk) text = rtkRewrite(text);
  if (o.mark) {
    // 実出力は rc=<数字>、この行のエコーは rc=%d(リテラル)。MARK_DONE_RE は数字アンカーで後者に免疫。
    text = text + `; printf '\\n<<<AITERM_DONE rc=%d>>>\\n' "$?"`;
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
  untilRegex?: boolean; // until を正規表現として扱う（既定 false＝リテラル部分一致）。B4。
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
    const [, st] = await waitCompletion(name, o.until ?? null, o.untilRegex ?? false, timeout);
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
        if (status) return reduced + "\n" + meta + completionSuffix(status);
        return reduced + "\n" + meta;
      }
    }
    // reducer 非該当 → 汎用削減へフォールバック
  }

  const [body, meta] = reduceOutput(text, name, !o.range);
  if (status) return body + "\n" + meta + completionSuffix(status);
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
  for (const p of [logpath(name), offsetpath(name), lastcmdpath(name), markpath(name)]) {
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

// ── 対話型エージェント起動（Codex / Grok Build(Grok) / Grok Build(Composer)）──────
// aiterm の永続端末に、指定モデルの対話エージェント TUI を起動する。以後は pty_read で画面を
// 読み、pty_send で操作する＝aiterm の対話パラダイムそのもの。モデルはツールごとに固定し、
// reasoning effort は引数で渡す。CLI 未導入環境は明示エラー（動くフリをしない）。
type AgentKind = "codex" | "grok" | "composer";

function resolveAgentBin(kind: AgentKind): string | null {
  const home = process.env.HOME ?? os.homedir();
  const [envVar, rel, name] =
    kind === "codex"
      ? ["CODEX_BIN", [".local", "bin", "codex"], "codex"]
      : ["GROK_BIN", [".grok", "bin", "grok"], "grok"];
  const fromEnv = process.env[envVar as string];
  if (fromEnv) {
    // 明示指定 env は実在を検証する。存在しないパスを黙って返すと、session を作って
    // `'/typo' ...` を送信し bash が command not found を出すだけで openAgent は「起動した」と
    // 偽成功を返す（既定パス/PATH 経路は検証するのに env だけ無検証だった非対称の解消・A3）。
    if (fs.existsSync(fromEnv)) return fromEnv;
    throw new AitermError(`${envVar} に指定された ${name} が存在しません: ${fromEnv}`, 2);
  }
  const cand = path.join(home, ...(rel as string[]));
  if (fs.existsSync(cand)) return cand;
  const w = spawnSync(isWin ? "where" : "which", [name as string], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (w.status === 0 && (w.stdout ?? "").trim()) return w.stdout.trim().split(/\r?\n/)[0];
  return null;
}

// 単一引用符で安全に包む（' は '\'' で脱出）。send は raw:true で送るため自前で quote する。
function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function buildAgentCmd(
  kind: AgentKind,
  bin: string,
  effort: string | null,
  prompt: string | null,
): string {
  const parts: string[] = [shq(bin)];
  if (kind === "codex") {
    // codex は config override で reasoning effort（例: low/medium/high）を渡す。
    if (effort) parts.push("-c", `model_reasoning_effort=${shq(effort)}`);
  } else {
    // grok / composer は同じ grok CLI をモデル違いで起動。effort は low/medium/high/xhigh/max。
    parts.push("--model", kind === "composer" ? "grok-composer-2.5-fast" : "grok-build");
    if (effort) parts.push("--effort", shq(effort));
  }
  if (prompt) parts.push(shq(prompt)); // 初手プロンプト（任意）
  return parts.join(" ");
}

function agentLabel(kind: AgentKind): string {
  return kind === "composer"
    ? "Grok Build(Composer)"
    : kind === "grok"
      ? "Grok Build(Grok)"
      : "Codex";
}

// grok CLI の --effort が受ける値集合（codex は CLI 側の値集合が版で変わるため縛らない）。
const GROK_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function openAgent(
  kind: AgentKind,
  opts: {
    session_name?: string | null;
    reasoning_effort?: string | null;
    cwd?: string | null;
    prompt?: string | null;
  } = {},
): [string, string] {
  const label = agentLabel(kind);
  // 前提検証は session を作る前に全部済ませる（失敗の残骸 session を作らない）。
  // effort → bin → cwd の順: effort 検証は CLI 不在の端末でも同じ結果になる（テスト可能性）。
  const effort = opts.reasoning_effort ?? null;
  if (effort && kind !== "codex" && !GROK_EFFORTS.has(effort)) {
    throw new AitermError(
      `reasoning_effort '${effort}' は不正です（${label} は low/medium/high/xhigh/max）`,
      2,
    );
  }
  const bin = resolveAgentBin(kind);
  if (!bin) {
    const where = kind === "codex" ? "~/.local/bin/codex" : "~/.grok/bin/grok";
    throw new AitermError(`${label} の CLI が見つかりません（${where} か PATH が必要）`, 2);
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
  // Windows は起動コマンドが WSL 内 bash で走る（tmux ブリッジ）。bin/cwd を /mnt/c/... 形へ変換して
  // 渡す（ログの toWslPath と対称・A1）。前提: Windows 側に CLI を導入（resolveAgentBin が Windows
  // パスで解決）。toWslPath は session を作る前に呼ぶ＝変換失敗（非ドライブパス）で残骸 session を残さない。
  // 未検証リスク: npm グローバル導入の codex.cmd/.bat シムや WSL interop 上の対話 TUI 描画は実 Windows
  // でしか確認できない（CI 非対象。docs/03_audit-sweep-2026-07.md 参照）。
  const binForCmd = isWin ? toWslPath(bin) : bin;
  const cwdForCmd = cwd && isWin ? toWslPath(cwd) : cwd;

  const [sid, hint] = openSession(opts.session_name ?? null, "bash");
  const cmd = buildAgentCmd(kind, binForCmd, effort, opts.prompt ?? null);
  const full = cwdForCmd ? `cd ${shq(cwdForCmd)} && ${cmd}` : cmd;
  try {
    // force:true で送る。起動骨格は `bin '...'` の固定形で、prompt/cwd/effort は shq でクオート済みの
    // 引数＝シェルは決して破壊コマンドとして実行しない。破壊ゲート（生シェルコマンド想定）を prompt に
    // 掛けるのは純誤検知で、`codex 'rm -rf / を説明して'` 等の正当な起動を塞いでしまう（A4）。
    send(sid, full, { enter: true, mark: false, force: true, rtk: false, raw: true });
  } catch (e) {
    // 起動コマンドを投入できなかった session は空のまま残る＝残骸を作らない。片付けてから元エラーを伝える。
    try {
      closeSession(sid);
    } catch {
      /* 片付け失敗より元エラーの伝達を優先 */
    }
    throw e;
  }
  return [
    sid,
    `${label} を session ${sid} で起動した。\n${hint}\n` +
      `TUI の描画には数秒かかる。少し置いてから pty_read(${sid}, screen:true) で画面を読み、` +
      `pty_send(${sid}, "...") で入力・pty_key(${sid}, "Enter"/"Up"/"C-c" 等) で操作する（対話）。` +
      `起動直後に増分 pty_read すると空/半描画になり得るので screen:true を使う。`,
  ];
}

// 端末多重化 runtime の所有者。tmux（POSIX）/ psmux（Windows native）をどう見つけ、
// どの socket / namespace で、どの locale で叩くかはこのモジュールだけが知る。
// OS 分岐（isWin）と観測・起動規約の正本。
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createHash } from "node:crypto";
import { AitermError, ptyDependencyError } from "./errors.js";

// Windows ネイティブには tmux が無いため、tmux CLI 互換の native psmux を叩く
// （POSIX = Linux/WSL2/macOS は従来どおり tmux を直接叩く。WSL 橋は e3f5fc8 で全廃）。
export const isWin = process.platform === "win32";

// .log/.offset/.lastcmd を置くディレクトリ（Node が直接読み書きする）。
// POSIX は従来どおり。Windows は TMPDIR→TEMP→os.tmpdir() の順で Windows 側の一時領域に置く。
export const SOCKDIR = path.join(
  process.env.TMPDIR ?? (isWin ? process.env.TEMP ?? os.tmpdir() : "/tmp"),
  "claude-tmux-sockets",
);
// tmux -S に渡すソケットパス（POSIX はログと同じツリーに置く）。
// Windows は native psmux を使い、-S でなく -L server namespace で隔離する
// （psmux の -S は黙って既定 namespace へ落ちるため使わない・実測 2026-08-16）。
// SOCKDIR から短い安定名を導出し、TMPDIR ごとの隔離（テスト）と再起動跨ぎ再接続を両立する。
export const SOCK = path.join(SOCKDIR, "claude.sock");
export const WIN_NS = `aiterm-${createHash("sha1").update(SOCKDIR).digest("hex").slice(0, 12)}`;

// Windows で最初の呼び出し前に一度だけ native psmux の可用性を確かめ、失敗は原因別に投げる。
// psmux は tmux CLI 互換の Windows ネイティブ実装（ConPTY・WSL 不要）。AITERM_PSMUX で
// バイナリを明示上書きできる（POSIX の AITERM_TMUX に対応）。
function psmuxBin(): string {
  return process.env.AITERM_PSMUX || "psmux";
}
let winPsmuxOk = false;
function ensureWinPsmux(observe = true): void {
  if (winPsmuxOk) return;
  const r = spawnSync(psmuxBin(), ["-V"], { encoding: "utf8", timeout: 10000 });
  if (r.error) {
    const code = (r.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT")
      ptyDependencyError(
        "psmux が見つかりません。Windows ネイティブでは psmux が必要です（導入例: winget install marlocarlo.psmux）。既存の psmux を使う場合は AITERM_PSMUX でパスを指定してください。",
        observe,
      );
    ptyDependencyError(`psmux を起動できませんでした（${code ?? "unknown"}）。`, observe);
  }
  if (r.status !== 0)
    ptyDependencyError("psmux -V が失敗しました。`psmux -V` が通るか確認してください。", observe);
  winPsmuxOk = true;
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
export function resolveTmux(observe = true): string {
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

export function tmuxCommandWithInput(
  observe: boolean,
  input: string | undefined,
  ...args: string[]
): { code: number; stdout: string; stderr: string } {
  // maxBuffer は既定 1MiB。capture-pane（大きなスクロールバック）や多セッションの list-sessions で
  // 頭打ちになり stdout が切れる/空になる。Python の subprocess.run は無制限だったので 64MiB へ広げる。
  // Windows は tmux CLI 互換の native psmux を -L namespace 隔離で叩く（WSL 非依存）。
  let r;
  const spawnOpts = { encoding: "utf8" as const, maxBuffer: 64 * 1024 * 1024, input, env: tmuxSpawnEnv() };
  if (isWin) {
    ensureWinPsmux(observe);
    r = spawnSync(psmuxBin(), ["-L", WIN_NS, ...args], spawnOpts);
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

export function tmuxCommand(observe: boolean, ...args: string[]): { code: number; stdout: string; stderr: string } {
  return tmuxCommandWithInput(observe, undefined, ...args);
}

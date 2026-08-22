// vendor中立の共有プリミティブ。core と vendors/ の両方が依存する最下層で、
// tmux-runtime / errors 以外の内部moduleへ依存しない（依存方向: core → vendors → agent-shared）。
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import { AitermError } from "./errors.js";

export type AgentKind = "claude" | "codex" | "grok" | "composer";
export type InitialPromptState = "none" | "not_sent" | "sent" | "pending" | "done" | "failed";

export interface AgentMetadata {
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

export const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export function currentUid(): number {
  // Windows(native)は process.getuid を持たない。以前はここで throw していたが、
  // agent metadata の存在確認経由で素の pty_send まで巻き込んで全 send を殺していた。
  // Windows の fs.Stats.uid は常に 0 なので、ここも 0 を返せば owner 比較
  // (st.uid !== currentUid()) は自然に通過する。Windows は POSIX owner 検証を
  // 持たない（NTFS ACL は別体系）という既知の制約の明示的受容であり、POSIX 側は
  // getuid をそのまま返すため挙動不変。
  if (typeof process.getuid !== "function") return 0;
  return process.getuid();
}

export function runtimeStateBase(): string {
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

export function safeStatSize(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

export function readFileRange(p: string, from: number, to: number): Buffer {
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

export function writeJson0600(p: string, v: unknown): void {
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

export function writeText0600(p: string, text: string): void {
  fs.writeFileSync(p, text, { mode: 0o600 });
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* noop */
  }
}

export function createEmpty0600(p: string): void {
  // O_EXCL が「既存 path なら失敗」を保証するため、新規作成の一意性はこれで足りる。
  // O_NOFOLLOW は撤去した（オーナー裁定 2026-08-19）。
  const fd = fs.openSync(p, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
  fs.closeSync(fd);
}

// 単一引用符で安全に包む（' は '\'' で脱出）。send は raw:true で送るため自前で quote する。
export function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export const LAUNCH_ID_RE = /^[0-9a-f]{32}$/;
export const AGENT_DONE_POLL_MS = 100;
export const AGENT_EVENT_MAX_BYTES = 1024 * 1024;
export const AGENT_EVENT_TAIL_BYTES = 64 * 1024;
export const CODEX_TRANSCRIPT_INCREMENT_MAX_BYTES = 16 * 1024 * 1024;
export const GROK_TRANSCRIPT_INCREMENT_MAX_BYTES = 16 * 1024 * 1024;

// session 名はファイルパス（logpath 等）と pipe-pane の /bin/sh 文字列へ流れる。英数 _ - のみ・64字に
// 限定し、パストラバーサル（../）とシェルインジェクション（' でのクオート破り・$・; 等）を全入口で断つ。
export function assertSessionName(name: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name))
    throw new AitermError(`session 名は英数字と _ - のみ・64文字以内にしてください: ${JSON.stringify(name)}`, 2);
}

export function stateRoot(): string {
  const uid = currentUid();
  const base = runtimeStateBase();
  return path.join(base, `aiterm-mcp-${uid}`);
}

export function ensureStateRoot(): string {
  // state root は OS が与える per-user runtime dir（XDG_RUNTIME_DIR / os.tmpdir()）の下に作る。
  // 以前はここで symlink・owner・mode を検査していたが、共有 /tmp に敵対的な同居主体がいる
  // 前提の防御であり、対応 OS の既定配置では成立しない（オーナー裁定 2026-08-19）。
  // 作成時の 0o700 は検査ではなく妥当な既定として残す。経路の異常は以降の
  // open/stat が OS エラーとしてそのまま露出させる。
  const root = stateRoot();
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(root, "agents"), { recursive: true, mode: 0o700 });
  return root;
}

export function agentsDir(): string {
  return path.join(ensureStateRoot(), "agents");
}

export function agentEventPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.events.jsonl`);
}

export function agentMetadataPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.agent.json`);
}

export function agentWaitLockPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.wait.lock`);
}

export interface AgentDoneEvent {
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

export interface AgentWaitObservation {
  schema: "aiterm.agent-wait-result.v1";
  session_id: string;
  launch_id: string;
  vendor: AgentKind;
  // running は timeout=0（待たずに一度だけ観測する照会）専用の「まだ終わっていない」。
  // timeout は「指定秒だけ待って終わらなかった」で、両者を1語に潰さない（ADR 0018）。
  // rate_limited は vendor の利用上限バナーを pane log で観測した「モデルが応答できない」。
  // 完了でも沈黙でもない typed な回答として親へ返す（実被弾 2026-08-22: Grok weekly limit で
  // 完了 event が永遠に出ず、waiter は timeout の沈黙か auth 誤診しか返せなかった）。
  outcome: "done" | "running" | "timeout" | "closed" | "rate_limited";
  operation_id: string | null;
  vendor_session_id: string | null;
  turn_id: string | null;
  malformed_events: number;
  at: string | null;
  rate_limit: string | null;
}

export function writeAgentMetadata(meta: AgentMetadata): void {
  writeJson0600(agentMetadataPath(meta.aiterm_session, meta.launch_id), meta);
}

export function agentLabel(kind: AgentKind): string {
  return kind === "claude"
    ? "Claude Code"
    : kind === "composer"
    ? "Grok Build(Composer)"
    : kind === "grok"
      ? "Grok Build(Grok)"
      : "Codex";
}

export function subagentInstruction(meta: AgentMetadata): string {
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

// launch noteのwrite_scope説明。文言はkindに依存する分岐まで含めて単一実装で持つ
// （vendor別noteへ複製すると文言が発散する）。
export function writeScopeLaunchNote(kind: AgentKind, writeScope: string | undefined): string {
  return writeScope === undefined
    ? ""
    : (kind === "codex" || kind === "grok" || kind === "composer") && writeScope === "read-only"
      ? `\n能力宣言: write_scope=${JSON.stringify(writeScope)}。${agentLabel(kind)} CLIへ --sandbox read-only を付与し、書込みを実効禁止。` +
        (kind === "codex" ? "" : "MCPツール許可は --always-approve で自動承認（sandbox内のため能力拡大なし）。")
      : `\n能力宣言: write_scope=${JSON.stringify(writeScope)}。パス単位のsandbox allowlistに対応するCLI引数がないため宣言の記録のみ（構造的unsupported）。`;
}

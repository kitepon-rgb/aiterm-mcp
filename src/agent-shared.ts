// vendor中立の共有プリミティブ。core と vendors/ の両方が依存する最下層で、
// tmux-runtime / errors 以外の内部moduleへ依存しない（依存方向: core → vendors → agent-shared）。
import * as fs from "node:fs";
import * as os from "node:os";
import { randomBytes } from "node:crypto";

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

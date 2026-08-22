// Grok / Composer 固有の制御。Composer は grok CLI の別モデル起動プリセットであり、
// モデル既定値と表示名以外は Grok と完全共通（実測 2026-08-23 棚卸し・docs/32）。
// core 所有のサービス（transcript 行読取・rate limit 検知）は引数で注入し、
// 依存方向を core → vendors → agent-shared の一方向に保つ。
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AitermError } from "../errors.js";
import { modeBitsWorldAccessible, modeBitsWritableByOthers } from "../tmux-runtime.js";
import { spawnAgentControlCommand } from "../agent-resolver.js";
import {
  currentUid,
  safeStatSize,
  readFileRange,
  sleep,
  agentMetadataPath,
  AGENT_DONE_POLL_MS,
  AGENT_EVENT_MAX_BYTES,
  GROK_TRANSCRIPT_INCREMENT_MAX_BYTES,
} from "../agent-shared.js";
import type { AgentKind, AgentMetadata, AgentDoneEvent, AgentWaitObservation } from "../agent-shared.js";

const GROK_AUTH_MAX_BYTES = 64 * 1024;
const GROK_MODELS_MAX_BYTES = 1024 * 1024;
const GROK_MODELS_TIMEOUT_MS = 15_000;

// grok CLI はモデル未指定だと端末側 default に従うため、ツール契約として既定 slug を固定する。
// codex は既定 slug を持たず端末 config／CLI 既定に委ねる（起動応答で実効値を報告する）。
// grok 既定は dotagents 規範（docs/02_models.md: xAI 旗艦 = grok-4.6）に従う。
export const GROK_MODEL_DEFAULTS: Record<"grok" | "composer", string> = {
  grok: "grok-4.6",
  composer: "grok-composer-2.5-fast",
};

export function realGrokHome(): string {
  return path.resolve(process.env.GROK_HOME || path.join(process.env.HOME ?? os.homedir(), ".grok"));
}

export function resolveAndValidateGrokAuth(srcHome: string): string | null {
  const inheritedSet = Object.prototype.hasOwnProperty.call(process.env, "GROK_AUTH_PATH");
  const inherited = process.env.GROK_AUTH_PATH;
  if (inheritedSet && (!inherited || !path.isAbsolute(inherited))) throw new AitermError("GROK_AUTH_PATH は空でない絶対パスで指定してください", 2);
  const authPath = inherited ?? path.join(srcHome, "auth.json");
  let fd: number | undefined;
  try {
    fd = fs.openSync(authPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const st = fs.fstatSync(fd);
    // isFile・nlink・owner・size・O_NOFOLLOW・realpath 検証は全OS共通に維持する
    // （mode bit 検証のOS差は tmux-runtime の modeBits* が所有）。
    const worldAccessible = modeBitsWorldAccessible(st.mode);
    if (!st.isFile() || st.nlink !== 1 || st.uid !== currentUid() || worldAccessible || st.size > GROK_AUTH_MAX_BYTES) {
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
      const writableByOthers = modeBitsWritableByOthers(dirSt.mode);
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

export function grokModelCatalog(bin: string, cwd: string): string[] {
  const result = spawnAgentControlCommand(bin, ["models"], cwd, {
    cwd,
    encoding: "utf8",
    env: process.env,
    timeout: GROK_MODELS_TIMEOUT_MS,
    maxBuffer: GROK_MODELS_MAX_BYTES,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit=${result.status ?? "unknown"}`;
    throw new AitermError(`Grok model catalog を取得できません: ${detail}`, 2);
  }
  const text = result.stdout.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
  const marker = "Available models:";
  const start = text.indexOf(marker);
  if (start < 0) throw new AitermError("Grok model catalog の出力形式が不正です（Available models がありません）", 2);
  const models: string[] = [];
  for (const line of text.slice(start + marker.length).split(/\r?\n/)) {
    const match = line.match(/^\s{2}[-*]\s+(.+?)(?:\s+\(default\))?\s*$/);
    if (match?.[1]) models.push(match[1]);
  }
  if (models.length === 0) throw new AitermError("Grok model catalog に利用可能なmodelがありません", 2);
  return models;
}

export function assertGrokModelAvailable(bin: string, cwd: string, model: string): void {
  const models = grokModelCatalog(bin, cwd);
  if (!models.includes(model)) {
    throw new AitermError(
      `Grok model catalog に ${JSON.stringify(model)} がありません。利用可能: ${models.join(", ")}。` +
        "別modelへfallbackせず起動を中止しました",
      2,
    );
  }
}

export function grokSessionDirectory(meta: AgentMetadata): string | null {
  if ((meta.kind !== "grok" && meta.kind !== "composer") || !meta.grok_home || !meta.vendor_session_id) return null;
  const cwd = meta.cwd ?? process.cwd();
  return path.join(meta.grok_home, "sessions", encodeURIComponent(cwd), meta.vendor_session_id);
}

export function grokEventsTranscript(meta: AgentMetadata): string | null {
  const dir = grokSessionDirectory(meta);
  return dir ? path.join(dir, "events.jsonl") : null;
}

export function grokCompletionEvent(meta: AgentMetadata, record: any): AgentDoneEvent | null {
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

export function latestGrokCompletion(
  meta: AgentMetadata,
  readTranscriptLines: (file: string) => string[],
): AgentDoneEvent | null {
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

export function grokInitializationComplete(meta: AgentMetadata): boolean {
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

export async function observeGrokDone(
  meta: AgentMetadata,
  timeout: number,
  requestedCursor: number | null | undefined,
  detectRateLimit: (kind: AgentKind, aitermSession: string) => string | null,
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
    rateLimit: string | null = null,
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
    rate_limit: rateLimit,
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
    {
      const limited = detectRateLimit(meta.kind, meta.aiterm_session);
      if (limited) return observation("rate_limited", null, limited);
    }
    if (performance.now() >= deadline) return observation(timeout === 0 ? "running" : "timeout");
    await sleep(AGENT_DONE_POLL_MS);
  }
}

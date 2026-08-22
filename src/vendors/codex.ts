// Codex 固有の制御。完了正本は root rollout transcript の task_complete（ADR 0022）。
// core 所有のサービス（transcript 行読取・rate limit 検知）は引数で注入し、
// 依存方向を core → vendors → agent-shared の一方向に保つ。
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AitermError } from "../errors.js";
import {
  safeStatSize,
  readFileRange,
  sleep,
  agentMetadataPath,
  writeAgentMetadata,
  AGENT_DONE_POLL_MS,
  AGENT_EVENT_MAX_BYTES,
  AGENT_EVENT_TAIL_BYTES,
  CODEX_TRANSCRIPT_INCREMENT_MAX_BYTES,
} from "../agent-shared.js";
import type { AgentKind, AgentMetadata, AgentDoneEvent, AgentWaitObservation } from "../agent-shared.js";

export function realCodexHome(): string {
  return process.env.CODEX_HOME || path.join(process.env.HOME ?? os.homedir(), ".codex");
}

// config.toml の top-level model / model_reasoning_effort ピンを起動報告用に読む。TOML パーサは
// 持ち込まず基本形（key = "値"）だけ解決する。行はあるが値を解析できない場合も「継承あり」として
// 正直に報告する（黙って CLI 既定扱いにしない）。
export type CodexConfigPin = { present: boolean; value: string | null };
export function readCodexConfigPins(configPath: string): { model: CodexConfigPin; effort: CodexConfigPin } {
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

export function codexConfigSummary(configPath: string): string {
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

export function findLatestCodexTranscript(codexHome: string, vendorSessionId: string): string | null {
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

export function listCodexTranscripts(codexHome: string): string[] {
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

export function codexTranscriptMatchesLaunch(file: string, meta: AgentMetadata): boolean {
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

export function codexTranscriptSessionId(file: string): string | null {
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

export function codexRootTranscript(meta: AgentMetadata): string | null {
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

export function bindCodexTranscriptSession(meta: AgentMetadata): string | null {
  const transcript = codexRootTranscript(meta);
  if (!transcript) return null;
  const vendorSessionId = codexTranscriptSessionId(transcript);
  if (vendorSessionId && !meta.vendor_session_id) {
    meta.vendor_session_id = vendorSessionId;
    writeAgentMetadata(meta);
  }
  return transcript;
}

export function codexCompletionEvent(
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

export function latestCodexCompletion(
  meta: AgentMetadata,
  readTranscriptLines: (file: string) => string[],
): AgentDoneEvent | null {
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

export async function observeCodexDone(
  meta: AgentMetadata,
  timeout: number,
  requestedCursor: number | null | undefined,
  detectRateLimit: (kind: AgentKind, aitermSession: string) => string | null,
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
    rateLimit: string | null = null,
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
    rate_limit: rateLimit,
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
    {
      const limited = detectRateLimit(meta.kind, meta.aiterm_session);
      if (limited) return observation("rate_limited", null, limited);
    }
    if (performance.now() >= deadline) return observation(timeout === 0 ? "running" : "timeout");
    await sleep(AGENT_DONE_POLL_MS);
  }
}

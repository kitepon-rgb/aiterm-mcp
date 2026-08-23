// Codex 固有の制御。完了正本は root rollout transcript の task_complete（ADR 0022）。
// core 所有のサービス（transcript 行読取・rate limit 検知）は引数で注入し、
// 依存方向を core → harnesses → agent-shared の一方向に保つ。
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import { AitermError } from "../errors.js";
import {
  shq,
  subagentInstruction,
  writeScopeLaunchNote,
  safeStatSize,
  readFileRange,
  sleep,
  agentMetadataPath,
  writeAgentMetadata,
  agentEventPath,
  createEmpty0600,
  agentLineageFields,
  AGENT_DONE_POLL_MS,
  AGENT_EVENT_MAX_BYTES,
  AGENT_EVENT_TAIL_BYTES,
  CODEX_TRANSCRIPT_INCREMENT_MAX_BYTES,
  agentHarness,
} from "../agent-shared.js";
import type { AgentKind, AgentMetadata, AgentDoneEvent, AgentWaitObservation, InitialPromptState, AgentLineageContext } from "../agent-shared.js";

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

export function findLatestCodexTranscript(codexHome: string, harnessSessionId: string): string | null {
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
      if (!entry.isFile() || !entry.name.startsWith("rollout-") || !entry.name.endsWith(".jsonl") || !entry.name.includes(harnessSessionId)) continue;
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
  const harnessSessionId = codexTranscriptSessionId(transcript);
  if (harnessSessionId && !meta.vendor_session_id) {
    meta.vendor_session_id = harnessSessionId;
    writeAgentMetadata(meta);
  }
  return transcript;
}

export function codexCompletionEvent(
  meta: AgentMetadata,
  harnessSessionId: string | null,
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
    vendor_session_id: harnessSessionId,
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
  const harnessSessionId = meta.vendor_session_id ?? codexTranscriptSessionId(transcript);
  let latest: AgentDoneEvent | null = null;
  for (const line of readTranscriptLines(transcript)) {
    if (!line.trim()) continue;
    try {
      latest = codexCompletionEvent(meta, harnessSessionId, JSON.parse(line)) ?? latest;
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
    harness: agentHarness("codex"),
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
        const harnessSessionId = meta.vendor_session_id ?? codexTranscriptSessionId(transcript);
        for (const line of parts) {
          if (!line.trim()) continue;
          if (Buffer.byteLength(line, "utf8") > AGENT_EVENT_MAX_BYTES) {
            malformedEvents++;
            continue;
          }
          try {
            const done = codexCompletionEvent(meta, harnessSessionId, JSON.parse(line));
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

export function buildCodexAgentCmd(
  bin: string,
  model: string | null,
  effort: string | null,
  prompt: string | null,
  meta: AgentMetadata | null,
): string {
  const parts: string[] = [shq(bin)];
  // `codex --help` で確認した実在フラグ。read-only 宣言だけはCLI sandboxへ落とし、
  // launcher自身が実効能力壁を作る。パス説明はCodex CLIに同等のallowlist引数がないため宣言のまま残す。
  if (meta?.kind === "codex" && meta.write_scope === "read-only") parts.push("--sandbox", "read-only");
  // model/effort は共有configを書き換えず、CLI引数で明示して起動単位に優先する。
  if (model) parts.push("-m", shq(model));
  if (effort) parts.push("-c", `model_reasoning_effort=${shq(effort)}`);
  if (meta?.kind === "codex" && meta.hook_route === "shared_codex_home") {
    parts.push("-c", `developer_instructions=${shq(subagentInstruction(meta))}`);
  }
  if (prompt) parts.push(shq(prompt)); // 初手プロンプト（任意）
  return parts.join(" ");
}

// 起動応答にモデル/effort の実効値と出所を明示する。codex は端末 config のピン（model /
// model_reasoning_effort）が対話子へ波及する構造のため、引数・端末config継承・CLI既定の
// どれで起動したかを起動時点で可視化し、実効 effort=ultra は proactive 自動委譲 ON を警告する。
export function codexLaunchNote(
  model: string | null,
  effort: string | null,
  meta: AgentMetadata | null,
): string {
  const writeScopeNote = writeScopeLaunchNote("codex", meta?.write_scope);
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

export function codexTuiReady(screen: string): boolean {
  // 起動直後は製品header、長寿命sessionでは常駐footerがCodex TUIの識別子になる。
  // capture-paneは直近45行だけなので、会話が進むとheaderは正常に画面外へ流れる。
  const codexFrontend = screen.includes("OpenAI Codex")
    || /(^|\n)\s*\S+\s+(?:low|medium|high|xhigh|max|ultra)(?:\s+fast)?\s+·\s+\S.*$/m.test(screen);
  return codexFrontend && /(^|\n)\s*[›>]/.test(screen);
}

// submit座礁観測のcomposer領域マーカー（ready判定と同じ記号を行頭基準で探す）。
export const CODEX_COMPOSER_MARKER_RE = /^\s*[›>]/;

export function codexModelChoice(screen: string, model: string): string | null {
  for (const line of screen.slice(screen.lastIndexOf("Select Model and Effort")).split("\n")) {
    const match = line.match(/^\s*(?:›\s*)?(\d+)\.\s+(\S+)/);
    if (match?.[2] === model) return match[1];
  }
  return null;
}

export function codexEffortChoice(screen: string, effort: string): string | null {
  const labels: Record<string, RegExp> = {
    low: /^Low\b/i,
    medium: /^Medium\b/i,
    high: /^High\b/i,
    xhigh: /^Extra high\b/i,
    max: /^Max\b/i,
    ultra: /^Ultra\b/i,
  };
  const wanted = labels[effort.toLowerCase()];
  if (!wanted) return null;
  for (const line of screen.split("\n")) {
    const match = line.match(/^\s*(?:›\s*)?(\d+)\.\s+(.+?)\s{2,}/);
    if (match && wanted.test(match[2])) return match[1];
  }
  return null;
}

export function codexMoreReasoningChoice(screen: string): string | null {
  for (const line of screen.split("\n")) {
    const match = line.match(/^\s*(?:›\s*)?(\d+)\.\s+More reasoning/);
    if (match) return match[1];
  }
  return null;
}

// 回収対象turnの最終assistantメッセージをroot rollout transcriptから抽出する。
export function codexTranscriptText(
  meta: AgentMetadata,
  turnId: string | null,
  readTranscriptLines: (file: string) => string[],
  transcriptUnavailable: () => never,
): string {
  if (!meta.codex_home || !meta.vendor_session_id) transcriptUnavailable();
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
  return matching.join("\n") || finalAnswer;
}

export function createCodexAgentMetadata(
  name: string,
  cwd: string | null,
  initialPrompt: InitialPromptState,
  overrides: { model?: string | null; effort?: string | null } = {},
  writeScope?: string,
  lineageContext?: AgentLineageContext,
): AgentMetadata {
  const launchId = randomBytes(16).toString("hex");
  const eventFile = agentEventPath(name, launchId);
  createEmpty0600(eventFile);
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

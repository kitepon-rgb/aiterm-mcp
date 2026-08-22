// Claude Code 固有の制御。完了正本は launch 固有 Stop hook が書く event/result（ADR 0025）。
// core 所有のサービス（transcript 不在エラー）は引数で注入し、
// 依存方向を core → vendors → agent-shared の一方向に保つ。
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { AitermError } from "../errors.js";
import { modeBitsWorldAccessible } from "../tmux-runtime.js";
import { spawnAgentControlCommand } from "../agent-resolver.js";
import {
  currentUid,
  writeJson0600,
  shq,
  subagentInstruction,
  writeScopeLaunchNote,
  assertSessionName,
  agentsDir,
  LAUNCH_ID_RE,
} from "../agent-shared.js";
import type { AgentMetadata, AgentDoneEvent } from "../agent-shared.js";

export const OPERATION_ID_RE = /^sha256:[0-9a-f]{64}$/;
export const CLAUDE_RESULT_MAX_BYTES = 4 * 1024 * 1024;
export const CLAUDE_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function agentManagedClaudeSettingsPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-settings.json`);
}

export function agentClaudeResultPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-result.json`);
}

export function agentClaudeOperationPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-operation.json`);
}

export function agentClaudeApprovalReceiptPath(name: string, launchId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  return path.join(agentsDir(), `${name}.${launchId}.claude-approval.json`);
}

export function agentClaudeDispatchReceiptPath(name: string, launchId: string, operationId: string): string {
  assertSessionName(name);
  if (!LAUNCH_ID_RE.test(launchId)) throw new AitermError(`launch_id が不正です: ${launchId}`, 2);
  const validated = validateOperationId(operationId);
  return path.join(agentsDir(), `${name}.${launchId}.${validated.slice("sha256:".length)}.claude-dispatch`);
}

function claudeHookScriptPath(): string {
  // この module は dist/vendors/ に置かれるが、stop hook 実体は dist/ 直下に build される。
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "claude-stop-hook.js");
}

// process.execPath は Homebrew 等では Cellar の版付き実体を指す。長寿命 MCP server の起動後に
// runtime が更新されるとその実体だけが消え、既に生成済みの hook が exit 127 になる。
// hook は server と同じ継承 PATH から node を毎回解決し、安定した package script を実行する。
function nodeHookCommand(hookScript: string): string {
  return `${shq("node")} ${shq(hookScript)}`;
}

export function createClaudeCorrelationSettings(
  name: string,
  launchId: string,
  model: string | null,
  effort: string | null,
): string {
  const hookScript = claudeHookScriptPath();
  if (!fs.existsSync(hookScript)) {
    throw new AitermError(`Claude Stop hook wrapper が見つかりません。npm run build を実行してください: ${hookScript}`, 2);
  }
  const settings = agentManagedClaudeSettingsPath(name, launchId);
  writeJson0600(settings, {
    ...(model ? { model } : {}),
    ...(effort ? { effortLevel: effort } : {}),
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

export function validateOperationId(operationId: unknown): string {
  if (typeof operationId !== "string" || !OPERATION_ID_RE.test(operationId)) {
    throw new AitermError("operation_id は sha256:<64 lowercase hex> で指定してください", 2);
  }
  return operationId;
}

export function readClaudeResultText(
  meta: AgentMetadata,
  done: AgentDoneEvent,
  operationId: string | null,
  transcriptUnavailable: () => never,
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
    modeBitsWorldAccessible(st.mode) ||
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

const CLAUDE_AUTH_STATUS_TIMEOUT_MS = 5_000;

export function assertClaudeAuthenticationReady(bin: string): void {
  const result = spawnAgentControlCommand(bin, ["auth", "status", "--json"], process.cwd(), {
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
        "aiterm相関付きClaude session内で /login を繰り返さないでください。",
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

export function buildClaudeAgentCmd(
  bin: string,
  model: string | null,
  effort: string | null,
  prompt: string | null,
  meta: AgentMetadata | null,
): string {
  const parts: string[] = [shq(bin)];
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
  if (prompt) parts.push(shq(prompt)); // 初手プロンプト（任意）
  return parts.join(" ");
}

export function claudeLaunchNote(
  model: string | null,
  effort: string | null,
  meta: AgentMetadata | null,
): string {
  const writeScopeNote = writeScopeLaunchNote("claude", meta?.write_scope);
  return `起動設定: model=${model ?? "CLI既定"} effort=${effort ?? "CLI既定"}。${writeScopeNote}`;
}

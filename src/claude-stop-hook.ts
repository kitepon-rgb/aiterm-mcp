#!/usr/bin/env node
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash, randomBytes } from "node:crypto";

const LAUNCH_ID_RE = /^[0-9a-f]{32}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
const OPERATION_ID_RE = /^sha256:[0-9a-f]{64}$/;
const MAX_STDIN_BYTES = 8 * 1024 * 1024;
const MAX_RESULT_BYTES = 4 * 1024 * 1024;

function fail(message: string): never {
  process.stderr.write(`aiterm claude-stop-hook: ${message}\n`);
  process.exit(0);
}

function noop(): never {
  process.exit(0);
}

function hasAitermEnv(): boolean {
  return !!(
    process.env.AITERM_AGENT_KIND ||
    process.env.AITERM_SESSION_ID ||
    process.env.AITERM_AGENT_SESSION_ID ||
    process.env.AITERM_AGENT_LAUNCH_ID
  );
}

const IS_WIN = process.platform === "win32";

function uid(): number {
  // Windows(native) は process.getuid を持たない。core の currentUid() と同じ
  // 既知制約の受容として 0 を返す（Windows の fs.Stats.uid は常に 0 のため
  // owner 比較は自然に通過する。NTFS ACL は別体系）。POSIX は getuid のまま。
  if (typeof process.getuid !== "function") return 0;
  return process.getuid();
}

// Windows の fs mode は POSIX permission を表現しない（group/other bit が常に
// 立って見える）。core と同じ受容として Windows は mode bit 検証を行わない。
function posixModeUnsafe(mode: number): boolean {
  return !IS_WIN && (mode & 0o077) !== 0;
}

function runtimeStateBase(): string {
  const xdg = process.env.XDG_RUNTIME_DIR;
  if (xdg) {
    try {
      if (fs.statSync(xdg).isDirectory()) return xdg;
    } catch {
      /* 壊れたXDG_RUNTIME_DIRはTMPDIRへ戻す */
    }
  }
  return os.tmpdir();
}

function secureAgentsDir(): string {
  const root = path.join(runtimeStateBase(), `aiterm-mcp-${uid()}`);
  const agents = path.join(root, "agents");
  const rst = fs.lstatSync(root);
  if (!rst.isDirectory() || rst.isSymbolicLink() || rst.uid !== uid() || posixModeUnsafe(rst.mode)) {
    fail(`agent state root が安全ではありません: ${root}`);
  }
  const ast = fs.lstatSync(agents);
  if (!ast.isDirectory() || ast.isSymbolicLink() || ast.uid !== uid() || posixModeUnsafe(ast.mode)) {
    fail(`agent state dir が安全ではありません: ${agents}`);
  }
  return agents;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += bytes.length;
    if (total > MAX_STDIN_BYTES) fail("payload が大きすぎます");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function writeResult(file: string, value: unknown): void {
  const body = JSON.stringify(value) + "\n";
  if (Buffer.byteLength(body, "utf8") > MAX_STDIN_BYTES) fail("result file が大きすぎます");
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  const fd = fs.openSync(tmp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | nofollow, 0o600);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.uid !== uid() || st.nlink !== 1 || posixModeUnsafe(st.mode)) fail("result temp file が安全ではありません");
    const expected = Buffer.byteLength(body, "utf8");
    const written = fs.writeSync(fd, body, undefined, "utf8");
    if (written !== expected) fail("result file への書込みが途中で終了しました");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmp, file);
    fs.chmodSync(file, 0o600);
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch { /* noop */ }
    throw error;
  }
}

function appendEvent(file: string, event: unknown): void {
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  const line = JSON.stringify(event) + "\n";
  if (Buffer.byteLength(line, "utf8") > 64 * 1024) fail("event line が大きすぎます");
  const fd = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY | nofollow, 0o600);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.uid !== uid() || st.nlink !== 1 || posixModeUnsafe(st.mode)) {
      fail(`event file が安全ではありません: ${file}`);
    }
    const expected = Buffer.byteLength(line, "utf8");
    const written = fs.writeSync(fd, line, undefined, "utf8");
    if (written !== expected) {
      fs.ftruncateSync(fd, st.size);
      fail(`event file への書込みが途中で終了しました: ${file}`);
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

interface OperationMarker {
  operationId: string | null;
  dev: number;
  ino: number;
}

function readOperationMarker(file: string): OperationMarker | null {
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | nofollow);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    fail(`operation markerを安全に開けません: ${file}`);
  }
  try {
    const st = fs.fstatSync(fd!);
    if (!st.isFile() || st.uid !== uid() || st.nlink !== 1 || posixModeUnsafe(st.mode) || st.size > 1024) {
      fail(`operation markerが安全ではありません: ${file}`);
    }
    const body = fs.readFileSync(fd!, "utf8");
    const value = JSON.parse(body) as Record<string, unknown>;
    const keys = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
    if (
      keys.join(",") !== "operation_id,schema" ||
      value.schema !== "aiterm.claude-operation-marker.v1" ||
      (value.operation_id !== null &&
        (typeof value.operation_id !== "string" || !OPERATION_ID_RE.test(value.operation_id)))
    ) {
      fail("operation markerのschemaまたはoperation_idが不正です");
    }
    return { operationId: value.operation_id as string | null, dev: st.dev, ino: st.ino };
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    fs.closeSync(fd!);
  }
}

function consumeOperationMarker(file: string, marker: OperationMarker): void {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(file);
  } catch {
    fail("operation markerが完了記録中に消失しました");
  }
  if (
    !st!.isFile() ||
    st!.isSymbolicLink() ||
    st!.uid !== uid() ||
    st!.nlink !== 1 ||
    posixModeUnsafe(st!.mode) ||
    st!.dev !== marker.dev ||
    st!.ino !== marker.ino
  ) {
    fail("operation markerが完了記録中に置換されました");
  }
  fs.unlinkSync(file);
}

async function main(): Promise<void> {
  if (!hasAitermEnv()) noop();
  const kind = process.env.AITERM_AGENT_KIND;
  const session = process.env.AITERM_SESSION_ID || process.env.AITERM_AGENT_SESSION_ID || "";
  const launchId = process.env.AITERM_AGENT_LAUNCH_ID || "";
  if (kind !== "claude") fail(`AITERM_AGENT_KIND が claude ではありません: ${kind ?? ""}`);
  if (!SESSION_RE.test(session)) fail(`session id が不正です: ${session}`);
  if (!LAUNCH_ID_RE.test(launchId)) fail(`launch id が不正です: ${launchId}`);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(await readStdin()) as Record<string, unknown>;
  } catch {
    fail("Stop payload がJSONではありません");
  }
  if (payload.hook_event_name !== "Stop") fail("Stop以外のpayloadをturn完了にできません");
  if (typeof payload.session_id !== "string" || !payload.session_id) fail("Claude session_id がありません");
  if (typeof payload.last_assistant_message !== "string") fail("last_assistant_message がありません");

  const text = payload.last_assistant_message;
  const resultBytes = Buffer.byteLength(text, "utf8");
  if (resultBytes > MAX_RESULT_BYTES) fail(`assistant result が${MAX_RESULT_BYTES} bytesを超えています`);
  const resultDigest = createHash("sha256").update(text, "utf8").digest("hex");
  const agents = secureAgentsDir();
  const resultFile = path.join(agents, `${session}.${launchId}.claude-result.json`);
  const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
  const operationFile = path.join(agents, `${session}.${launchId}.claude-operation.json`);
  const operationMarker = readOperationMarker(operationFile);
  const operationId = operationMarker?.operationId ?? null;

  writeResult(resultFile, {
    schema: "aiterm.claude-turn-result.v2",
    operation_id: operationId,
    vendor_session_id: payload.session_id,
    result_digest: resultDigest,
    result_bytes: resultBytes,
    text,
  });
  appendEvent(eventFile, {
    type: "agent_done",
    vendor: "claude",
    aiterm_session: session,
    launch_id: launchId,
    vendor_session_id: payload.session_id,
    turn_id: null,
    operation_id: operationId,
    reason: "Stop",
    done_status: "turn_done",
    stop_hook_active: !!payload.stop_hook_active,
    result_digest: resultDigest,
    result_bytes: resultBytes,
    at: new Date().toISOString(),
  });
  if (operationMarker) consumeOperationMarker(operationFile, operationMarker);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

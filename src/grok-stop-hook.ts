#!/usr/bin/env node
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const LAUNCH_ID_RE = /^[0-9a-f]{32}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_STDIN_BYTES = 1024 * 1024;

function fail(message: string): never {
  process.stderr.write(`aiterm grok-stop-hook: ${message}\n`);
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

function uid(): number {
  if (typeof process.getuid !== "function") fail("POSIX getuid が使えません");
  return process.getuid();
}

function secureAgentsDir(): string {
  const root = path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), `aiterm-mcp-${uid()}`);
  const agents = path.join(root, "agents");
  const rst = fs.lstatSync(root);
  if (!rst.isDirectory() || rst.isSymbolicLink() || rst.uid !== uid() || (rst.mode & 0o077) !== 0) {
    fail(`agent state root が安全ではありません: ${root}`);
  }
  const ast = fs.lstatSync(agents);
  if (!ast.isDirectory() || ast.isSymbolicLink() || ast.uid !== uid() || (ast.mode & 0o077) !== 0) {
    fail(`agent state dir が安全ではありません: ${agents}`);
  }
  return agents;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += b.length;
    if (total > MAX_STDIN_BYTES) fail("payload が大きすぎます");
    chunks.push(b);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function appendEvent(file: string, event: unknown): void {
  const nofollow = (fs.constants as Record<string, number>).O_NOFOLLOW ?? 0;
  const line = JSON.stringify(event) + "\n";
  if (Buffer.byteLength(line, "utf8") > 64 * 1024) fail("event line が大きすぎます");
  const fd = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY | nofollow, 0o600);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.uid !== uid() || st.nlink !== 1 || (st.mode & 0o077) !== 0) {
      fail(`event file が安全ではありません: ${file}`);
    }
    fs.writeSync(fd, line, undefined, "utf8");
  } finally {
    fs.closeSync(fd);
  }
}

async function main(): Promise<void> {
  if (!hasAitermEnv()) noop();
  const kind = process.env.AITERM_AGENT_KIND;
  const session = process.env.AITERM_SESSION_ID || process.env.AITERM_AGENT_SESSION_ID || "";
  const launchId = process.env.AITERM_AGENT_LAUNCH_ID || "";
  if (kind !== "grok" && kind !== "composer") fail(`AITERM_AGENT_KIND が grok/composer ではありません: ${kind ?? ""}`);
  if (!SESSION_RE.test(session)) fail(`session id が不正です: ${session}`);
  if (!LAUNCH_ID_RE.test(launchId)) fail(`launch id が不正です: ${launchId}`);

  let payload: Record<string, unknown> = {};
  const input = await readStdin();
  if (input.trim()) {
    try {
      payload = JSON.parse(input) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  const agents = secureAgentsDir();
  const eventFile = path.join(agents, `${session}.${launchId}.events.jsonl`);
  appendEvent(eventFile, {
    type: "agent_done",
    vendor: kind,
    aiterm_session: session,
    launch_id: launchId,
    vendor_session_id: str(payload.sessionId),
    turn_id: str(payload.promptId),
    reason: str(payload.reason) ?? str(payload.hookEventName) ?? "stop",
    done_status: "turn_done",
    at: new Date().toISOString(),
  });
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));

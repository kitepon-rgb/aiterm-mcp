#!/usr/bin/env node
import { openAgent, dispatchAgentTurn, observeAgentDone, readAgentTranscript, readOutput, sendKey, closeSession } from "../dist/core.js";

const kind = process.argv[2];
if (!new Set(["claude", "codex", "grok", "composer"]).has(kind)) {
  throw new Error("usage: live-shared-agent-smoke.mjs <claude|codex|grok|composer>");
}

const sid = `shared_${kind}_${Date.now().toString(36)}`;
const prompt = [
  "あなたに注入されたaiterm_subagent_contextだけを読み、説明やMarkdownなしで次の1行だけを返してください。",
  `AITERM_SMOKE vendor=${kind} role=<role> parent=<parent_session_id> depth=<delegation_depth> delegation=<delegation_allowed> lineage=<lineage>`,
  "値を推測せずcontextにある値をそのまま使ってください。ツールは呼ばないでください。",
].join("\n");

let opened = false;
try {
  const [actualSid, hint] = openAgent(kind, {
    session_name: sid,
    cwd: process.cwd(),
    agent_done: true,
  });
  opened = true;
  if (actualSid !== sid) {
    throw new Error(`launch failed: sid=${actualSid} hint=${hint}`);
  }
  let receipt = null;
  let dispatchError = null;
  for (let attempt = 0; attempt < 6 && receipt === null; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (kind === "codex") {
      const screen = await readOutput(sid, { screen: true, raw: true });
      if (screen.includes("Hooks need review") && screen.includes("Continue without trusting")) {
        sendKey(sid, "3");
        sendKey(sid, "Enter");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    try {
      receipt = await dispatchAgentTurn(sid, prompt);
    } catch (error) {
      dispatchError = error;
    }
  }
  if (receipt === null) throw dispatchError;
  const observation = await observeAgentDone(sid, { cursor: receipt.event_cursor, timeout: 180 });
  if (observation.outcome !== "done") {
    throw new Error(`turn did not complete: ${JSON.stringify(observation)}`);
  }
  const transcript = await readAgentTranscript(sid);
  process.stdout.write(JSON.stringify({
    schema: "aiterm.live-shared-agent-smoke.v1",
    kind,
    session_id: sid,
    observation,
    transcript,
  }) + "\n");
} finally {
  if (opened) closeSession(sid);
}

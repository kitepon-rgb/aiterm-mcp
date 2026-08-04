#!/usr/bin/env node
import { openAgent, dispatchAgentTurn, observeAgentDone, readAgentTranscript, closeSession } from "../dist/core.js";

const parentSession = `nested_parent_${Date.now().toString(36)}`;
const grandchildSession = `nested_grandchild_${Date.now().toString(36)}`;
const prompt = [
  "これはaitermのnested delegation実動smokeです。通常の共同作業と同じ共有環境で、次の手順だけを実行してください。",
  `1. aiterm MCPのclaude_agentを1回だけ使い、session_name=${grandchildSession}、cwd=${process.cwd()}で孫agentを起動する。`,
  "2. aiterm MCPのpty_sendで孫へ、注入されたaiterm_subagent_contextだけを読み、次の1行だけを返すよう依頼する。",
  "AITERM_NESTED role=<role> parent=<parent_session_id> depth=<delegation_depth> delegation=<delegation_allowed> lineage=<lineage>",
  "3. receiptのevent_cursorを使ってaiterm-waitで完了を待ち、pty_read(agent_transcript:true)で回答を回収する。",
  "4. 孫sessionをpty_closeで閉じる。",
  "5. 最後に孫のAITERM_NESTED行だけをそのまま返す。",
  "このsmoke中の追加委譲は上記の1回だけにし、別vendorや同じ任務の再委譲はしないでください。",
].join("\n");

let opened = false;
try {
  const [actualSession, hint] = openAgent("claude", {
    session_name: parentSession,
    cwd: process.cwd(),
    agent_done: true,
  });
  opened = true;
  if (actualSession !== parentSession) throw new Error(`launch failed: sid=${actualSession} hint=${hint}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const receipt = await dispatchAgentTurn(parentSession, prompt);
  const observation = await observeAgentDone(parentSession, { cursor: receipt.event_cursor, timeout: 300 });
  if (observation.outcome !== "done") throw new Error(`parent turn did not complete: ${JSON.stringify(observation)}`);
  const transcript = await readAgentTranscript(parentSession);
  process.stdout.write(JSON.stringify({
    schema: "aiterm.live-nested-agent-smoke.v1",
    parent_session: parentSession,
    grandchild_session: grandchildSession,
    observation,
    transcript,
  }) + "\n");
} finally {
  if (opened) closeSession(parentSession);
}

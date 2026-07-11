// smoke: 実際に `node dist/index.js` を起動し、initialize + tools/list を stdin にパイプ。
// 検証: stdout は改行区切り JSON-RPC のみ（診断混入なし）／9 ツールが公開されている。
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, "..", "dist", "index.js");

test("smoke: stdout は JSON-RPC のみ / 9 ツール公開", async () => {
  const child = spawn(process.execPath, [ENTRY], { stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (d) => (out += d));

  const msgs = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "no_such_tool", arguments: {} } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "pty_read", arguments: {} } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "pty_read", arguments: { session_id: "unused", line_range: "5:3" } } },
  ];
  child.stdin.write(msgs.map((m) => JSON.stringify(m)).join("\n") + "\n");

  // id:2(tools/list)応答が来たら即 resolve、来なければ reject する（C8: 従来は timeout でも resolve し、
  // 低速 CI で応答前に空出力のままアサート失敗＝紛らわしい偽陰性だった）。猶予も 5s→15s に延長。
  let errOut = "";
  child.stderr.on("data", (d) => (errOut += d));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error(`smoke: 15s 以内に tools/list 応答が来ない。stdout=${JSON.stringify(out)} stderr=${JSON.stringify(errOut)}`));
    }, 15000);
    child.stdout.on("data", () => {
      if (out.includes('"id":5')) { clearTimeout(timer); try { child.kill(); } catch {} resolve(); }
    });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
  });

  const lines = out.split("\n").filter((l) => l.trim());
  assert.ok(lines.length >= 1, `stdout に応答が無い: ${JSON.stringify(out)}`);
  let toolsResp = null;
  const responses = new Map();
  for (const ln of lines) {
    let obj;
    try { obj = JSON.parse(ln); } catch { assert.fail(`stdout に非 JSON-RPC 行: ${JSON.stringify(ln)}`); }
    assert.equal(obj.jsonrpc, "2.0", `JSON-RPC 2.0 でない: ${ln}`);
    responses.set(obj.id, obj);
    if (obj.id === 2) toolsResp = obj;
  }
  assert.ok(toolsResp, "tools/list 応答が無い");
  const names = (toolsResp.result?.tools ?? []).map((t) => t.name).sort();
  assert.deepEqual(names, [
    "codex_agent",
    "composer_agent",
    "grok_agent",
    "pty_close",
    "pty_key",
    "pty_list",
    "pty_open",
    "pty_read",
    "pty_send",
  ]);
  const ptySend = toolsResp.result.tools.find((t) => t.name === "pty_send");
  assert.deepEqual(ptySend.inputSchema.properties.wait.enum, ["none", "agent_done"]);
  assert.equal(ptySend.inputSchema.properties.wait.default, "none");
  const ptyRead = toolsResp.result.tools.find((t) => t.name === "pty_read");
  assert.equal(ptyRead.inputSchema.properties.agent_transcript.type, "boolean", "pty_read agent_transcript schema");
  assert.equal(ptyRead.inputSchema.properties.agent_transcript.default, false, "pty_read agent_transcript default");
  const codexAgent = toolsResp.result.tools.find((t) => t.name === "codex_agent");
  assert.ok(
    codexAgent.inputSchema.properties.model.anyOf?.some((v) => v.type === "string"),
    "codex_agent model schema",
  );
  assert.equal(codexAgent.inputSchema.properties.agent_done.type, "boolean", "codex_agent agent_done schema");
  assert.deepEqual(codexAgent.inputSchema.properties.wait.enum, ["none", "agent_done"], "codex_agent wait schema");
  assert.equal(codexAgent.inputSchema.properties.wait.default, "none", "codex_agent wait default");
  assert.equal(codexAgent.inputSchema.properties.timeout.type, "number", "codex_agent timeout schema");
  assert.equal(codexAgent.inputSchema.properties.screen.type, "boolean", "codex_agent screen schema");
  assert.ok(
    codexAgent.inputSchema.properties.lines.anyOf?.some((v) => v.type === "integer"),
    "codex_agent lines schema",
  );
  for (const name of ["grok_agent", "composer_agent"]) {
    const tool = toolsResp.result.tools.find((t) => t.name === name);
    assert.ok(
      tool.inputSchema.properties.model.anyOf?.some((v) => v.type === "string"),
      `${name} model schema`,
    );
    assert.equal(tool.inputSchema.properties.reasoning_effort.enum, undefined, `${name} reasoning_effort enum は未公開`);
    assert.equal(tool.inputSchema.properties.agent_done.type, "boolean", `${name} agent_done schema`);
    assert.equal(tool.inputSchema.properties.wait, undefined, `${name} initial prompt wait は未公開`);
    assert.equal(tool.inputSchema.properties.timeout, undefined, `${name} initial prompt timeout は未公開`);
    assert.equal(tool.inputSchema.properties.screen, undefined, `${name} initial prompt screen は未公開`);
    assert.equal(tool.inputSchema.properties.lines, undefined, `${name} initial prompt lines は未公開`);
  }
  assert.equal(responses.get(3)?.result?.isError, true, "未知 tool は tool error 応答を返す");
  assert.match(responses.get(3)?.result?.content?.[0]?.text ?? "", /Tool no_such_tool not found/);
  assert.equal(responses.get(4)?.result?.isError, true, "不正引数は isError:true");
  assert.equal(responses.get(5)?.result?.isError, true, "逆転 line_range は isError:true");
  assert.match(responses.get(5)?.result?.content?.[0]?.text ?? "", /上端が下端より小さい/);
});

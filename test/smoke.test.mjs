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
      if (out.includes('"id":2')) { clearTimeout(timer); try { child.kill(); } catch {} resolve(); }
    });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
  });

  const lines = out.split("\n").filter((l) => l.trim());
  assert.ok(lines.length >= 1, `stdout に応答が無い: ${JSON.stringify(out)}`);
  let toolsResp = null;
  for (const ln of lines) {
    let obj;
    try { obj = JSON.parse(ln); } catch { assert.fail(`stdout に非 JSON-RPC 行: ${JSON.stringify(ln)}`); }
    assert.equal(obj.jsonrpc, "2.0", `JSON-RPC 2.0 でない: ${ln}`);
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
  for (const name of ["codex_agent", "grok_agent", "composer_agent"]) {
    const tool = toolsResp.result.tools.find((t) => t.name === name);
    assert.equal(tool.inputSchema.properties.agent_done.type, "boolean", `${name} agent_done schema`);
  }
});

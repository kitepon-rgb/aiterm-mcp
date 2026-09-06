import test from "node:test";
import assert from "node:assert/strict";
import { __testWaitAgentTuiReady } from "../dist/core.js";

const refusal = "warning: sandbox could not be applied: hook source path contains a symlink component (retargetable): /example/hooks/factory.json\nerror: could not apply the 'read-only' sandbox profile; see the warning above for the cause. Refusing to start with its protections missing.\nbash-3.2$";

test("GrokとComposerのsandbox起動拒否は待機せず原因付きエラーにする", async () => {
  for (const kind of ["grok", "composer"]) {
    for (const screen of [refusal, refusal.replace("\nerror:", "\n" + " ".repeat(57) + "error:")]) {
      await assert.rejects(
        __testWaitAgentTuiReady(kind, [screen], { timeoutMs: 0 }),
        (error) => error.code === 2
          && /GROK_SANDBOX_STARTUP_FAILED/.test(error.message)
          && /symlink component/.test(error.message)
          && /factory\.json/.test(error.message)
          && /送信していません/.test(error.message),
      );
    }
  }
});

test("sandbox文言の引用や警告だけでは起動拒否と判定しない", async () => {
  for (const screen of [
    "Grok Build\n❯ ready",
    "Grok Build\n❯ error: could not apply the 'read-only' sandbox profile",
    "warning: sandbox could not be applied: temporary warning\nGrok Build\n❯ ready",
  ]) {
    assert.equal((await __testWaitAgentTuiReady("grok", [screen], { stableSamples: 1 })).ready, true);
  }
});

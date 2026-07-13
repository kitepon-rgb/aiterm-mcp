#!/usr/bin/env node
import process from "node:process";
import { RuntimeErrorStore, validateRuntimeObservation } from "./runtime-error-store.js";

function main(): void {
  const [action, code, ...rest] = process.argv.slice(2);
  if (rest.length > 0) throw new Error("invalid args");
  const store = new RuntimeErrorStore();
  if (action === "record" && code) {
    store.record(validateRuntimeObservation({ code }));
    return;
  }
  if (action === "diagnostic" && code === undefined) {
    process.stdout.write(`${JSON.stringify(store.diagnostic())}\n`);
    return;
  }
  throw new Error("invalid action");
}

try { main(); }
catch { process.exitCode = 1; }

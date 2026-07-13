#!/usr/bin/env node
import process from "node:process";
import { pathToFileURL } from "node:url";
import { RuntimeErrorStore } from "./runtime-error-store.js";

type Command =
  | { name: "snapshot" }
  | { name: "ack"; cursor: number }
  | { name: "resolve" | "reopen"; fingerprint: string };

function parseArgs(argv: string[]): Command {
  const [name, flag, value, ...rest] = argv;
  if (rest.length > 0) throw new Error("引数が多すぎます");
  if (name === "snapshot" && flag === undefined) return { name };
  if (name === "ack" && flag === "--cursor" && value !== undefined && /^\d+$/.test(value)) {
    const cursor = Number(value);
    if (Number.isSafeInteger(cursor)) return { name, cursor };
  }
  if ((name === "resolve" || name === "reopen") && flag === "--fingerprint" && value !== undefined) {
    if (/^[0-9a-f]{64}$/.test(value)) return { name, fingerprint: value };
  }
  throw new Error("使い方: aiterm-runtime-errors snapshot | ack --cursor N | resolve|reopen --fingerprint SHA256");
}

function emit(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function main(argv = process.argv.slice(2)): void {
  const command = parseArgs(argv);
  const store = new RuntimeErrorStore();
  if (command.name === "snapshot") {
    emit({ ok: true, command: command.name, snapshot: store.snapshot() });
    return;
  }
  if (command.name === "ack") {
    emit({ ok: true, command: command.name, snapshot: store.acknowledge(command.cursor) });
    return;
  }
  const changed = command.name === "resolve"
    ? store.resolve(command.fingerprint)
    : store.reopen(command.fingerprint);
  emit({ ok: true, command: command.name, changed, snapshot: store.snapshot() });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    main();
  } catch {
    // CLI も privacy allowlist を守り、store/config の生例外や path を stdout/stderr に反射しない。
    process.stderr.write("aiterm-runtime-errors: operation failed\n");
    emit({ ok: false, code: "AITERM_RUNTIME_ERROR_STORE_OPERATION_FAILED" });
    process.exitCode = 1;
  }
}

# BugHub runtime error store plan

Status: complete

This plan is aiterm-mcp's implementation TODO for a product-owned local runtime
error projection. MCP stdout remains JSON-RPC-only and the existing PTY/session
state contract is unchanged.

## Contract

- Collection is disabled unless the canonical dotagents factory reporter
  config contains the JSON boolean `collection.enabled: true`.
- The store performs no network I/O and does not inspect reporting credentials.
- Persist only allow-listed aggregates: product/version, component, stable
  error code, fixed message template, severity, SHA-256 fingerprint, count,
  first/last seen, state schema version, OS/arch, status, sequence, and for an
  explicit resolution only canonical `resolved_at` plus fixed `reason_code`.
- Reject exception objects, stderr/stdout, stacks, prompts, PTY/transcript/event
  bodies, absolute paths, file contents, tokens, cookies, and arbitrary context.
- Observe failures once at the MCP/core ownership boundary; never duplicate a
  lower-level `AitermError` at the JSON-RPC adapter.
- Store failure never replaces the PTY/MCP result. It emits a fixed stderr line
  without reflecting the storage exception.
- Use private mode/ACL, atomic replacement, monotonic cursor, acknowledgement,
  explicit resolve/reopen, and retention that preserves unacknowledged records.
- Runtime collection and diagnostic probes run in bounded child processes so a
  FIFO, device, stalled filesystem, or Windows child cannot block MCP work.
- Config validation is schema-equivalent and exact. Persisted state is treated
  as hostile input: exact top/record keys, fixed-definition equality,
  fingerprint recomputation, and explicit DTO projection are required.
- Store mutation uses a bounded bakery ticket queue. Each waiter publishes a
  unique `choosing` record before selecting a number, then a never-reused ticket
  with PID, process-start identity, and owner token. Entrants wait for all live
  choosers to publish, preventing a late same-number ticket from inserting ahead
  of an active owner. Dead owners are removed only by their unique path, avoiding
  fixed-path reclaim ABA.
- POSIX owner/mode is rechecked on every read. Windows rebuilds and reads back a
  protected DACL containing only the current SID. Windows remains pure-tested.
- A typed telemetry-owned error prevents a lower PTY dependency failure from
  being reclassified by a vendor owner or counted again during cleanup.

## TODO

- [x] Add disabled/missing/malformed config characterization tests.
- [x] Add privacy, aggregation, and duplicate-layer negative fixtures.
- [x] Add cursor/ack, resolve/reopen, retention, POSIX mode, Windows boundary,
      and atomic-write tests.
- [x] Implement the product-owned aggregate store and read-only snapshot API.
- [x] Add a bounded store status to native diagnostics without exposing paths.
- [x] Connect fixed-code PTY dependency, persistence, and vendor launcher
      failures at one owner layer each; keep MCP stdout clean.
- [x] Close adversarial findings: schema-exact config/profile, hostile-state
      validation/DTO projection, child isolation/timeouts, identity-bound lock,
      per-read permissions/DACL readback, and typed single-owner telemetry.
- [x] Run build plus the complete test suite and update product documentation
      (`npm test`: 227 passed, 0 failed, 0 skipped on macOS; 2026-07-13).
- [x] Commit and push this repository independently.

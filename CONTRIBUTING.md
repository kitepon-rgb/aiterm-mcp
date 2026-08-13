# Contributing to aiterm-mcp

Thanks for your interest. aiterm-mcp is a small, focused project: a stdio MCP server that gives an AI **one** persistent local terminal, tmux-backed. Keeping it small is a feature — please read this before opening a PR.

## Prerequisites

- **Node.js >= 18** (`engines.node` in `package.json`).
- **tmux** — a runtime prerequisite, not bundled. The test suite needs it too. Check with `tmux -V`.
  - **macOS**: stock macOS ships no tmux. Install it with `brew install tmux`. If you run aiterm from a **GUI-launched** MCP client, Homebrew's bin (`/opt/homebrew/bin` on Apple Silicon, `/usr/local/bin` on Intel) may be off `PATH`; `resolveTmux()` in `src/core.ts` auto-searches those, or set **`AITERM_TMUX=/path/to/tmux`** to point at it explicitly.
  - **Linux / WSL2**: `sudo apt install tmux`.
  - **Native Windows**: there is no native tmux. aiterm bridges every tmux call through WSL (`wsl.exe -e tmux`), so you need [WSL](https://learn.microsoft.com/windows/wsl/) installed with **tmux inside the distro** (`sudo apt install tmux`; verify with `wsl tmux -V`). CI does not exercise the Windows bridge — it is validated manually — so test Windows changes on a real machine.
- **Throughline >= 0.9.0** is optional and needed only when testing a launcher with `throughline_source_session`. Ordinary clean launches and all PTY tools do not depend on Throughline.

## Local development

```bash
git clone https://github.com/kitepon-rgb/aiterm-mcp.git
cd aiterm-mcp
npm install
npm run build      # tsc → dist/
npm test           # builds, then runs the node:test suite (requires tmux)
npm link           # put the `aiterm-mcp` command on PATH locally, pointing at your build
```

`npm test` runs `npm run build` first (`npm run build && node --test test/*.test.mjs`), so you don't need a separate build step before testing. After `npm link`, you can register your local build with any MCP client over stdio, e.g.:

```bash
claude mcp add --scope user --transport stdio aiterm -- aiterm-mcp
```

## Where the code lives

| File | Responsibility |
| --- | --- |
| `src/index.ts` | The MCP surface — exposes 14 tools over stdio via `@modelcontextprotocol/sdk` + `zod`: 6 PTY tools, 4 agent launchers, `agent_configure`, `claude_turn`, `claude_approval`, and read-only `diagnostics`. |
| `src/core.ts` | All the logic: tmux control, the `resolveTmux()` discovery layer, output reduction, completion detection and vendor TUI readiness, the destructive-command safety gate, agent correlation and approval relay, the selected `env_vars` launch overlay from the current MCP process, optional Throughline context acquisition before PTY creation, session-name validation, and the WSL bridge. |
| `src/runtime-error-store.ts` | Product-owned offline aggregate store and its bounded bakery queue. Queue deadlines measure one head owner's lack of progress; do not reintroduce total-wait timeouts or per-poll external process-identity commands. |
| `src/rtk.ts` | Per-command output reducers (`git status`/`git log`/`grep`/`pytest` and more) — a self-contained reimplementation, no `rtk` binary required. |
| `prototype/python/` | The original Python MVP. It is the **porting source / verification baseline** — reference only, the shipped artifact is the Node version. |

**The pytest reducer is held byte-exact against upstream rtk 0.42.0.** `src/rtk.ts`'s pytest path is pinned to rtk 0.42.0's output by golden-fixture regression tests (`test/fixtures/pytest/*`, asserted in `test/rtk.test.mjs`). One deliberate divergence is locked in: the `FAILED` summary lines (emitted under `-ra`/`-rf`) **preserve the full failure reason**, whereas rtk 0.42.0 truncates at the first `" - "` — a readability choice, covered by the `proj_ra` fixture. If you touch the pytest reducer, expect to update those goldens, and don't "fix" the intentional `FAILED`-line divergence without discussion.

The design source of truth is `docs/01_design-plan.md` — read it before changing reduction, completion detection, or safety behavior.

## Tests

Tests live in `test/` and use the built-in `node:test` runner (`node --test test/*.test.mjs`). Run the whole suite with `npm test`. On POSIX and macOS, the full tmux-backed suite runs when tmux is installed. Native Windows CI runs the tmux-independent layer on Node 20/22 as a required publish gate; the WSL tmux bridge still requires manual validation on a real Windows machine.

The integration tests that touch real tmux **isolate themselves** so they never pollute your live session (`claude.sock`):

- They point `TMPDIR` at a fresh `fs.mkdtempSync(...)` directory **before** importing `dist/core.js`, so the socket and `.log`/`.offset`/`.lastcmd` files land under that temp dir.
- They drive their own dedicated socket and clean up with `core.killAll()` in an `after()` hook.

Follow the same pattern when adding tmux-touching tests — set `TMPDIR` first, import core after, and tear down. Tests that don't need tmux (e.g. `core-pure.test.mjs`, `core-readoutput.test.mjs`, `rtk.test.mjs`, `smoke.test.mjs`) stay tmux-free and should remain so. Reducer changes belong in `test/rtk.test.mjs` against fixtures, not against live command output.

Tests skip gracefully when tmux is absent (they detect it via `tmux -V`, or `wsl.exe -e tmux -V` on Windows), but a PR is only meaningfully tested with tmux installed.

## Coding conventions

- **TypeScript, ESM** (`"type": "module"`). Use Node built-ins (`node:child_process`, `node:fs`, etc.) and the existing two runtime deps (`@modelcontextprotocol/sdk`, `zod`). Don't add dependencies without a strong reason — leanness is the point.
- **Never pollute stdout.** stdout is the JSON-RPC channel and nothing else. All diagnostics, notes, and warnings go to **stderr** (e.g. the `resolveTmux()` discovery note). A regression test (`smoke.test.mjs`) asserts every stdout line is JSON-RPC — a stray `console.log` will break it.
- **No silent fallbacks.** When something can't be done, surface a clear error (the macOS work replaced an empty-stderr failure with an explicit "install tmux with brew" diagnostic). Don't paper over failures.
- **Comments stay bilingual.** The codebase uses Japanese explanatory comments alongside the code (see `src/core.ts`). Match that style — explain the *why* and the non-obvious tradeoffs, in the same voice as the surrounding comments.
- **Keep the PTY surface thin.** The project currently ships 14 tools — 6 PTY primitives, 4 agent launchers, `agent_configure`, `claude_turn`, `claude_approval`, and read-only `diagnostics`. SSH, containers, and REPLs are nested via `pty_send`, not added as tools — new session *kinds* reached by nesting are not new tools.
- **Keep portable context behind Throughline's CLI boundary.** Do not read `~/.throughline/throughline.db` from aiterm. All four launchers share the same optional `throughline_source_session` path, and an external command failure must occur before PTY creation without falling back to a context-free launch.
- **Keep `env_vars` narrow.** It accepts variable names only and reads present values from the current MCP process at launch. Do not turn it into an arbitrary name/value map, a whole-environment snapshot, or a tmux-server mutation. Values enter the PTY launch command and `.lastcmd`, so tests and docs must not describe it as secret transport.

## Pull requests

1. Branch from `main`.
2. Make sure `npm test` passes locally **with tmux installed**.
3. Open a PR against `main`. CI (`.github/workflows/ci.yml`) must pass on **ubuntu-latest and macos-latest**, each across **Node 18, 20, and 22**. Native Windows also runs the tmux-independent layer on **Node 20 and 22** as a required gate; the WSL tmux bridge is still manual, so note in the PR if you verified it on Windows.
4. Keep the change scoped. If you're changing design behavior (completion detection, reduction, safety), update `docs/01_design-plan.md` to match.

For Codex readiness changes, test both startup screens (with the `OpenAI Codex` header) and
long-lived screens where only the model/effort footer remains, including Codex v0.147's optional
`fast` token after the effort. A prompt alone or a footer alone
must not identify a ready Codex TUI, and a busy indicator must still make the session non-idle.

For runtime error store queue changes, preserve dead-owner/PID-reuse cleanup and the deterministic
progressing-queue regression. A healthy predecessor advancing the queue must renew the stall budget;
the timeout must not become a fixed cap on total backlog wait.

Publishing to npm (`npm publish --provenance --access public`) is automated on `v*` tags via the `publish` CI job — contributors don't publish.

## Reporting bugs / requesting features

Open an issue: <https://github.com/kitepon-rgb/aiterm-mcp/issues>.

For bugs, please include your OS, `node -v`, `tmux -V` (or `wsl tmux -V` on Windows), how you launched aiterm (client, GUI vs terminal), and the exact tool call and reduced output. For the "known constraints" listed in the README (e.g. quiescence not firing while nested, `is_complete=False` on long commands, the safety gate being a tripwire not a sandbox), those are **by design** — check that section before filing.

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](LICENSE).

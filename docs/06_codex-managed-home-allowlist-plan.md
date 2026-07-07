# Codex managed home allowlist plan

Date: 2026-07-07

Goal: Reduce `agent_done` Codex launch side effects by preventing broad symlink
pass-through from the user's normal Codex home into aiterm's managed
`CODEX_HOME`.

## Tasks

- [x] Change managed Codex home creation to carry only the required files:
  `auth.json` as a symlink and `config.toml` as a private copy.
- [x] Keep aiterm-owned `hooks.json` in the managed home and continue to avoid
  editing the user's normal `hooks.json`.
- [x] Add regression coverage proving unrelated Codex home entries are not
  linked into the managed home.
- [x] Update README / design / RAG notes so the documented isolation boundary
  matches the implementation.
- [x] Run local verification.
- [x] Sync `server.json` to the released npm version before registry publish.
- [x] Add a regression check that package and registry metadata versions stay
  in lockstep.

Verification:

- `npm run build && node --test test/core-agent.test.mjs`
- `npm test`
- `git diff --check`
- `npm pack --dry-run --json`

# Codex managed CODEX_HOME allowlist hardening

- Source: local implementation decision in `aiterm-mcp`
- Retrieved: 2026-07-07
- Confidence: high

## Summary

`agent_done:true` for Codex uses a launch-local managed `CODEX_HOME` so aiterm
can own the Stop hook chain without editing the user's normal
`~/.codex/hooks.json`.

The first v0.9.0 implementation copied `config.toml`, linked `auth.json`, and
symlinked other normal Codex home entries into the managed home. That preserved
more user configuration, but it also created write-through paths for future
Codex state/cache/session files.

The hardening change switches Codex managed home setup to an allowlist:

- `auth.json`: symlinked to the normal Codex home for authentication.
- `config.toml`: copied into the managed home as a private file.
- `hooks.json`: written by aiterm inside the managed home.
- all other normal Codex home entries: not linked into the managed home.

This keeps the existing guarantee that normal hook files are not edited and
reduces the stronger side-effect risk where unrelated Codex home entries could
be modified through managed-home symlinks.

## Verification Target

Regression coverage should assert that fake normal-home entries such as
`history.jsonl` and `sessions/` do not appear inside the managed `CODEX_HOME`.

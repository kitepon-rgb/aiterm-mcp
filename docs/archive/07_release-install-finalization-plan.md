# Release/install finalization plan

Date: 2026-07-07

Goal: Finish the `v0.9.1` installation/release work so the installed command,
MCP client references, public registry metadata, and repository documentation
all describe the same current state.

## Tasks

- [x] Verify global npm install resolves to `aiterm-mcp@0.9.1`.
- [x] Verify user MCP client configs do not pin an older `aiterm-mcp`.
- [x] Smoke-test the globally installed stdio MCP server.
- [x] Clear pre-install `node /opt/homebrew/bin/aiterm-mcp` server processes so
  clients restart into `0.9.1`.
- [x] Sync repository documentation and changelog links to `v0.9.1` / 168 tests.
- [x] Archive completed release/checklist plans from `docs/`.
- [x] Re-run local verification and inspect public npm/GitHub/MCP registry state.

# aiterm-mcp

[![CI](https://github.com/kitepon-rgb/ai-terminal/actions/workflows/ci.yml/badge.svg)](https://github.com/kitepon-rgb/ai-terminal/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/aiterm-mcp.svg)](https://www.npmjs.com/package/aiterm-mcp)

> *(日本語: [README.ja.md](README.ja.md))*

> Give an AI a **persistent local terminal** as a stdio MCP server. It holds **one** local PTY; SSH and containers are demoted to "a command you send into that terminal." Reads are token-reduced.

Just six tools — `pty_open` / `pty_send` / `pty_read` / `pty_key` / `pty_close` / `pty_list`. The backend is **tmux**, so sessions survive even if the MCP server or the AI client restarts.

## Why

Sending an AI one command at a time and reading back the result means, over SSH, repeating connect → authenticate → disconnect every round — slow, and it burns tokens. aiterm **holds one PTY persistently** and you type `ssh host` or `docker exec -it x bash` *inside it* (nesting). Session kind is never a tool-level distinction.

```
pty_open()                         → grab one local terminal
pty_send(id, "ssh 192.168.1.2")    → enter SSH inside that terminal
pty_send(id, "uname -a")           → run it on the remote
pty_read(id, { wait: true })       → read the reduced output
```

## Requirements

- **Node.js >= 18**
- **tmux** (runtime prerequisite; check with `tmux -V`. Install with `apt install tmux` / `brew install tmux`)
- Optional: the [`rtk`](https://github.com/rtk-ai/rtk) binary (used by `pty_send`'s `rtk: true` delegation; works fine without it)

## Install / register

Register with Claude Code (CLI) at user scope (available in every project):

```bash
# After publishing (npm)
claude mcp add --scope user --transport stdio aiterm -- npx -y aiterm-mcp

# Or install globally and use the command name
npm i -g aiterm-mcp
claude mcp add --scope user --transport stdio aiterm -- aiterm-mcp
```

This registers it in `~/.claude.json`. Restart Claude Code; you'll get an approval prompt the first time. Check the connection with `/mcp`.

Any other MCP client works too — just launch `npx -y aiterm-mcp` (or `aiterm-mcp`) over stdio.

## Tools

| Tool | Role | Key args |
| --- | --- | --- |
| `pty_open` | Grab one terminal, return a `session_id` | `name?`, `shell="bash"` |
| `pty_send` | Send text (a command) | `session_id`, `text`, `enter=true`, `mark`, `force`, `rtk`, `raw` |
| `pty_read` | Read output, token-reduced (incremental by default) | `session_id`, `wait`, `until`, `timeout`, `screen`, `full`, `lines`, `line_range`, `raw`, `rtk` |
| `pty_key` | Send a control key | `session_id`, `key` (`C-c`/`Enter`/`Up`…) |
| `pty_close` | Close a session | `session_id` |
| `pty_list` | List sessions | (none) |

### Completion detection (4 layers)

`pty_read({ wait: true })` decides "is the command done?" via four layers: process exit / `until` regex match / output is quiescent ∧ the shell is back (quiescence) / timeout. While nested (inside SSH), the "shell is back" check cannot fire, so pass `until` with the remote prompt for a clean decision.

### Token reduction

- `pty_read` by default strips control characters, collapses repeated lines, and folds long output into head+tail (with a restore hint and a meta line).
- `pty_read({ rtk: true })` further shrinks the observed output with a per-command reducer (`git status`/`git log`/`grep`/`pytest` and more) — a self-contained reimplementation that needs no `rtk` binary.
- `pty_send({ rtk: true })` rewrites a known command into `rtk` form before sending, so reduction happens at the source if `rtk` exists there (passthrough otherwise).

### Safety

Before sending, `pty_send` blocks destructive commands (`rm -rf /`, `mkfs`, `dd of=/dev/…`, `DROP TABLE`, …) — pass `force: true` to override — and sanitizes ESC / bracketed-paste terminators. `pty_read` neutralizes control characters in what it returns.

## Known constraints (by design, not bugs)

- **While nested (ssh / docker / REPL), quiescence cannot fire by design**, because the foreground command is no longer in the shell set (bash/sh/zsh/fish/dash). Use `until` (a regex for the prompt etc.) or `mark: true` (an exit-code sentinel) for completion.
- **`is_complete=False` is not a failure.** It means "completion was not observed within `timeout`." For long commands, raise `timeout` or use `until`/`mark`.
- **The destructive gate is a tripwire, not a sandbox.** It blocks common destructive forms only. It does **not** catch relative-path `rm`, things that become dangerous after `$VAR` expansion, or commands run on the far side of an SSH session.
- **`pty_send({ rtk: true })` is single-line only and needs the external `rtk` binary** (passthrough without it). The `pty_read({ rtk: true })` reducer, by contrast, is self-contained and rtk-independent.
- **The `pytest` reducer matches rtk 0.42.0** on test counts, the rule line, and `FAILURES`-block formatting (locked by regression tests). It **deliberately preserves the full failure reason** on the `FAILED` summary lines (emitted under `-ra`/`-rf`), whereas rtk 0.42.0 truncates the reason at the first `" - "` — a readability choice, so those lines are intentionally not byte-identical to rtk. The `[full output: …]` tee-pointer line rtk appends on large output is not reproduced on the read side.
- **tmux is started with `-f /dev/null`**, so it does not read `~/.tmux.conf` (to keep behavior reproducible across machines).
- **All sessions live on a single socket (`claude.sock`).** `tmux … kill-server` removes them all.

## A human can watch

Sessions live on a shared tmux socket. The `tmux -S … attach -t <id>` line printed by `pty_open` lets a human attach to the same terminal and intervene (`Ctrl-b d` to detach).

## Development

```bash
npm install
npm run build      # tsc → dist/
npm test           # build, then the node:test regression suite (requires tmux)
npm link           # put `aiterm-mcp` on PATH locally
```

Logic lives in `src/core.ts` (tmux control, reduction, completion detection, safety) and `src/rtk.ts` (per-command reducers); `src/index.ts` is the MCP surface. The design origin and the reducer's porting source (the pytest reducer is ported to be byte-exact with upstream rtk 0.42.0, locked by regression tests) are in `prototype/python/`.

## License

MIT

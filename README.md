<p align="center">
  <img src=".github/og.svg" alt="aiterm-mcp — AI holds one persistent terminal as a stdio MCP server (tmux-backed)" width="100%">
</p>

# aiterm-mcp

[![CI](https://github.com/kitepon-rgb/aiterm-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/kitepon-rgb/aiterm-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/aiterm-mcp.svg)](https://www.npmjs.com/package/aiterm-mcp)
[![node](https://img.shields.io/node/v/aiterm-mcp)](https://nodejs.org)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![install size](https://packagephobia.com/badge?p=aiterm-mcp)](https://packagephobia.com/result?p=aiterm-mcp)

> *(日本語: [README.ja.md](README.ja.md))*

> **Let Claude — or any MCP client — drive a real, persistent shell.** One terminal stays open; `ssh`, `docker exec`, a REPL are just text you send into it, so the AI stops reconnecting for every single command. Reads come back token-reduced.
>
> *MCP = Model Context Protocol — the open standard that lets tools like Claude Code plug capabilities into an AI.*

Six PTY tools — `pty_open` / `pty_send` / `pty_read` / `pty_key` / `pty_close` / `pty_list` — plus three interactive **agent launchers** (`codex_agent` / `grok_agent` / `composer_agent`) that start a coding-agent TUI inside that same persistent terminal. The backend is **tmux**, so sessions survive even if the MCP server or the AI client restarts.

**Status:** actively maintained · runs on Linux · WSL2 · macOS · native Windows · MIT · see the [CHANGELOG](CHANGELOG.md).

## Why

Send an AI **one command at a time** and, over SSH, every command becomes its own `connect → authenticate → disconnect`. That stings three ways: you **re-authenticate every time** (passphrase, one-time code, all of it), **short-lived sessions pile up**, and once connections come too fast your own defenses lock you out — `fail2ban` bans you, `MaxStartups`/`MaxSessions` reject you, the account gets locked. The security meant to stop attackers ends up stopping you. (Yes — this bit me on my own box. I built aiterm to drive my homelab from Claude Code without that re-auth hell.)

aiterm **holds one PTY persistently** and you `ssh host` (or `docker exec -it x bash`) *inside it*, **once**. Every command after that rides the same already-authenticated session: **authenticate once, one session, nothing for the defenses to trip on.** Session kind is never a tool-level distinction.

```
pty_open()                         → grab one local terminal
pty_send(id, "ssh 192.168.1.2")    → authenticate once, inside that terminal
pty_send(id, "uname -a")           → every later command rides the SAME session
pty_read(id, { wait: true })       → read the reduced output
```

## Demo

Real captured output from a live session — the token reduction and completion detection are genuine, not mocked. The bracketed meta line is exactly what `pty_read` appends.

A noisy `git log`, read back token-reduced (458 → 273 tokens):

```text
→ pty_send("demo", "git log --oneline -12")
→ pty_read("demo", { wait: true })
← 3ce487e (HEAD -> main, origin/main) docs(readme): lead the Why with the SSH pain …
  39a9668 (tag: v0.4.0) release: v0.4.0 — nested completion early-return …
  c1ed87b feat(completion): early-return nested status when nested + no until …
  … 9 more commits …
  [aiterm demo: 13 lines / ~273 tok (raw 13 lines / ~458 tok)] [is_complete=True via quiescent]
```

A `grep`, folded by the per-command reducer to just the hits (127 → 46 tokens):

```text
→ pty_send("demo", "grep -rn capture-pane src/ test/")
→ pty_read("demo", { wait: true, rtk: true })
← 2 matches in 1 files:
  src/core.ts:159: // maxBuffer … capture-pane (large scrollback) …
  src/core.ts:329: const args = ["capture-pane", "-p", "-J", "-t", name];
  [aiterm demo: rtk:grep applied / ~46 tok (raw ~127 tok)] [is_complete=True via quiescent]
```

Nesting is just text you send in — here a Python REPL *inside* the same PTY:

```text
→ pty_send("demo", "python3")
→ pty_read("demo", { until: ">>> " })             # nested prompt = "the inner shell is ready"
→ pty_send("demo", "print(sum(range(1_000_000)))")
→ pty_read("demo", { until: ">>> " })
← 499999500000                                     [is_complete=True via until]
```

`ssh host` and `docker exec -it … bash` nest exactly the same way (see [Why](#why)) — an animated GIF of the full SSH flow is on the way; everything above is real output, not a script. While nested, pass `until` (the inner prompt) or `mark: true`, because quiescence cannot fire there by design — see [Completion detection](#completion-detection-4-layers) and [Known constraints](#known-constraints-by-design-not-bugs). A human can `attach` to the same tmux socket and watch any of this live (see [A human can watch](#a-human-can-watch)).

## Quickstart (≈60 seconds)

One command registers it in Claude Code — no clone, no build, `npx` fetches it each run:

```bash
claude mcp add --scope user --transport stdio aiterm -- npx -y aiterm-mcp
```

Restart Claude Code, then verify the connection:

```bash
/mcp        # aiterm should show as connected, exposing 9 tools
```

Your first session — four calls, one persistent terminal:

```text
pty_open()                          → { session_id: "t1", attach: "tmux -S … attach -t t1" }
pty_send("t1", "echo hello")        → command sent into the PTY
pty_read("t1", { wait: true })      → "hello"   (token-reduced, completion detected)
pty_close("t1")                     → terminal released
```

That's it. The terminal in `t1` is real and persistent — `ssh`, `docker exec`, a REPL are just text you `pty_send` into it.

**Prefer a global install, or a different client?**

```bash
# install globally, then register the command name
npm i -g aiterm-mcp
claude mcp add --scope user --transport stdio aiterm -- aiterm-mcp
```

This registers it in `~/.claude.json`; you'll get an approval prompt the first time. **Any other MCP client** (Cursor, Cline, Claude Desktop, …) works too — just launch `npx -y aiterm-mcp` (or `aiterm-mcp`) over stdio. Needs **Node ≥ 18** and **tmux** — see [Requirements](#requirements).

## How it works

```mermaid
flowchart LR
    AI["AI / MCP client"] -->|"pty_send"| S["aiterm-mcp<br/>stdio MCP · 9 tools"]
    S -->|"pty_read<br/>token-reduced"| AI
    S -->|"tmux send-keys<br/>capture-pane"| P["one local PTY<br/>tmux · persistent"]
    P -->|"ssh · docker · repl"| R["nested<br/>remote · container · REPL"]
```

One PTY is the only primitive. Everything else — SSH, containers, REPLs — is just text you `pty_send` into it. Because the PTY lives in tmux, sessions outlive the MCP server and the AI client.

## vs. the alternatives

|  | **aiterm-mcp** | one-shot shell MCP<br/>(e.g. `mcp-server-commands`) | terminal / SSH / tmux MCPs<br/>(e.g. `iterm-mcp`, `ssh-mcp`, `tmux-mcp`) |
| --- | --- | --- | --- |
| Persistent session | ✅ tmux, survives restarts | ❌ new shell every call | ⚠️ varies |
| SSH / containers | nest with one `pty_send` | reconnect every command | ⚠️ often separate tools / per-call connect |
| Token-reduced reads | ✅ per-command reducers | ❌ raw output | ⚠️ rarely |
| Completion detection | 4-layer: exit / `until` / quiescence / timeout | n/a (blocks per call) | ⚠️ prompt-match, fragile |
| Human can co-drive | ✅ shared tmux socket (`attach`) | ❌ | ⚠️ varies |

## Requirements

- **Node.js >= 18**
- **tmux** (runtime prerequisite; check with `tmux -V`. Install with `apt install tmux` / `brew install tmux`)
  - **macOS / Linux / WSL2** run tmux directly. On macOS install it with `brew install tmux` (stock macOS ships none). If your MCP client is launched from the **GUI** rather than a terminal, Homebrew's bin (`/opt/homebrew/bin` on Apple Silicon, `/usr/local/bin` on Intel) may be off its `PATH`; aiterm auto-searches those locations, or set **`AITERM_TMUX=/path/to/tmux`** to point at it explicitly.
  - **Native Windows** has no tmux, so aiterm transparently runs tmux **inside WSL**. It needs [WSL](https://learn.microsoft.com/windows/wsl/) installed and initialized, with **tmux installed inside your WSL distro** (`sudo apt install tmux`); verify with `wsl tmux -V`. Sessions, the socket, and human `attach` all live on the WSL side — the AI just drives them from the Windows-side command. (You reach Windows tools the same way you reach SSH: `pty_send "powershell.exe …"` nests into PowerShell.)
- Optional: the [`rtk`](https://github.com/rtk-ai/rtk) binary (used by `pty_send`'s `rtk: true` delegation; works fine without it)

## Tools

| Tool | Role | Key args |
| --- | --- | --- |
| `pty_open` | Grab one terminal, return a `session_id` | `name?`, `shell="bash"` |
| `pty_send` | Send text (a command) | `session_id`, `text`, `enter=true`, `mark`, `force`, `rtk`, `raw` |
| `pty_read` | Read output, token-reduced (incremental by default) | `session_id`, `wait`, `until`, `timeout`, `screen`, `full`, `lines`, `line_range`, `raw`, `rtk` |
| `pty_key` | Send a control key | `session_id`, `key` (`C-c`/`Enter`/`Up`…) |
| `pty_close` | Close a session | `session_id` |
| `pty_list` | List sessions | (none) |

### Interactive agent launchers

Each launcher starts a specific vendor's interactive coding-agent TUI inside a fresh persistent PTY and returns its `session_id` — from there you drive it with plain `pty_read` / `pty_send`, exactly like any other session. One tool per model, so the tool name itself tells you which model you get.

| Tool | Launches | Key args |
| --- | --- | --- |
| `codex_agent` | Codex CLI (OpenAI; the CLI's default model) | `prompt?`, `reasoning_effort?`, `cwd?`, `session_name?` |
| `grok_agent` | Grok Build, model `grok-build` (xAI) | `prompt?`, `reasoning_effort?` (`low`/`medium`/`high`/`xhigh`/`max`), `cwd?`, `session_name?` |
| `composer_agent` | Grok Build, model `grok-composer-2.5-fast` (xAI) | same as `grok_agent` |

The vendor CLI must be installed and authenticated (`codex` for `codex_agent`; `grok` for both Grok tools). aiterm resolves the binary via `CODEX_BIN` / `GROK_BIN`, then `~/.local/bin/codex` / `~/.grok/bin/grok`, then `PATH`. All prerequisites are validated **before** a session is created — an invalid `reasoning_effort`, a missing CLI, or a nonexistent `cwd` fails with an explicit error and leaves no session behind.

### Completion detection (4 layers)

`pty_read({ wait: true })` decides "is the command done?" via four layers: process exit / `until` regex match / output is quiescent ∧ the shell is back (quiescence) / timeout. While nested (inside SSH), the "shell is back" check cannot fire, so pass `until` with the remote prompt for a clean decision.

### Token reduction

- `pty_read` by default strips control characters, collapses repeated lines, and folds long output into head+tail (with a restore hint and a meta line).
- `pty_read({ rtk: true })` further shrinks the observed output with a per-command reducer (`git status`/`git log`/`grep`/`pytest` and more) — a self-contained reimplementation that needs no `rtk` binary.
- `pty_send({ rtk: true })` rewrites a known command into `rtk` form before sending, so reduction happens at the source if `rtk` exists there (passthrough otherwise).

### Safety

Before sending, `pty_send` blocks destructive commands (`rm -rf /`, `mkfs`, `dd of=/dev/…`, `DROP TABLE`, …) — pass `force: true` to override — and sanitizes ESC / bracketed-paste terminators. `pty_read` neutralizes control characters in what it returns.

## A human can watch

Sessions live on a shared tmux socket. The `tmux -S … attach -t <id>` line printed by `pty_open` lets a human attach to the same terminal and intervene (`Ctrl-b d` to detach). On native Windows the printed line is the WSL form — `wsl tmux -S … attach -t <id>` — since the session lives inside WSL.

## Development

```bash
npm install
npm run build      # tsc → dist/
npm test           # build, then the node:test regression suite (requires tmux)
npm link           # put `aiterm-mcp` on PATH locally
```

Logic lives in `src/core.ts` (tmux control, reduction, completion detection, safety) and `src/rtk.ts` (per-command reducers); `src/index.ts` is the MCP surface. The design origin and the reducer's porting source (the pytest reducer is ported to be byte-exact with upstream rtk 0.42.0, locked by regression tests) are in `prototype/python/`.

## Known constraints (by design, not bugs)

- **While nested (ssh / docker / REPL), quiescence cannot fire by design**, because the foreground command is no longer in the shell set (bash/sh/zsh/fish/dash). When nested with no `until`, `pty_read({ wait: true })` returns early as `is_complete=False via nested` (rather than burning the full `timeout`, since no signal can confirm completion there) with a note to pass `until` (a regex for the prompt) or `mark: true` (an exit-code sentinel) for a confirmed completion.
- **`is_complete=False` is not a failure.** It means "completion was not observed within `timeout`." For long commands, raise `timeout` or use `until`/`mark`.
- **The destructive gate is a tripwire, not a sandbox.** It blocks common destructive forms only. It does **not** catch relative-path `rm`, things that become dangerous after `$VAR` expansion, or commands run on the far side of an SSH session.
- **`pty_send({ rtk: true })` is single-line only and needs the external `rtk` binary** (passthrough without it). The `pty_read({ rtk: true })` reducer, by contrast, is self-contained and rtk-independent.
- **The `pytest` reducer matches rtk 0.42.0** on test counts, the rule line, and `FAILURES`-block formatting (locked by regression tests). It **deliberately preserves the full failure reason** on the `FAILED` summary lines (emitted under `-ra`/`-rf`), whereas rtk 0.42.0 truncates the reason at the first `" - "` — a readability choice, so those lines are intentionally not byte-identical to rtk. The `[full output: …]` tee-pointer line rtk appends on large output is not reproduced on the read side.
- **tmux is started with `-f /dev/null`**, so it does not read `~/.tmux.conf` (to keep behavior reproducible across machines).
- **All sessions live on a single socket (`claude.sock`).** `tmux … kill-server` removes them all.

## Try it

One command, no clone, no build:

```bash
claude mcp add --scope user --transport stdio aiterm -- npx -y aiterm-mcp
```

If aiterm saved you a round-trip of tokens, **[star the repo](https://github.com/kitepon-rgb/aiterm-mcp)** — it's the cheapest way to help others find it.

- **npm:** https://www.npmjs.com/package/aiterm-mcp
- **Issues / bug reports:** https://github.com/kitepon-rgb/aiterm-mcp/issues

## License

MIT

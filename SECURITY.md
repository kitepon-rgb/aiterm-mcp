# Security Policy

## Supported versions

aiterm-mcp is published from a single `0.x` line on npm. Security fixes land on the **latest released `0.x` version** only; there are no maintained back-port branches for older releases.

| Version | Supported |
| --- | --- |
| Latest `0.x` (currently `0.3.x`) | Yes — fixes released here |
| Older `0.x` (`0.1.x`, `0.2.x`) | No — upgrade to the latest |

If you are pinned to an older version, upgrade (`npm i -g aiterm-mcp@latest`, or just `npx -y aiterm-mcp`, which always fetches the latest) before reporting an issue, in case it is already fixed.

## Reporting a vulnerability

Please report security issues **privately**, not as a public GitHub issue or pull request.

Use GitHub's private vulnerability reporting on the repository:

1. Go to <https://github.com/kitepon-rgb/aiterm-mcp>.
2. Open the **Security** tab → **Report a vulnerability** (GitHub Security Advisories).

That opens a private advisory thread visible only to you and the maintainer. Please do not email; the maintainer responds through GitHub.

A useful report includes:

- the affected version (the npm version of `aiterm-mcp` you ran),
- your OS and how aiterm is launched (Linux/WSL2, macOS, native Windows via the WSL bridge),
- the tmux version (`tmux -V`),
- a minimal sequence of tool calls (`pty_open` / `pty_send` / `pty_read` …) that reproduces it,
- the impact you observed.

### Response expectations

aiterm-mcp is a **solo, best-effort open-source project**. There is no SLA. The maintainer aims to acknowledge a valid report and assess it as time allows, then fix and release on the latest `0.x` line. Please allow a reasonable window for a fix before any public disclosure, and coordinate timing through the advisory thread. Credit in the advisory/release notes is offered on request.

## Security model & limitations

Read this before deploying aiterm-mcp anywhere the consequences matter. The design goal is an honest, observable terminal — **not** a sandbox. The guards below are tripwires and input hygiene, not a security boundary.

### The server holds a real local PTY — treat it accordingly

aiterm-mcp grabs **one real local terminal** (a tmux pane running your shell) and lets the connected MCP client drive it with `pty_send`. **Anything you could type into that shell, the AI can run** — with your user, your environment, your filesystem, your network, your SSH keys and agent. Sending `ssh host` or `docker exec -it … bash` simply nests into that one PTY, so the AI's reach extends to wherever that shell can go.

Consequences for operators:

- Run aiterm-mcp under a user account whose privileges you are willing to expose to the connected client. Do not run it as root, and prefer a least-privilege account for sensitive environments.
- Only connect MCP clients / models you trust to drive a shell on that account.
- Sessions are tmux-backed and **persist across MCP-server and client restarts** (the tmux daemon keeps running). A session opened earlier is still live and drivable later. Use `pty_list` to see them and `pty_close` (or `tmux -S … kill-server`) to remove them.
- Sessions live on a **shared tmux socket**, so a human can `attach` to the same pane (the `pty_open` return value prints the exact command). This is intended co-driving, but it also means anyone with access to that socket / the host user can observe and drive the session.

### The destructive-command gate is a TRIPWIRE, not a sandbox

Before sending, `pty_send` matches the text against a small set of regexes for well-known catastrophic forms (e.g. `rm -rf /` and `~`/`$HOME`/glob-root variants, `mkfs`, `dd … of=/dev/…`, redirects to raw block devices, `DROP TABLE`/`DROP DATABASE`/`DROP SCHEMA`/`TRUNCATE TABLE`, `curl … | sh`, the classic fork bomb, `chmod -R 000 /`, `git reset --hard`). A match is **blocked** and the caller must pass `force: true` to proceed.

This is a speed-bump against obvious accidents, **not** a safety boundary. It is a syntactic pattern match on the literal text you send, so it does **not** catch:

- **Relative-path destruction** — e.g. `rm -rf somedir` from a directory that matters; the patterns target absolute/`~`/`$HOME`/glob roots (and a bare trailing `.`/`*`), not arbitrary relative paths.
- **Danger that only appears after expansion** — anything that becomes destructive once the shell expands a variable, glob, command substitution, or alias (`rm -rf "$DIR"`, `rm -rf $EMPTY/`, etc.). The gate sees the pre-expansion text, not the resolved command.
- **Commands on the far side of a nested session** — once you've `ssh`'d or `docker exec`'d into another host/container, the destructive text runs **there**, and the gate (which inspects the bytes you send, not what the remote shell ultimately executes) does not meaningfully protect the remote.
- **Anything not on the list** — it is a denylist of *blocked* forms, not an exhaustive classifier. Novel or obfuscated destructive commands pass through.

Do not rely on the gate as your only protection. Use OS-level isolation (a dedicated user, container, VM, restricted credentials, backups) for anything you actually care about. `force: true` bypasses the gate entirely, and `raw: true` bypasses input sanitization (see below).

### Input sanitization on `pty_send` (control / paste markers)

By default `pty_send` strips bracketed-paste terminators (`ESC[200~` / `ESC[201~`), ANSI/CSI/OSC escape sequences, and other control characters from the text before it reaches the pane (tab and newline are preserved). This reduces the chance that pasted/streamed content smuggles in terminal escape sequences or breaks out of a bracketed-paste region into unintended execution.

This sanitization is **opt-out**: `raw: true` sends the bytes verbatim, and `force: true` bypasses the destructive gate. Both exist deliberately for legitimate use; understand that using them removes the corresponding protection.

### Output neutralization on `pty_read`

`pty_read` strips/normalizes control characters and ANSI escapes from the text it returns (carriage-return progress overwrites are collapsed to their final state, escape sequences removed). This keeps captured terminal output from injecting control sequences into the consuming client's display, in addition to reducing tokens. `pty_read({ raw: true })` returns the unprocessed text and therefore does **not** neutralize it.

### Session-name validation (path-traversal / injection)

Session names are validated against `^[A-Za-z0-9_-]{1,64}$` at **every entry point** (`pty_open`, `pty_send`, `pty_read`, `pty_key`, `pty_close`). Names flow into filesystem paths (the per-session `.log` / `.offset` / `.lastcmd` files) and into the `pipe-pane` shell string, so the restriction blocks path traversal (`../`) and shell-injection metacharacters (quotes, `$`, `;`, …). The log path written into `pipe-pane`'s `/bin/sh -c` argument is additionally single-quoted with `'\''` escaping, defending the tmux-internal path even against quote-bearing temp directories.

### tmux configuration

tmux is started with `-f /dev/null`, so it does **not** read `~/.tmux.conf`. This is for reproducibility across machines, but it also means your local tmux config (including any hardening you keep there) does **not** apply to aiterm's sessions. All aiterm sessions share one socket; `tmux -S … kill-server` terminates all of them at once.

### Native Windows note

On native Windows there is no tmux, so every tmux call is bridged through WSL (`wsl.exe -e tmux`). The shell, the session, the socket, and human `attach` all live **inside your WSL distro**. The trust and reach described above therefore apply to that WSL environment (its user, filesystem, and `/mnt` mounts), which can reach back into Windows (e.g. by nesting `powershell.exe`).

### Out of scope

aiterm-mcp does not attempt to sandbox, audit, or rate-limit what the connected client does with the terminal, and it does not authenticate clients — it speaks stdio to whatever MCP client launched it. Isolation and access control are the operator's responsibility (OS user, container/VM, credential scoping). Reports that amount to "the AI ran a command I gave it the ability to run" describe intended behavior, not a vulnerability. Genuine issues — e.g. a way to bypass session-name validation, escape the `pipe-pane` quoting, inject escape sequences past the `pty_send`/`pty_read` sanitizers, or otherwise make aiterm do something its documented model says it should not — are in scope; please report them as above.
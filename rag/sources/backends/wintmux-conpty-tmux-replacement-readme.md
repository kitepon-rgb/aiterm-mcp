---
title: "WinTmux — Windows-native tmux replacement using ConPTY (README)"
source_url: "https://raw.githubusercontent.com/orlunix/wintmux/main/README.md"
source_type: github_readme
fetched: 2026-08-16
topic: backends
tags: ["windows", "conpty", "tmux-compatible", "multiplexer"]
summary: "ConPTYを使うWindowsネイティブのtmux置換を名乗るプロジェクト。CAM (Claude Agent Manager) とのdrop-in互換を掲げる。詳細な互換範囲・成熟度は本READMEで確認する。"
relevance: "AIエージェント文脈でtmux CLI互換を狙う同種プロジェクトの併記候補。psmuxとの比較材料。"
chars: 4087
---

# WinTmux

Windows-native tmux-compatible session manager, designed to let
[CAM (Coding Agent Manager)](https://github.com/orlunix/cam) run on
native Windows PowerShell.

## What It Does

WinTmux replicates the subset of tmux commands that CAM relies on,
using the Windows **ConPTY** API as the backend. Each session runs
as an independent daemon process with its own pseudo-terminal, scrollback
buffer, and TCP-based IPC channel.

## Supported Commands

| Command | Description |
|---------|-------------|
| `new-session -d -s NAME -c DIR CMD` | Create a detached session |
| `send-keys -t TARGET -l -- TEXT` | Send literal text input |
| `send-keys -t TARGET Enter` | Send special key (Enter, Escape, etc.) |
| `capture-pane -p -J -t TARGET -S -N` | Capture last N lines of output |
| `has-session -t NAME` | Check if session exists (exit code) |
| `kill-session -t NAME` | Terminate a session |
| `set-option -t NAME history-limit N` | Set scrollback buffer size |
| `pipe-pane -t TARGET "cat >> PATH"` | Stream output to a log file |
| `-V` | Print version |

## Building

### Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- Windows 10 version 1809+ (for ConPTY support)

### Cross-compile from WSL2/Linux

```bash
cd wintmux

# Run unit tests (platform-independent)
make test

# Build Windows executable
make build-windows
# → produces wintmux.exe
```

### Build on Windows

```powershell
cd wintmux
go build -o wintmux.exe ./cmd/wintmux/
```

## Quick Start

```powershell
# Create a session running a PowerShell script
.\wintmux.exe -S C:\tmp\my-session.sock new-session -d -s agent1 -c C:\work "powershell -Command 'while($true){Get-Date; Start-Sleep 2}'"

# Check if it's running
.\wintmux.exe -S C:\tmp\my-session.sock has-session -t agent1

# Capture output
.\wintmux.exe -S C:\tmp\my-session.sock capture-pane -p -J -t agent1:0.0 -S -20

# Send input
.\wintmux.exe -S C:\tmp\my-session.sock send-keys -t agent1:0.0 -l -- "hello"
.\wintmux.exe -S C:\tmp\my-session.sock send-keys -t agent1:0.0 Enter

# Kill the session
.\wintmux.exe -S C:\tmp\my-session.sock kill-session -t agent1
```

## Integration Tests (Windows)

```powershell
cd wintmux

# Full CAM workflow test
.\scripts\test-cam-workflow.ps1
```

## Architecture

```
┌──────────────┐     TCP 127.0.0.1     ┌──────────────────┐
│  wintmux CLI │ ◄──────────────────► │  Session Daemon   │
│              │   JSON over TCP       │  ┌──────────────┐ │
│  new-session │                      │  │   ConPTY      │ │
│  send-keys   │                      │  │  ┌────────┐  │ │
│  capture-pane│                      │  │  │ child  │  │ │
│  has-session │                      │  │  │ process│  │ │
│  kill-session│                      │  │  └────────┘  │ │
│              │                      │  │  Scrollback   │ │
└──────────────┘                      │  └──────────────┘ │
                                      └──────────────────┘
```

Each `new-session` spawns a daemon process that:
1. Creates a ConPTY and starts the child process inside it.
2. Listens on `127.0.0.1:<random-port>` for IPC commands.
3. Writes a control file (JSON with port + PID) to the `-S` socket path.
4. Maintains a scrollback buffer fed by ConPTY output.
5. Exits when the child process terminates (after a 5-second grace period).

See [DESIGN.md](DESIGN.md) for the full technical specification.

## Project Structure

```
wintmux/
├── cmd/wintmux/
│   ├── main.go              # CLI entry point + command dispatch
│   ├── spawn_windows.go     # Daemon spawn (Windows)
│   └── spawn_other.go       # Daemon spawn (Linux/macOS)
├── internal/
│   ├── cli/parser.go        # tmux-compatible argument parser
│   ├── scrollback/buffer.go # Thread-safe ring buffer
│   ├── ipc/                 # Length-prefixed JSON protocol + client
│   ├── pty/                 # Terminal interface (ConPTY / exec pipe)
│   └── daemon/daemon.go     # Session daemon logic
├── scripts/                 # PowerShell integration tests
├── DESIGN.md                # Technical design document
└── Makefile                 # Build automation
```

## License

MIT

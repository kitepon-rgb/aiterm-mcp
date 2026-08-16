---
title: "minimux — Windows native session persistence daemon (README)"
source_url: "https://raw.githubusercontent.com/llk214/minimux/main/README.md"
source_type: github_readme
fetched: 2026-08-16
topic: backends
tags: ["windows", "conpty", "named-pipe", "persistence", "daemon"]
summary: "多重化なしのWindowsネイティブセッション永続デーモン。バックグラウンドデーモンがConPTY sessionを保持し、クライアントはnamed pipeで接続、再接続時にscrollback再生。attach/detach/status/killのみでsend/capture系外部制御なし。MIT。既知制限にリサイズ時scrollback破損。"
relevance: "ConPTY+named pipe+常駐デーモンという最小構成の実例。自作する場合の規模感の下限と、既知の難所（リサイズ時の履歴破損）を示す。"
chars: 1961
---

# minimux

Minimal terminal session persistence for Windows. Like [dtach](https://github.com/crigler/dtach) but native Windows — no WSL, no Cygwin, no MSYS2.

Start a shell session, detach from it, close the window, and reattach later. Your shell and all running processes keep going in the background.

## Usage

```
mm              # Start a new session or attach to an existing one
mm status       # Show session status
mm kill         # Kill the running session
```

Keybindings (tmux-style):

- `Ctrl+B d` — detach from session (session keeps running — reattach anytime with `mm`)
- `Ctrl+B Ctrl+B` — send literal Ctrl+B to the shell

## Options

```
mm --shell cmd          # Use a specific shell (default: auto-detects pwsh > powershell > cmd)
mm --scrollback 5000    # Set scrollback buffer size in lines (default: 1000)
```

## How it works

`mm` runs a background daemon that holds a [ConPTY](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/) session. The client connects to the daemon via a Windows named pipe, relays keyboard input, and displays terminal output. On reattach, scrollback history is replayed so you can see what happened while detached.

## Known limitations

- **Window resize garbles scrollback.** minimux relays raw PTY output to your terminal. When you resize the window, the terminal reflows its buffer and ConPTY sends reflow sequences — the two conflict, producing duplicated/garbled content in scrollback history. The visible screen recovers after the shell redraws, but scrollback history will be messy. If you use a fixed-size terminal (e.g. SSH from a phone/tablet), this is a non-issue.

## Requirements

- Windows 10 (1809+) or Windows 11
- x86_64

## Building from source

```
cargo build --release --target x86_64-pc-windows-msvc
```

The binary is at `target/x86_64-pc-windows-msvc/release/mm.exe`. Copy it anywhere or add it to your PATH.

## License

MIT

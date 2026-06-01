---
title: "terminal-mcp (ianks) native Unix PTY MCP README"
source_url: "https://raw.githubusercontent.com/ianks/terminal-mcp/main/README.md"
source_type: github_readme
fetched: 2026-06-01
topic: prior-art
tags: ["mcp", "rust", "pty", "pty-process", "tokio", "async", "smart-buffering", "session-persistence", "control-character"]
summary: "Rust製の真のUnix PTY制御MCPサーバ。tokio非同期I/Oでスマートバッファリング(新規出力のみ・重複なし)、複数セッション永続。"
relevance: "『抽象化なし、ただのシェル』哲学で真PTYを直接握る最小実装の手本。execute_command(同期)/execute_command_async+read_streaming_output(ポーリング)/send_control_characterの分離は我々のpty_open/send/read/closeの正準形。スマートバッファリングはread差分配信の参考。"
chars: 1894
---

# terminal-mcp

> **native** mcp server for unix pty control.

## what

mcp server that gives ai models real terminal access. spawn sessions, run commands, read output. that's it.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_session",
    "arguments": {
      "session_name": "prod-debug",
      "command": "ssh prod.server"
    }
  }
}
```

## features

- **true ptys** not applescript hacks, real unix terminals
- **async everything** tokio-powered non-blocking i/o
- **smart buffering** only new output, no duplicates
- **session persistence** terminals stay alive between calls
- **multi-session support** run multiple terminals at once and switch between them

## concepts

- **sessions**: named terminal instances (`bash`, `python`, `ssh`)
- **tools**: mcp protocol endpoints the ai calls
- **ptys**: pseudo-terminals for proper shell interaction
- **managers**: lifecycle and cleanup automation

## tools

- `create_session`: spawn a new terminal
- `execute_command`: run and get output immediately
- `execute_command_async`: start long-running commands
- `read_streaming_output`: poll async command progress
- `list_sessions`: see what's running
- `destroy_session`: cleanup when done
- `send_control_character`: ctrl-c and friends

## config

claude code:

```bash
cargo install --git https://github.com/ianks/terminal-mcp
claude mcp add --scope user terminal-mcp
```

## dev

```bash
cargo test -- --nocapture           # see test output
RUST_LOG=debug cargo run            # verbose logging
cargo clippy                        # lint
cargo fmt                           # format
```

## architecture

```
mcp api layer (json-rpc)
    ↓
session manager (lifecycle)
    ↓
pty engine (pty-process)
    ↓
unix ptys (kernel)
```

## philosophy

> ai can interact with computers like humans do.
> no abstractions. just shells.

## license

mit

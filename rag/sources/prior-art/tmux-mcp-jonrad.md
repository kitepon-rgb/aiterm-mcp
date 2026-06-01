---
title: "tmux-mcp (jonrad) README"
source_url: "https://raw.githubusercontent.com/jonrad/tmux-mcp/main/README.md"
source_type: github_readme
fetched: 2026-06-01
topic: prior-art
tags: ["mcp", "tmux", "arbitrary-commands", "send-keys", "read-pane", "proof-of-concept", "backend"]
summary: "任意のtmuxコマンド実行・ペイン読み取り・キーストローク送信を行うPoC級のtmux MCPサーバ(uvx配布)。"
relevance: "『端末へsendする1コマンド』に最も近い割り切り(任意tmuxコマンドを薄く通すだけ)の実装例。最小ラッパーがどこまで使えるか、PoC段階の制約(完了検出未実装)を我々の薄い層の下限ケースとして比較できる。"
chars: 602
---

# Tmux MCP Server

A POC [MCP (Model Context Protocol) Server](https://modelcontextprotocol.io/introduction) implementation that provides programmatic control over tmux sessions

## Warning

This is a proof of concept and should not be used in production. Using this, you can run arbitrary tmux commands, including reading pane contents and sending keys.

## Features

- Run arbitrary tmux commands

## Usage

### In your MCP client configuration:

```json
"mcpServers": {
    "tmux": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/jonrad/tmux-mcp", "tmux-mcp"]
    },
}
```

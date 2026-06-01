---
title: "tmux-mcp (nickgnd) README"
source_url: "https://raw.githubusercontent.com/nickgnd/tmux-mcp/main/README.md"
source_type: github_readme
fetched: 2026-06-01
topic: prior-art
tags: ["mcp", "tmux", "capture-pane", "execute-command", "command-result", "resources", "exit-code", "backend"]
summary: "tmuxの読み取り・制御・観測をMCP化したサーバ。capture-paneでペイン内容取得、execute-command+get-command-resultでコマンド結果を追跡。"
relevance: "tmuxバックエンドでcapture-paneを使う正準的な実装パターンの一次資料。execute-command→get-command-resultのcommandId経由の結果取得とresource(tmux://command/{id}/result)露出は、我々のtmuxバックエンド+完了境界検出の設計直参照。"
chars: 2265
---

# Tmux MCP Server

Model Context Protocol server that enables Claude Desktop to interact with and view tmux session content. This integration allows AI assistants to read from, control, and observe your terminal sessions.

## Features

- List and search tmux sessions
- View and navigate tmux windows and panes
- Capture and expose terminal content from any pane
- Execute commands in tmux panes and retrieve results (use it at your own risk ⚠️)
- Create new tmux sessions and windows
- Split panes horizontally or vertically with customizable sizes
- Kill tmux sessions, windows, and panes

Check out this short video to get excited!

</br>

[![youtube video](http://i.ytimg.com/vi/3W0pqRF1RS0/hqdefault.jpg)](https://www.youtube.com/watch?v=3W0pqRF1RS0)

## Prerequisites

- Node.js
- tmux installed and running

## Usage

### Configure Claude Desktop

Add this MCP server to your Claude Desktop configuration:

```json
"mcpServers": {
  "tmux": {
    "command": "npx",
    "args": ["-y", "tmux-mcp"]
  }
}
```

### MCP server options

You can optionally specify the command line shell you are using, if unspecified it defaults to `bash`

```json
"mcpServers": {
  "tmux": {
    "command": "npx",
    "args": ["-y", "tmux-mcp", "--shell-type=fish"]
  }
}
```

The MCP server needs to know the shell only when executing commands, to properly read its exit status.

## Available Resources

- `tmux://sessions` - List all tmux sessions
- `tmux://pane/{paneId}` - View content of a specific tmux pane
- `tmux://command/{commandId}/result` - Results from executed commands

## Available Tools

- `list-sessions` - List all active tmux sessions
- `find-session` - Find a tmux session by name
- `list-windows` - List windows in a tmux session
- `list-panes` - List panes in a tmux window
- `capture-pane` - Capture content from a tmux pane
- `create-session` - Create a new tmux session
- `create-window` - Create a new window in a tmux session
- `split-pane` - Split a tmux pane horizontally or vertically with optional size
- `kill-session` - Kill a tmux session by ID
- `kill-window` - Kill a tmux window by ID
- `kill-pane` - Kill a tmux pane by ID
- `execute-command` - Execute a command in a tmux pane
- `get-command-result` - Get the result of an executed command

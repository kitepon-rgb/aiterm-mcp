---
title: "mcp-ssh-interactive (qnxqnxqnx) README"
source_url: "https://raw.githubusercontent.com/qnxqnxqnx/mcp-ssh-interactive/main/README.md"
source_type: github_readme
fetched: 2026-06-01
topic: prior-art
tags: ["mcp", "ssh", "tmux", "async-polling", "interrupt", "session-persistence", "state-json", "backend"]
summary: "tmuxで永続SSHセッションを張り、人間のように対話操作(プロンプト/Ctrl+C/履歴)を行わせるMCPサーバ。"
relevance: "SSHを専用ツール化せず『端末へ送る1コマンド』に近い発想で、tmuxバックエンド+execute_command(即時復帰)/get_terminal_output(非同期ポーリング)の境界設計が我々のsend/read分離と完了検出に直結。state.json/ログpipeの永続化方式も参考。"
chars: 11712
---

## MCP SSH Interactive

An MCP (Model Context Protocol) server that enables AI agents to run fully interactive SSH sessions (via tmux) and execute commands like a human operator.

### Features

- **Interactive SSH via tmux**: real terminal behavior, prompts, Ctrl+C, history.
- **Persistent sessions**: sessions survive across tool calls; reconnectable.
- **Multiple concurrent connections**: manage many servers in parallel.
- **Complete output capture**: retrieve terminal buffer reliably.
- **Async commands + polling**: fire-and-check pattern for long tasks.
- **Server-specific information**: provide custom instructions and commands per server via markdown files.

### Requirements

- **Python**: 3.9+
- **tmux**: 2.6+ (`tmux -V`)
  - Install: `brew install tmux` on macOS, `apt install tmux` / `yum install tmux` / `pacman -S tmux` on Linux
- **OpenSSH client**: 7.0+
- **OS**: Linux or macOS

### Installation

**For end users** (just want to use the MCP server):

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-ssh-interactive.git
cd mcp-ssh-interactive

# Install with pip
pip install .
```

Or using pipx for an isolated environment (recommended):

```bash
# Install with pipx
pipx install .
```

**For developers** (working on the code):

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-ssh-interactive.git
cd mcp-ssh-interactive

# Install in editable mode
pip install -e .
```

Note: This package is not currently published to PyPI, so installation from source is required.

### Configuration

Create `~/.mcp-ssh-interactive/config.yml` with your SSH targets:

```yaml
connections:
  my-server:
    host: 192.168.1.100
    user: username
    key_path: ~/.ssh/id_rsa
    port: 22
    description: My remote server
    info_file: my-server.md  # Optional: path to server-specific info file
  prod-db:
    host: db.example.com
    user: deploy
    key_path: ~/.ssh/id_ed25519
    port: 22
    description: Production database host (read-only)
  test-server:
    host: test.example.com
    user: demo
    password: mypassword
    port: 22
    description: Test server with password authentication
```

Notes:
- Either `key_path` or `password` must be provided for authentication
- `key_path` is strongly recommended over `password` for security
- If using `key_path`, it must exist and be readable; typical permissions `chmod 600`
- `~/.mcp-ssh-interactive/config.yml` is required; if missing or invalid the server exits with a clear error
- `info_file` (optional): Path to a markdown file containing server-specific instructions and information. See [Server-Specific Information](#server-specific-information) below.

Schema (informal):
- **connections**: map of connection name → object
  - **host** (string, required)
  - **user** (string, required)
  - **key_path** (string, optional but recommended; `~` expanded; verified to exist)
  - **password** (string, optional; requires either this or `key_path`)
  - **port** (int, default `22`)
  - **description** (string, optional)
  - **info_file** (string, optional): Path to markdown file with server-specific information. Supports:
    - Relative paths (e.g., `my-server.md`) - resolved relative to `~/.mcp-ssh-interactive/info/`
    - Absolute paths starting with `~` (e.g., `~/custom/path/server.md`)
    - Absolute paths starting with `/` (e.g., `/tmp/server.md`)

Note: At least one of `key_path` or `password` must be provided. Using `key_path` is strongly recommended for security.

### Server-Specific Information

You can provide server-specific instructions, commands, and important information for each server by creating markdown files and referencing them in your configuration using the `info_file` field. This enables AI agents to interact with a server using the specific tools, methods, and workflows that are relevant to that particular environment. You can also document routine tasks and procedures in these files, allowing AI agents to quickly understand a server's unique requirements and successfully execute tasks based on user requests.

**Example:**

When an `info_file` is defined for a server, users can simply mention tasks like "restart the application" or "deploy the latest version", and the AI agent will know exactly which commands to execute and what procedures to follow for that specific server.

1. Create a markdown file at `~/.mcp-ssh-interactive/info/prod-web-server.md`:

```markdown
# Production Web Server

## Authentication & Access

- Root access: `sudo su -` (password: `prod_admin_2024`)
- Application user: `sudo -u webapp bash` (required for all app commands)

## Key Paths

- Application: `/opt/webapp/current`
- Configuration: `/opt/webapp/config/production.yml`
- Logs: `/var/log/webapp/`

## Common Tasks

### Restart Application
sudo systemctl restart webapp

### Deploy New Version
cd /opt/webapp/releases
sudo -u webapp /opt/webapp/bin/deploy.sh --version latest
curl -s http://localhost:8080/health | jq .

### Check Application Status
sudo systemctl status webapp
journalctl -u webapp -n 50 --no-pager

### View Logs
tail -f /var/log/webapp/application.log

### Database Backup
sudo /usr/local/bin/backup-db.sh production

## Important Constraints

- Read-only database: This server connects to a read-only replica. Never attempt write operations.
- Maintenance window: Deployments only between 02:00-04:00 UTC
- Monitoring: https://monitoring.example.com/d/webapp-prod
```

2. Reference it in your config:

```yaml
connections:
  my-server:
    host: 192.168.1.100
    user: username
    key_path: ~/.ssh/id_rsa
    info_file: my-server.md  # Relative path (resolved to ~/.mcp-ssh-interactive/info/my-server.md)
```

**Info File Path Resolution:**

- **Relative paths** (e.g., `my-server.md`): Resolved relative to `~/.mcp-ssh-interactive/info/`
- **Paths starting with `~`** (e.g., `~/custom/path/server.md`): Treated as absolute paths
- **Paths starting with `/`** (e.g., `/tmp/server.md`): Treated as absolute paths

Server-specific information from `info_file` is available for all sessions using that server configuration.

### Starting the MCP server

The server runs over stdio and is launched by your MCP client. You can also start it manually:

```bash
mcp-ssh-interactive
```

If `tmux` is not installed or config is invalid, the server exits with an error.

### Using with MCP clients (generic JSON config)

Add an entry for this server in your MCP client configuration. The generic structure is:

```json
{
  "mcpServers": {
    "mcp-ssh-interactive": {
      "command": "mcp-ssh-interactive"
    }
  }
}
```

Different MCP clients might use different configuration file formats and locations. Please check the relevant documentation for your specific MCP client to determine where and how to add MCP server configurations.

After adding, restart or reload your client so it can discover the new server.

### Typical Workflow

When this MCP server is available to an agent, you can simply ask the agent to open a session on server `my-server` and describe the tasks you need to perform. The agent will normally automatically check the list of available servers in the config file, find the named server, open a new session, and run any initialization tasks specified in the `info_file` field if configured.

### Available tools

The server provides the following tools:
- **list_available_configs**: Lists available connection configurations from `~/.mcp-ssh-interactive/config.yml`.
- **open_connection**: Opens an SSH connection and starts a tmux session with logging.
- **list_connections**: Lists active connections and their status.
- **execute_command**: Executes a command on the remote server (returns immediately).
- **get_terminal_output**: Retrieves the current terminal output from the remote session.
- **interrupt_command**: Sends Ctrl+C to interrupt a running command.
- **close_connection**: Closes a connection and terminates the tmux session.
- **get_server_info**: Retrieves server-specific information from the configured `info_file` (if available).

### File Structure

All files are stored in `~/.mcp-ssh-interactive/`:

```
~/.mcp-ssh-interactive/
├── config.yml           # SSH connection configurations
├── state.json           # Active session state
├── logs/                # Session logs
│   └── <session_name>.log
└── info/                # Server-specific info files
    └── <server-name>.md
```

**Files:**
- **config.yml**: SSH connection configurations with host, user, keys, and optional `info_file` references
- **state.json**: Tracks active sessions, their tmux names, log file paths, and timestamps
- **logs/**: Directory containing session logs (one per active session)
  - tmux pipes pane output to these files from the moment the connection opens
  - Files are created with directory permissions `700`; rotate/prune as needed
- **info/**: Directory for server-specific information files (markdown format)
  - Referenced via `info_file` field in config.yml
  - Can use relative paths (e.g., `my-server.md`) or absolute paths

All files are local to the machine running the MCP server (your workstation).

### Troubleshooting

- "tmux is not installed or not accessible"
  - Install tmux (`brew install tmux` on macOS, `apt/yum/pacman` on Linux) and ensure it's in `$PATH`.

- "Configuration file not found" or "Configuration is empty"
  - Create `~/.mcp-ssh-interactive/config.yml` as shown above; verify correct YAML.

- "Key file not found" or SSH failures (permission denied, host key verification)
  - Check `key_path` exists and has `chmod 600`.
  - Ensure `ssh -i <key> user@host` works outside of MCP.
  - Pre-accept host keys with a first manual SSH or configure `known_hosts`.

- No logs written
  - Confirm `~/.mcp-ssh-interactive/logs/` exists and is writable; server creates it automatically.
  - Confirm your `session_name` and check the matching log path.

- "Info file not found" error when calling `get_server_info`
  - Check that the `info_file` path in your config is correct.
  - For relative paths, ensure the file exists in `~/.mcp-ssh-interactive/info/`.
  - Verify the file has proper read permissions.

### Security considerations

## ⚠️ SECURITY WARNING

- **This MCP server grants AI agents full control at the authenticated user's permission level.**
- If logged in as `root`, the AI agent can execute **any command** that root can, including destructive operations
- The AI agent can read, modify, or delete files, install/remove software, change configurations, and perform any other system operations
- There are no built-in safeguards preventing the AI agent from making irreversible changes
- The `execute_command` tool includes instructions for AI agents to ask for confirmation before executing state-changing commands, but this is guidance - not enforcement. Always be vigilant.
- Always use least-privilege accounts; avoid using root or admin accounts when possible.
- Clearly define task boundaries in your instructions to AI agents (read-only vs. modification allowed).
- Never use this server on production systems without extreme care and explicit task boundaries

This tool is powerful and convenient, but with great power comes great responsibility. Always be explicit about what the AI agent is allowed to do.

**File and Data Security:**
- Never commit `~/.mcp-ssh-interactive/config.yml` or private keys to source control.
- Treat `~/.mcp-ssh-interactive/logs/*.log` as sensitive; they may contain command outputs.
- Treat `~/.mcp-ssh-interactive/info/*.md` as sensitive if they contain passwords or sensitive information.

### Development

Run simple integration checks:
```bash
python tests/test_integration.py
```

### License

MIT

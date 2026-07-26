---
title: "Smithery CLI"
source_url: "https://smithery.ai/docs/concepts/cli"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["smithery", "cli", "mcpb"]
summary: "Smithery CLIの認証・公開コマンドとMCPB関連機能。"
relevance: "Smithery登録の実行経路を確認する一次資料。"
chars: 7305
---

> ## Documentation Index
>
> Fetch the complete documentation index at: </docs/llms.txt>
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](#content-area)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘K

### Welcome

* [Introduction](/docs)

### Connect

* [Connect to MCPs](/docs/use/connect)
* [Uplink](/docs/use/uplink)
* [Token Scoping](/docs/use/token-scoping)
* [Deep Linking](/docs/use/deep-linking)
* [Listing Your Client](/docs/use/listing_your_client)

### Publish

* [Overview](/docs/build)
* [Publish](/docs/build/publish)
* [Triggers](/docs/build/triggers)

### Integrations

* [Vercel AI SDK Integration](/docs/integrations/vercel_ai_sdk)

### Concepts

* [What is MCP?](/docs/concepts/what_is_mcp)
* [Namespaces](/docs/concepts/namespaces)
* [Smithery CLI](/docs/concepts/cli)

### Cookbooks

* [Build an OAuth-compatible client](/docs/cookbooks/typescript_oauth_client)

### API Reference

* API Reference
* servers
* skills
* tokens
* namespaces
* organizations
* connect

* Support
* [Discord](https://discord.gg/Afd38S5p9A)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘KAsk Assistant

* Support
* [Discord](https://discord.gg/Afd38S5p9A)
* [Discord](https://discord.gg/Afd38S5p9A)

Search...

Navigation

Concepts

Smithery CLI

Concepts

# Smithery CLI

Copy pageCopy page

Use the Smithery CLI to search, connect, and manage MCP servers and skills from the command line.

Copy pageCopy page

## View the Smithery CLI on GitHub

The Smithery CLI connects your agents to thousands of skills and MCP servers
directly from the command line.

## [​](#installation) Installation

```
npm install -g smithery@latest
```

Requires Node.js 20+.

## [​](#examples) Examples

```
# Show the help menu
smithery --help

# Authenticate with Smithery
smithery auth login

# Search for MCP servers
smithery mcp search "github"

# Add an MCP server to a local client (e.g., Claude Desktop)
smithery mcp add exa --client claude

# Add an MCP server as a remote Smithery connection
smithery mcp add https://server.smithery.ai/exa --id exa

# List tools from your connected MCP servers
smithery tool list

# Call a tool
smithery tool call exa search '{"query": "latest news about MCP"}'

# Search and add skills
smithery skill search "code review"
smithery skill add anthropics/frontend-design --agent claude-code
```

## [​](#reference) Reference

### [​](#mcp-servers) MCP Servers

```
smithery mcp search [term]              # Search the Smithery registry
smithery mcp add <url>                  # Add an MCP connection (remote by default)
smithery mcp add <url> --client <name>  # Add to a local client (e.g., claude, cursor)
smithery mcp list                       # List your connections
smithery mcp remove <ids...>            # Remove connections
smithery mcp get <id>                   # Get connection details
smithery mcp update <id>               # Update a connection
smithery mcp publish <url> -n <name>    # Publish a URL-based MCP server
smithery mcp publish <bundle.mcpb> -n <name>  # Publish an MCPB bundle
```

### [​](#tools) Tools

Interact with tools from MCP servers connected via `smithery mcp`.

```
smithery tool list [connection]                    # List tools from your connected MCP servers
smithery tool find [query]                         # Search tools by name or intent
smithery tool get <connection> <tool>              # Show full details for one tool
smithery tool call <connection> <tool> [args]      # Call a tool
```

### [​](#skills) Skills

Browse and add skills from the [Smithery Skills Registry](https://smithery.ai/skills).

```
smithery skill search [query]                      # Search skills
smithery skill add <skill> --agent <name>          # Add a skill
```

### [​](#auth) Auth

```
smithery auth login                     # Login with Smithery (OAuth)
smithery auth logout                    # Log out
smithery auth whoami                    # Check current user
smithery auth token                     # Mint a service token
```

### [​](#namespaces) Namespaces

```
smithery namespace list                 # List your namespaces
smithery namespace use <name>           # Set current namespace
```

### [​](#global-flags) Global Flags

* `--json` - Output as JSON (auto-detected in non-TTY environments)
* `--table` - Output as table
* `--verbose` - Show detailed logs for debugging
* `--help` - Show help message

### [​](#examples-2) Examples

```
# Add an MCP server to Claude Desktop
smithery mcp add mcp-obsidian --client claude

# Add with pre-configured data (skips prompts)
smithery mcp add mcp-obsidian --client claude --config '{"vaultPath":"path/to/vault"}'

# Remove a server from a client
smithery mcp remove mcp-obsidian --client claude

# Search for MCP servers with JSON output
smithery --json mcp search "database"

# List tools from a specific connection
smithery tool list my-github

# Find tools by intent
smithery tool find "create issue"

# Call a tool with JSON arguments
smithery tool call my-github create_issue '{"title":"Bug fix","body":"..."}'

# Login and check auth
smithery auth login
smithery auth whoami

# Publish your MCP server
smithery mcp publish "https://my-server.com" -n myorg/my-server

# Publish an MCPB bundle
smithery mcp publish ./server.mcpb -n myorg/my-server

# Show help
smithery --help
```

### [​](#important-notes) Important Notes

* Use `auth login` to authenticate with Smithery (required for some operations)
* Remember to restart your AI client after adding or removing servers
* Use `--verbose` flag for detailed logs when troubleshooting
* Use `--json` flag for machine-readable output
* `mcp publish` accepts either a public MCP URL or a local `.mcpb` bundle

Was this page helpful?

YesNo

[Previous](/docs/concepts/namespaces)[Build an OAuth-compatible clientHow to build an OAuth client in Typescript using Next.js

Next](/docs/cookbooks/typescript_oauth_client)

⌘I

[github](https://github.com/smithery-ai)[twitter](https://twitter.com/SmitheryDotAI)[discord](https://discord.gg/Afd38S5p9A)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=smithery)

## On this page

* [Installation](#installation)
* [Examples](#examples)
* [Reference](#reference)
  + [MCP Servers](#mcp-servers)
  + [Tools](#tools)
  + [Skills](#skills)
  + [Auth](#auth)
  + [Namespaces](#namespaces)
  + [Global Flags](#global-flags)
  + [Examples](#examples-2)
  + [Important Notes](#important-notes)

Assistant

Responses are generated using AI and may contain mistakes.

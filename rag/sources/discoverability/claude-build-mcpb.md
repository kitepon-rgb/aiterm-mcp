---
title: "Build a desktop extension with MCPB"
source_url: "https://claude.com/docs/connectors/building/mcpb"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["claude-desktop", "mcpb", "distribution"]
summary: "Claude Desktop向けMCPBの公式build・install・platform guidance。"
relevance: "ローカルstdioサーバーをMCPBで配布する現行公式手順。"
chars: 14121
---

> ## Documentation Index
>
> Fetch the complete documentation index at: </docs/llms.txt>
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](#content-area)

[Claude.ai Documentation home page![light logo](https://mintcdn.com/claude-ai/1fyDNLAICe3KG6rB/logo/light.svg?fit=max&auto=format&n=1fyDNLAICe3KG6rB&q=85&s=e870c19cb781d8a7c7b7d19de53b0a10)![dark logo](https://mintcdn.com/claude-ai/1fyDNLAICe3KG6rB/logo/dark.svg?fit=max&auto=format&n=1fyDNLAICe3KG6rB&q=85&s=80cc0b06d8fd9aeefec8acb226de6866)](/docs)

Search...

⌘KAsk Assistant

* [Support](https://support.anthropic.com)
* [Go to Claude](https://claude.ai)
* [Go to Claude](https://claude.ai)

Search...

Navigation

Building Connectors

Build a desktop extension with MCPB

[Welcome](/docs)[Connectors](/docs/connectors/overview)[Skills](/docs/skills/overview)[Plugins](/docs/plugins/overview)[Cowork](/docs/cowork/overview)[Claude Tag](/docs/claude-tag/overview)[Claude for M365](/docs/office-agents/overview)[Claude Science](/docs/claude-science/overview)[Claude on third-party platforms](/docs/third-party/claude-desktop/overview)[Claude for Government](/docs/government/overview)

###

* [Overview](/docs/connectors/overview)
* [Getting started](/docs/connectors/getting-started)

### Third-party Connectors

* [Connectors directory](/docs/connectors/directory)
* [Connector verification](/docs/connectors/verification)
* [Remote MCP](/docs/connectors/custom/remote-mcp)
* [Desktop extensions](/docs/connectors/custom/desktop-extensions)
* [Submit to directory](/docs/connectors/building/submission)

### Building Connectors

* [Overview](/docs/connectors/building)
* [What to build](/docs/connectors/building/what-to-build)
* [Authentication](/docs/connectors/building/authentication)
* [Model Context Protocol (MCP)](/docs/connectors/building/mcp)
* [Lazy authentication](/docs/connectors/building/lazy-authentication)
* [Enterprise Managed Auth](/docs/connectors/building/enterprise-managed-auth)
* [Directory vs custom](/docs/connectors/building/directory-vs-custom)
* [Testing](/docs/connectors/building/testing)
* [Troubleshooting](/docs/connectors/building/troubleshooting)
* [Review criteria](/docs/connectors/building/review-criteria)
* [After publishing](/docs/connectors/building/after-publishing)
* [Manage your listing](/docs/connectors/building/managing-your-listing)
* [MCPB (desktop extensions)](/docs/connectors/building/mcpb)
* MCP Apps

### Built-in Integrations

* Google Integrations
* Microsoft Integrations
* [GitHub integration](/docs/connectors/github)
* [Slack integration](/docs/connectors/slack)

## On this page

* [What is an MCPB?](#what-is-an-mcpb)
* [Local (MCPB) vs remote: which to build](#local-mcpb-vs-remote-which-to-build)
* [Choose a language](#choose-a-language)
* [Platform support](#platform-support)
* [Quickstart](#quickstart)
* [manifest.json](#manifest-json)
* [Add an icon](#add-an-icon)
* [User configuration](#user-configuration)
* [How users install your MCPB](#how-users-install-your-mcpb)
* [Resources](#resources)
* [Get help](#get-help)
* [Ready for distribution](#ready-for-distribution)

Building Connectors

# Build a desktop extension with MCPB

Copy pageCopy page

Package a local MCP server as a single-click .mcpb install for Claude Desktop

Copy pageCopy page

MCPB is the secondary distribution path. Remote MCP servers are recommended for directory listing—see [what to build](/docs/connectors/building/what-to-build).

This guide covers building an MCP Bundle (`.mcpb`) for internal use, private distribution, or as a foundation for [submission to the Connectors Directory](/docs/connectors/building/submission).

## [​](#what-is-an-mcpb) What is an MCPB?

An `.mcpb` file is a zip archive containing a local MCP server and a `manifest.json`. It enables single-click installation in Claude Desktop, similar to a browser extension.
Key characteristics:

* Runs locally on the user’s machine
* Communicates via stdio transport
* Bundles all dependencies
* Works offline
* No OAuth required

See the [MCPB repository](https://github.com/modelcontextprotocol/mcpb) for the complete specification and the [Desktop Extensions blog post](https://www.anthropic.com/engineering/desktop-extensions) for an architecture overview.

## [​](#local-mcpb-vs-remote-which-to-build) Local (MCPB) vs remote: which to build

| Choose MCPB when you need | Choose a remote connector when you need |
| --- | --- |
| Access to systems behind your firewall (JIRA, Confluence, internal wikis, private databases) | Cloud services and public APIs with centralized infrastructure |
| Authentication via existing SSO and browser sessions, no token management | OAuth flows with server-side token management |
| Zero-trust compliance inside corporate network boundaries | Distribution across Claude on web, mobile, and desktop |
| Direct filesystem access for code editing and Git operations | Centralized updates pushed to all users |
| Integration with locally installed tools (Docker, IDEs, databases) | Public-facing integrations used by multiple organizations |
| Hardware integration and desktop application control |  |
| Privacy-sensitive operations that should not leave the user’s machine |  |
| One-click install with bundled Node.js runtime, no dependencies to manage |  |
| No cloud infrastructure, VPN configuration, or firewall rules |  |
| Organization-level admin controls (custom uploads, allowlists) |  |
| Full control over authentication, authorization, and audit logs |  |

**Key difference:** MCPBs run on the user’s machine via stdio with access to local and internal resources. Remote connectors run on your servers via HTTPS and are accessed through Anthropic’s infrastructure.
Organizations commonly build MCPBs as secure proxies to internal MCP servers, for internal documentation access, and to connect development tools while preserving their security architecture.
For remote connector guidance, see [building custom connectors](/docs/connectors/building/index).

## [​](#choose-a-language) Choose a language

Node.js is strongly recommended:

* Ships with Claude Desktop on macOS and Windows, so users need no separate runtime
* Best compatibility and reliability with Claude Desktop
* Extensive MCP SDK support

## [​](#platform-support) Platform support

Claude Desktop runs on macOS (`darwin`) and Windows (`win32`). Specify supported platforms in the `compatibility` section of your `manifest.json`. Test on both platforms even if you primarily develop on one.
See the [manifest spec compatibility section](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md#compatibility) for platform and runtime requirement details.

## [​](#quickstart) Quickstart

1

Install the MCPB CLI

```
npm install -g @anthropic-ai/mcpb
```

2

Create your MCP server

Build a stdio MCP server using the [MCP SDK](https://www.npmjs.com/package/%40modelcontextprotocol/sdk).

3

Generate the manifest

```
mcpb init
```

4

Bundle

```
mcpb pack
```

5

Install and test in Claude Desktop

Double-click the generated `.mcpb` file.

For detailed implementation guidance, see the [MCPB repository](https://github.com/modelcontextprotocol/mcpb), the [examples directory](https://github.com/modelcontextprotocol/mcpb/tree/main/examples) including a Hello World, and the [README “For Bundle Developers” section](https://github.com/modelcontextprotocol/mcpb/blob/main/README.md).

Before distributing your MCPB, review the testing and best-practices guidance in the MCPB README to ensure quality.

## [​](#manifest-json) manifest.json

The `manifest.json` file is required metadata describing what your MCPB does, how to run it, which tools it provides, and what configuration it needs.

| Reference |  |
| --- | --- |
| [MCPB Manifest Spec](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md) | Full schema with all fields |
| [Example manifests](https://github.com/modelcontextprotocol/mcpb/tree/main/examples) | Real-world implementations |
| [CLI documentation](https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md) | Command reference |

## [​](#add-an-icon) Add an icon

Icons are optional but recommended. Place `icon.png` in your bundle root and reference it in `manifest.json`.

| Requirement | Value |
| --- | --- |
| File name | `icon.png` (or a custom path) |
| Size | 512×512px recommended (minimum 256×256px) |
| Format | PNG with transparency |
| Location | Bundle root or specified path |

You can also provide multiple icon variants for different sizes and themes (light/dark mode). See the [manifest spec icons section](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md#icons) for variant syntax and best practices.

## [​](#user-configuration) User configuration

Define a `user_config` section in `manifest.json` and Claude Desktop automatically generates a settings UI for your extension. The [manifest spec user configuration section](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md#user-configuration) covers the full schema, configuration types, validation constraints, sensitive-data handling, and multi-select patterns.

## [​](#how-users-install-your-mcpb) How users install your MCPB

Users can install three ways:

1. **Double-click** the `.mcpb` file
2. **Drag and drop** the `.mcpb` file into the Claude Desktop window
3. **Settings**: Settings → Extensions → Advanced settings → Install Extension… → select the `.mcpb` file

All three open an installation UI where the user reviews extension details and permissions, configures required settings, grants permissions, and completes installation. Installation is per-user; each user installs separately on their own system.
For the end-user installation experience and Team/Enterprise admin controls (organization management, allowlists, policy configuration), see [Getting Started with Local MCP Servers on Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

## [​](#resources) Resources

**MCPB framework**

* [MCPB repository](https://github.com/modelcontextprotocol/mcpb): complete specification and tools
* [MCPB Manifest Spec](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md): full manifest schema
* [MCPB CLI documentation](https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md): command reference
* [MCPB examples](https://github.com/modelcontextprotocol/mcpb/tree/main/examples): reference implementations

**MCP protocol**

* [MCP specification](https://modelcontextprotocol.io/docs/getting-started/intro): protocol documentation
* [MCP quickstart](https://modelcontextprotocol.io/docs/develop/build-server): getting-started guide
* [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): Node.js implementation
* [Python SDK](https://github.com/modelcontextprotocol/python-sdk): Python implementation

**Claude Desktop**

* [Release notes](https://support.claude.com/en/articles/12138966-release-notes): version updates
* [Desktop Extensions blog](https://www.anthropic.com/engineering/desktop-extensions): architecture overview

## [​](#get-help) Get help

* [MCPB GitHub issues](https://github.com/modelcontextprotocol/mcpb/issues): bug reports and feature requests
* [MCP specification repo](https://github.com/modelcontextprotocol/modelcontextprotocol): protocol questions
* [Claude support](https://support.claude.com/en/articles/9015913-how-to-get-support): general Claude Desktop support

Check repository discussions for community Q&A, follow release notes for updates, and review the examples for implementation patterns.

## [​](#ready-for-distribution) Ready for distribution

If you have a working MCPB and want broader distribution and discoverability, submit it to the Connectors Directory. See [submitting to the directory](/docs/connectors/building/submission) for requirements including:

* Mandatory tool annotations for all tools
* Privacy policy requirements
* Working examples that exercise each tool
* Test credentials where applicable
* The complete submission process and review timeline

Was this page helpful?

YesNo

[Manage your listing](/docs/connectors/building/managing-your-listing)[Getting started](/docs/connectors/building/mcp-apps/getting-started)

⌘I

[Claude.ai Documentation home page![light logo](https://mintcdn.com/claude-ai/1fyDNLAICe3KG6rB/logo/light.svg?fit=max&auto=format&n=1fyDNLAICe3KG6rB&q=85&s=e870c19cb781d8a7c7b7d19de53b0a10)![dark logo](https://mintcdn.com/claude-ai/1fyDNLAICe3KG6rB/logo/dark.svg?fit=max&auto=format&n=1fyDNLAICe3KG6rB&q=85&s=80cc0b06d8fd9aeefec8acb226de6866)](/docs)

[x](https://x.com/AnthropicAI)[linkedin](https://www.linkedin.com/company/anthropicresearch)

Company

[Anthropic](https://www.anthropic.com/company)[Careers](https://www.anthropic.com/careers)[Economic Futures](https://www.anthropic.com/economic-futures)[Research](https://www.anthropic.com/research)[News](https://www.anthropic.com/news)[Trust center](https://trust.anthropic.com/)[Transparency](https://www.anthropic.com/transparency)

Help and security

[Availability](https://www.anthropic.com/supported-countries)[Status](https://status.anthropic.com/)[Support center](https://support.claude.com/)

Learn

[Courses](https://www.anthropic.com/learn)[MCP connectors](https://claude.com/partners/mcp)[Customer stories](https://www.claude.com/customers)[Engineering blog](https://www.anthropic.com/engineering)[Events](https://www.anthropic.com/events)[Powered by Claude](https://claude.com/partners/powered-by-claude)[Service partners](https://claude.com/partners/services)[Startups program](https://claude.com/programs/startups)

Terms and policies

[Privacy policy](https://www.anthropic.com/legal/privacy)[Disclosure policy](https://www.anthropic.com/responsible-disclosure-policy)[Usage policy](https://www.anthropic.com/legal/aup)[Commercial terms](https://www.anthropic.com/legal/commercial-terms)[Consumer terms](https://www.anthropic.com/legal/consumer-terms)

Assistant

Responses are generated using AI and may contain mistakes.

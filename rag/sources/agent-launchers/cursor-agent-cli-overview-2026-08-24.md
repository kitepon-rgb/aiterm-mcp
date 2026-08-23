---
title: "Cursor Agent CLI overview"
source_url: "https://cursor.com/docs/cli/overview"
source_type: official_docs
fetched: 2026-08-24
topic: agent-launchers
tags: ["cursor", "agent-cli", "tui", "model", "session"]
summary: "Cursor Agent CLIの対話TUI、非対話print、モデル選択、session継続、権限・sandboxの公式仕様。"
relevance: "Aitermのcursor-cli harness起動引数と永続session契約の一次根拠。"
chars: 12074
---

[Skip to main content](#main-content)

[Cursor Logo](/docs)[Docs](/docs)[API](/docs/api)[Learn](/learn)[Help](/help)

Search docs...⌘K

Sign in

Download

## Command Palette

Search for a command to run...

## Get Started

[Welcome](/docs)[Quickstart](/docs/get-started/quickstart)

Models & Pricing

[Changelog](https://cursor.com/changelog)

## Agent

[Overview](/docs/agent/overview)[Agents Window](/docs/agent/agents-window)[Agent Review](/docs/agent/agent-review)[Planning](/docs/agent/plan-mode)[Prompting](/docs/agent/prompting)[Debugging](/docs/agent/debug-mode)[Design Mode](/docs/agent/design-mode)

Tools

Security

## Customize

[Overview](/docs/customize-cursor)[Plugins](/docs/plugins)[Rules](/docs/rules)[Skills](/docs/skills)[Subagents](/docs/subagents)[Hooks](/docs/hooks)[MCP](/docs/mcp)

## Cloud Agents

[Overview](/docs/cloud-agent)[Setup](/docs/cloud-agent/setup)[Builds](/docs/cloud-agent/builds)

Capabilities

[Best Practices](/docs/cloud-agent/best-practices)[Automations](/docs/cloud-agent/automations)[Bugbot](/docs/bugbot)[Security Agents](/docs/security-agents)[PR Routing & Approval](/docs/approval-agents)[Mobile](/docs/cloud-agent/mobile)

Security

[Settings](/docs/cloud-agent/settings)[API](/docs/cloud-agent/api/endpoints)

## Origin

[Overview](/docs/origin)

CLI

[Create a repository](/docs/origin/create-repository)[Clone, Push & Pull](/docs/origin/git)[Mirror GitHub](/docs/origin/mirror-github)[Pull requests](/docs/origin/pull-requests)[Browse & Search](/docs/origin/browse)[Settings](/docs/origin/settings)[Codebase settings](/docs/origin/codebase-settings)[Integrations](/docs/origin/integrations)

## Integrations

[Slack](/docs/integrations/slack)[Microsoft Teams](/docs/integrations/microsoft-teams)[Jira](/docs/integrations/jira)[Linear](/docs/integrations/linear)[Notion](/docs/integrations/notion)[GitHub](/docs/integrations/github)[GitLab](/docs/integrations/gitlab)[Azure DevOps](/docs/integrations/azure-devops)[Bitbucket](/docs/integrations/bitbucket)[JetBrains](/docs/integrations/jetbrains)[Xcode](/docs/integrations/xcode)[Deeplinks](/docs/reference/deeplinks)

## SDK

[TypeScript](/docs/sdk/typescript)[Python](/docs/sdk/python)[Bridge](/docs/sdk/bridge)[Changelog](/docs/sdk/changelog)

## CLI

[Overview](/docs/cli/overview)[Installation](/docs/cli/installation)[Capabilities](/docs/cli/using)[Changelog](/docs/cli/changelog)[Shell Mode](/docs/cli/shell-mode)[ACP](/docs/cli/acp)[Headless / CI](/docs/cli/headless)

Reference

## Teams & Enterprise

Teams

Enterprise

CLI

# Cursor CLI

Cursor CLI lets you interact with AI agents directly from your terminal to write, review, and modify code. Whether you prefer an interactive terminal interface or print automation for scripts and CI pipelines, the CLI provides powerful coding assistance right where you work.

## [Getting started](#getting-started)

```
# Install (macOS, Linux, WSL)curl https://cursor.com/install -fsS | bash# Install (Windows PowerShell)irm 'https://cursor.com/install?win32=true' | iex# Run interactive sessionagent
```

[](https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/uploads/plan-mode.mp4)

## [Interactive mode](#interactive-mode)

Start a conversational session with the agent to describe your goals, review proposed changes, and approve commands:

```
# Start interactive sessionagent# Start with initial promptagent "refactor the auth module to use JWT tokens"
```

## [Modes](#modes)

The CLI supports the same modes as the editor. Switch between modes using slash commands, keyboard shortcuts, or the `--mode` flag.

| Mode | Description | Shortcut |
| --- | --- | --- |
| **Agent** | Full access to all tools for complex coding tasks | Default (no `--mode` value needed) |
| **Plan** | Design your approach before coding with clarifying questions | `Shift+Tab`, `/plan`, `--plan`, `--mode=plan` |
| **Ask** | Read-only exploration without making changes | `/ask`, `--mode=ask` |

## [Non-interactive mode](#non-interactive-mode)

Use print mode for non-interactive scenarios like scripts, CI pipelines, or automation:

```
# Run with specific prompt and modelagent -p "find and fix performance issues" --model "gpt-5"# Use with git changes included for reviewagent -p "review these changes for security issues" --output-format text
```

## [Cloud Agent handoff](#cloud-agent-handoff)

Push your conversation to a [Cloud Agent](/docs/cloud-agent) to continue running while you're away. Prepend `&` to any message:

```
# Send a task to Cloud Agent mid-conversation& refactor the auth module and add comprehensive tests
```

Pick up your Cloud Agent tasks on web or mobile at [cursor.com/agents](https://cursor.com/agents).

## [Sessions](#sessions)

Resume previous conversations to maintain context across multiple interactions:

```
# Open previous chats and resume oneagent ls# Resume latest conversationagent resume# Continue the previous sessionagent --continue# Resume specific conversationagent --resume="chat-id-here"
```

## [Sandbox controls](#sandbox-controls)

Configure command execution settings with `/sandbox` or the `--sandbox <mode>` flag (`enabled` or `disabled`). Toggle sandbox mode on or off and control network access through an interactive menu. Settings persist across sessions.

[](https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/uploads/sandox.mp4)

## [Sudo password prompting](#sudo-password-prompting)

Run commands requiring elevated privileges without leaving the CLI. When a command needs `sudo`, Cursor displays a secure, masked password prompt. Your password flows directly to `sudo` via a secure IPC channel; the AI model never sees it.

English

* English
* 简体中文
* Русский
* 日本語
* Português
* Español

* [Getting started](#getting-started)
* [Interactive mode](#interactive-mode)
* [Modes](#modes)
* [Non-interactive mode](#non-interactive-mode)
* [Cloud Agent handoff](#cloud-agent-handoff)
* [Sessions](#sessions)
* [Sandbox controls](#sandbox-controls)
* [Sudo password prompting](#sudo-password-prompting)

Copy page

[Skip to main content](#main-content)

[Cursor Logo](/docs)[Docs](/docs)[API](/docs/api)[Learn](/learn)[Help](/help)

Search docs...⌘K

Sign in

Download

## Command Palette

Search for a command to run...

## Get Started

[Welcome](/docs)[Quickstart](/docs/get-started/quickstart)

Models & Pricing

[Changelog](https://cursor.com/changelog)

## Agent

[Overview](/docs/agent/overview)[Agents Window](/docs/agent/agents-window)[Agent Review](/docs/agent/agent-review)[Planning](/docs/agent/plan-mode)[Prompting](/docs/agent/prompting)[Debugging](/docs/agent/debug-mode)[Design Mode](/docs/agent/design-mode)

Tools

Security

## Customize

[Overview](/docs/customize-cursor)[Plugins](/docs/plugins)[Rules](/docs/rules)[Skills](/docs/skills)[Subagents](/docs/subagents)[Hooks](/docs/hooks)[MCP](/docs/mcp)

## Cloud Agents

[Overview](/docs/cloud-agent)[Setup](/docs/cloud-agent/setup)[Builds](/docs/cloud-agent/builds)

Capabilities

[Best Practices](/docs/cloud-agent/best-practices)[Automations](/docs/cloud-agent/automations)[Bugbot](/docs/bugbot)[Security Agents](/docs/security-agents)[PR Routing & Approval](/docs/approval-agents)[Mobile](/docs/cloud-agent/mobile)

Security

[Settings](/docs/cloud-agent/settings)[API](/docs/cloud-agent/api/endpoints)

## Origin

[Overview](/docs/origin)

CLI

[Create a repository](/docs/origin/create-repository)[Clone, Push & Pull](/docs/origin/git)[Mirror GitHub](/docs/origin/mirror-github)[Pull requests](/docs/origin/pull-requests)[Browse & Search](/docs/origin/browse)[Settings](/docs/origin/settings)[Codebase settings](/docs/origin/codebase-settings)[Integrations](/docs/origin/integrations)

## Integrations

[Slack](/docs/integrations/slack)[Microsoft Teams](/docs/integrations/microsoft-teams)[Jira](/docs/integrations/jira)[Linear](/docs/integrations/linear)[Notion](/docs/integrations/notion)[GitHub](/docs/integrations/github)[GitLab](/docs/integrations/gitlab)[Azure DevOps](/docs/integrations/azure-devops)[Bitbucket](/docs/integrations/bitbucket)[JetBrains](/docs/integrations/jetbrains)[Xcode](/docs/integrations/xcode)[Deeplinks](/docs/reference/deeplinks)

## SDK

[TypeScript](/docs/sdk/typescript)[Python](/docs/sdk/python)[Bridge](/docs/sdk/bridge)[Changelog](/docs/sdk/changelog)

## CLI

[Overview](/docs/cli/overview)[Installation](/docs/cli/installation)[Capabilities](/docs/cli/using)[Changelog](/docs/cli/changelog)[Shell Mode](/docs/cli/shell-mode)[ACP](/docs/cli/acp)[Headless / CI](/docs/cli/headless)

Reference

## Teams & Enterprise

Teams

Enterprise

CLI

# Cursor CLI

Cursor CLI lets you interact with AI agents directly from your terminal to write, review, and modify code. Whether you prefer an interactive terminal interface or print automation for scripts and CI pipelines, the CLI provides powerful coding assistance right where you work.

## [Getting started](#getting-started)

```
# Install (macOS, Linux, WSL)curl https://cursor.com/install -fsS | bash# Install (Windows PowerShell)irm 'https://cursor.com/install?win32=true' | iex# Run interactive sessionagent
```

[](https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/uploads/plan-mode.mp4)

## [Interactive mode](#interactive-mode)

Start a conversational session with the agent to describe your goals, review proposed changes, and approve commands:

```
# Start interactive sessionagent# Start with initial promptagent "refactor the auth module to use JWT tokens"
```

## [Modes](#modes)

The CLI supports the same modes as the editor. Switch between modes using slash commands, keyboard shortcuts, or the `--mode` flag.

| Mode | Description | Shortcut |
| --- | --- | --- |
| **Agent** | Full access to all tools for complex coding tasks | Default (no `--mode` value needed) |
| **Plan** | Design your approach before coding with clarifying questions | `Shift+Tab`, `/plan`, `--plan`, `--mode=plan` |
| **Ask** | Read-only exploration without making changes | `/ask`, `--mode=ask` |

## [Non-interactive mode](#non-interactive-mode)

Use print mode for non-interactive scenarios like scripts, CI pipelines, or automation:

```
# Run with specific prompt and modelagent -p "find and fix performance issues" --model "gpt-5"# Use with git changes included for reviewagent -p "review these changes for security issues" --output-format text
```

## [Cloud Agent handoff](#cloud-agent-handoff)

Push your conversation to a [Cloud Agent](/docs/cloud-agent) to continue running while you're away. Prepend `&` to any message:

```
# Send a task to Cloud Agent mid-conversation& refactor the auth module and add comprehensive tests
```

Pick up your Cloud Agent tasks on web or mobile at [cursor.com/agents](https://cursor.com/agents).

## [Sessions](#sessions)

Resume previous conversations to maintain context across multiple interactions:

```
# Open previous chats and resume oneagent ls# Resume latest conversationagent resume# Continue the previous sessionagent --continue# Resume specific conversationagent --resume="chat-id-here"
```

## [Sandbox controls](#sandbox-controls)

Configure command execution settings with `/sandbox` or the `--sandbox <mode>` flag (`enabled` or `disabled`). Toggle sandbox mode on or off and control network access through an interactive menu. Settings persist across sessions.

[](https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/uploads/sandox.mp4)

## [Sudo password prompting](#sudo-password-prompting)

Run commands requiring elevated privileges without leaving the CLI. When a command needs `sudo`, Cursor displays a secure, masked password prompt. Your password flows directly to `sudo` via a secure IPC channel; the AI model never sees it.

English

* English
* 简体中文
* Русский
* 日本語
* Português
* Español

* [Getting started](#getting-started)
* [Interactive mode](#interactive-mode)
* [Modes](#modes)
* [Non-interactive mode](#non-interactive-mode)
* [Cloud Agent handoff](#cloud-agent-handoff)
* [Sessions](#sessions)
* [Sandbox controls](#sandbox-controls)
* [Sudo password prompting](#sudo-password-prompting)

Copy page

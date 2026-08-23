---
title: "Cursor Agent CLI installation"
source_url: "https://cursor.com/docs/cli/installation"
source_type: official_docs
fetched: 2026-08-24
topic: agent-launchers
tags: ["cursor", "agent-cli", "installer", "update"]
summary: "Cursor Agent CLIの公式installer、cursor-agent/agentコマンド、update経路の公式仕様。"
relevance: "工場とAitermが独自tarballでなく標準installer・self-updateを使う根拠。"
chars: 7794
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

# Installation

## [Installation](#installation)

### [macOS, Linux and Windows (WSL)](#macos-linux-and-windows-wsl)

Install Cursor CLI with a single command:

```
curl https://cursor.com/install -fsS | bash
```

### [Windows (native)](#windows-native)

Install Cursor CLI on Windows using PowerShell:

```
irm 'https://cursor.com/install?win32=true' | iex
```

### [Verification](#verification)

After installation, verify that Cursor CLI is working correctly:

```
agent --version
```

## [Post-installation setup](#post-installation-setup)

1. **Add ~/.local/bin to your PATH:**

   For bash:

   ```
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrcsource ~/.bashrc
   ```

   For zsh:

   ```
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrcsource ~/.zshrc
   ```
2. **Start using Cursor Agent:**

   ```
   agent
   ```

## [Updates](#updates)

Cursor CLI will try to auto-update by default to ensure you always have the latest version.

To manually update Cursor CLI to the latest version:

```
agent update
```

English

* English
* 简体中文
* Русский
* 日本語
* Português
* Español

* [Installation](#installation)
* [macOS, Linux and Windows (WSL)](#macos-linux-and-windows-wsl)
* [Windows (native)](#windows-native)
* [Verification](#verification)
* [Post-installation setup](#post-installation-setup)
* [Updates](#updates)

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

# Installation

## [Installation](#installation)

### [macOS, Linux and Windows (WSL)](#macos-linux-and-windows-wsl)

Install Cursor CLI with a single command:

```
curl https://cursor.com/install -fsS | bash
```

### [Windows (native)](#windows-native)

Install Cursor CLI on Windows using PowerShell:

```
irm 'https://cursor.com/install?win32=true' | iex
```

### [Verification](#verification)

After installation, verify that Cursor CLI is working correctly:

```
agent --version
```

## [Post-installation setup](#post-installation-setup)

1. **Add ~/.local/bin to your PATH:**

   For bash:

   ```
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrcsource ~/.bashrc
   ```

   For zsh:

   ```
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrcsource ~/.zshrc
   ```
2. **Start using Cursor Agent:**

   ```
   agent
   ```

## [Updates](#updates)

Cursor CLI will try to auto-update by default to ensure you always have the latest version.

To manually update Cursor CLI to the latest version:

```
agent update
```

English

* English
* 简体中文
* Русский
* 日本語
* Português
* Español

* [Installation](#installation)
* [macOS, Linux and Windows (WSL)](#macos-linux-and-windows-wsl)
* [Windows (native)](#windows-native)
* [Verification](#verification)
* [Post-installation setup](#post-installation-setup)
* [Updates](#updates)

Copy page

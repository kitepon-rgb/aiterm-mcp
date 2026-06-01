---
title: "Terminal Shell Integration (VS Code)"
source_url: "https://code.visualstudio.com/docs/terminal/shell-integration"
source_type: docs
fetched: 2026-06-01
topic: completion-detection
tags: ["osc-633", "nonce", "command-detection", "exit-code", "command-line"]
summary: "VS Code独自のOSC 633;A/B/C/D/E/P。E(commandline+nonce)で実行コマンド確定、Pでcwd等プロパティ。nonceでspoof防止。"
relevance: "完了+exit code(D)に加え、実行コマンド文字列を確定(E)する手法。markerにnonceを付けて偽装混入を弾く設計の直接的先行例。"
chars: 47943
---

[Visual Studio Code](/)

* Features
  + [Agents](/features/agents)
* Docs
  + [Documentation](/docs)
  + [API](/api)
* [Updates](/updates)
* [Blog](/blogs)
* [Extensions](https://marketplace.visualstudio.com/VSCode)
* [MCP](/mcp)
* [FAQ](/docs/supporting/faq)
* [Learn](/learn)
* [Events](https://aka.ms/vscode/live)

* [Download](/download)

![](/assets/icons/search-dark.svg)
![](/assets/icons/search.svg)

Search

![Switch to the dark theme](/assets/icons/theme-light.svg)
![Switch to the light theme](/assets/icons/theme-dark.svg)
[Download](/Download)

[Use the Agents window to build in an agent-first way.](https://code.visualstudio.com/docs/copilot/agents/agents-window?source=vsc-website-banner)

Dismiss this update

#### Documentation

* [Overview](/docs)
* [Setup](#setup-articles)
  + [Overview](/docs/setup/setup-overview)
  + [Linux](/docs/setup/linux)
  + [macOS](/docs/setup/mac)
  + [Windows](/docs/setup/windows)
  + [VS Code for the Web](/docs/setup/vscode-web)
  + [Raspberry Pi](/docs/setup/raspberry-pi)
  + [Network](/docs/setup/network)
  + [Additional Components](/docs/setup/additional-components)
  + [Uninstall](/docs/setup/uninstall)
* [Get Started](#getstarted-articles)
  + [VS Code Tutorial](/docs/getstarted/getting-started)
  + [Copilot Quickstart](/docs/getstarted/copilot-quickstart)
  + [User Interface](/docs/getstarted/userinterface)
  + [Personalize VS Code](/docs/getstarted/personalize-vscode)
  + [Install Extensions](/docs/getstarted/extensions)
  + [Tips and Tricks](/docs/getstarted/tips-and-tricks)
  + [Intro Videos](/docs/getstarted/introvideos)
* [GitHub Copilot](#copilot-articles)
  + [Overview](/docs/copilot/overview)
  + [Setup](/docs/copilot/setup)
  + [Quickstart](/docs/copilot/getting-started)
  + [Concepts](#copilot-concepts-articles)
    - [Overview](/docs/copilot/concepts/overview)
    - [Language Models](/docs/copilot/concepts/language-models)
    - [Context](/docs/copilot/concepts/context)
    - [Tools](/docs/copilot/concepts/tools)
    - [Agents](/docs/copilot/concepts/agents)
    - [Customization](/docs/copilot/concepts/customization)
    - [Trust & Safety](/docs/copilot/concepts/trust-and-safety)
  + [Agents](#copilot-agents-articles)
    - [Overview](/docs/copilot/agents/overview)
    - [Agents Tutorial](/docs/copilot/agents/agents-tutorial)
    - [Agents Window](/docs/copilot/agents/agents-window)
    - [Planning](/docs/copilot/agents/planning)
    - [Memory](/docs/copilot/agents/memory)
    - [Tools](/docs/copilot/agents/agent-tools)
    - [Subagents](/docs/copilot/agents/subagents)
    - [Local Agents](/docs/copilot/agents/local-agents)
    - [Copilot CLI](/docs/copilot/agents/copilot-cli)
    - [Cloud Agents](/docs/copilot/agents/cloud-agents)
    - [Third-Party Agents](/docs/copilot/agents/third-party-agents)
  + [Chat](#copilot-chat-articles)
    - [Overview](/docs/copilot/chat/copilot-chat)
    - [Chat Sessions](/docs/copilot/chat/chat-sessions)
    - [Session Insights](/docs/copilot/chat/session-insights)
    - [Add Context](/docs/copilot/chat/copilot-chat-context)
    - [Inline Chat](/docs/copilot/chat/inline-chat)
    - [Review Edits](/docs/copilot/chat/review-code-edits)
    - [Checkpoints](/docs/copilot/chat/chat-checkpoints)
    - [Artifacts Panel](/docs/copilot/chat/chat-artifacts)
    - [Debug Chat Interactions](/docs/copilot/chat/chat-debug-view)
    - [Prompt Examples](/docs/copilot/chat/prompt-examples)
  + [Customization](#copilot-customization-articles)
    - [Overview](/docs/copilot/customization/overview)
    - [Instructions](/docs/copilot/customization/custom-instructions)
    - [Prompt Files](/docs/copilot/customization/prompt-files)
    - [Custom Agents](/docs/copilot/customization/custom-agents)
    - [Agent Skills](/docs/copilot/customization/agent-skills)
    - [Language Models](/docs/copilot/customization/language-models)
    - [MCP](/docs/copilot/customization/mcp-servers)
    - [Hooks](/docs/copilot/customization/hooks)
    - [Plugins](/docs/copilot/customization/agent-plugins)
  + [Guides & Tutorials](#copilot-guides-articles)
    - [Context Engineering](/docs/copilot/guides/context-engineering-guide)
    - [Customize AI](/docs/copilot/guides/customize-copilot-guide)
    - [Test-Driven Development](/docs/copilot/guides/test-driven-development-guide)
    - [Edit Notebooks with AI](/docs/copilot/guides/notebooks-with-ai)
    - [Test with AI](/docs/copilot/guides/test-with-copilot)
    - [Test Web Apps with Browser Tools](/docs/copilot/guides/browser-agent-testing-guide)
    - [Debug with AI](/docs/copilot/guides/debug-with-copilot)
    - [MCP Dev Guide](/docs/copilot/guides/mcp-developer-guide)
    - [OpenTelemetry Monitoring](/docs/copilot/guides/monitoring-agents)
  + [Inline Suggestions](/docs/copilot/ai-powered-suggestions)
  + [Smart Actions](/docs/copilot/copilot-smart-actions)
  + [Best Practices](/docs/copilot/best-practices)
  + [Security](/docs/copilot/security)
  + [Troubleshooting](/docs/copilot/troubleshooting)
  + [FAQ](/docs/copilot/faq)
  + [Reference](#copilot-reference-articles)
    - [Cheat Sheet](/docs/copilot/reference/copilot-vscode-features)
    - [Settings Reference](/docs/copilot/reference/copilot-settings)
    - [MCP Configuration](/docs/copilot/reference/mcp-configuration)
    - [Workspace Context](/docs/copilot/reference/workspace-context)
* [Configure](#configure-articles)
  + [Display Language](/docs/configure/locales)
  + [Layout](/docs/configure/custom-layout)
  + [Keyboard Shortcuts](/docs/configure/keybindings)
  + [Settings](/docs/configure/settings)
  + [Settings Sync](/docs/configure/settings-sync)
  + [Extensions](#configure-extensions-articles)
    - [Extension Marketplace](/docs/configure/extensions/extension-marketplace)
    - [Extension Runtime Security](/docs/configure/extensions/extension-runtime-security)
  + [Themes](/docs/configure/themes)
  + [Profiles](/docs/configure/profiles)
  + [Accessibility](#configure-accessibility-articles)
    - [Overview](/docs/configure/accessibility/accessibility)
    - [Voice Interactions](/docs/configure/accessibility/voice)
  + [Command Line Interface](/docs/configure/command-line)
  + [Telemetry](/docs/configure/telemetry)
* [Edit Code](#editing-articles)
  + [Basic Editing](/docs/editing/codebasics)
  + [IntelliSense](/docs/editing/intellisense)
  + [Code Navigation](/docs/editing/editingevolved)
  + [Refactoring](/docs/editing/refactoring)
  + [Snippets](/docs/editing/userdefinedsnippets)
  + [Workspaces](#editing-workspaces-articles)
    - [Overview](/docs/editing/workspaces/workspaces)
    - [Multi-Root Workspaces](/docs/editing/workspaces/multi-root-workspaces)
    - [Workspace Trust](/docs/editing/workspaces/workspace-trust)
* [Build, Debug, Test](#debugtest-articles)
  + [Tasks](/docs/debugtest/tasks)
  + [Debugging](/docs/debugtest/debugging)
  + [Debug Configuration](/docs/debugtest/debugging-configuration)
  + [Testing](/docs/debugtest/testing)
  + [Port Forwarding](/docs/debugtest/port-forwarding)
  + [Integrated Browser](/docs/debugtest/integrated-browser)
* [Source Control](#sourcecontrol-articles)
  + [Overview](/docs/sourcecontrol/overview)
  + [Quickstart](/docs/sourcecontrol/quickstart)
  + [Staging & Committing](/docs/sourcecontrol/staging-commits)
  + [Branches & Worktrees](/docs/sourcecontrol/branches-worktrees)
  + [Repositories & Remotes](/docs/sourcecontrol/repos-remotes)
  + [Merge Conflicts](/docs/sourcecontrol/merge-conflicts)
  + [Collaborate on GitHub](/docs/sourcecontrol/github)
  + [Troubleshooting](/docs/sourcecontrol/troubleshooting)
  + [FAQ](/docs/sourcecontrol/faq)
* [Terminal](#terminal-articles)
  + [Getting Started Tutorial](/docs/terminal/getting-started)
  + [Terminal Basics](/docs/terminal/basics)
  + [Terminal Profiles](/docs/terminal/profiles)
  + [Shell Integration](/docs/terminal/shell-integration)
  + [Appearance](/docs/terminal/appearance)
  + [Advanced](/docs/terminal/advanced)
* [Enterprise](#enterprise-articles)
  + [Overview](/docs/enterprise/overview)
  + [Enterprise Policies](/docs/enterprise/policies)
  + [AI Settings](/docs/enterprise/ai-settings)
  + [Extensions](/docs/enterprise/extensions)
  + [Telemetry](/docs/enterprise/telemetry)
  + [Updates](/docs/enterprise/updates)
* [Languages](#languages-articles)
  + [Overview](/docs/languages/overview)
  + [JavaScript](/docs/languages/javascript)
  + [JSON](/docs/languages/json)
  + [HTML](/docs/languages/html)
  + [Emmet](/docs/languages/emmet)
  + [CSS, SCSS and Less](/docs/languages/css)
  + [TypeScript](/docs/languages/typescript)
  + [Markdown](/docs/languages/markdown)
  + [PowerShell](/docs/languages/powershell)
  + [C++](/docs/languages/cpp)
  + [Java](/docs/languages/java)
  + [PHP](/docs/languages/php)
  + [Python](/docs/languages/python)
  + [Julia](/docs/languages/julia)
  + [R](/docs/languages/r)
  + [Ruby](/docs/languages/ruby)
  + [Rust](/docs/languages/rust)
  + [Go](/docs/languages/go)
  + [T-SQL](/docs/languages/tsql)
  + [C#](/docs/languages/csharp)
  + [.NET](/docs/languages/dotnet)
  + [Swift](/docs/languages/swift)
* [Node.js / JavaScript](#nodejs-articles)
  + [Working with JavaScript](/docs/nodejs/working-with-javascript)
  + [Node.js Tutorial](/docs/nodejs/nodejs-tutorial)
  + [Node.js Debugging](/docs/nodejs/nodejs-debugging)
  + [Deploy Node.js Apps](/docs/nodejs/nodejs-deployment)
  + [Browser Debugging](/docs/nodejs/browser-debugging)
  + [Angular Tutorial](/docs/nodejs/angular-tutorial)
  + [React Tutorial](/docs/nodejs/reactjs-tutorial)
  + [Vue Tutorial](/docs/nodejs/vuejs-tutorial)
  + [Debugging Recipes](/docs/nodejs/debugging-recipes)
  + [Performance Profiling](/docs/nodejs/profiling)
  + [Extensions](/docs/nodejs/extensions)
* [TypeScript](#typescript-articles)
  + [Tutorial](/docs/typescript/typescript-tutorial)
  + [Transpiling](/docs/typescript/typescript-transpiling)
  + [Editing](/docs/typescript/typescript-editing)
  + [Refactoring](/docs/typescript/typescript-refactoring)
  + [Debugging](/docs/typescript/typescript-debugging)
* [Python](#python-articles)
  + [Quick Start](/docs/python/python-quick-start)
  + [Tutorial](/docs/python/python-tutorial)
  + [Run Python Code](/docs/python/run)
  + [Editing](/docs/python/editing)
  + [Linting](/docs/python/linting)
  + [Formatting](/docs/python/formatting)
  + [Debugging](/docs/python/debugging)
  + [Environments](/docs/python/environments)
  + [Testing](/docs/python/testing)
  + [Python Interactive](/docs/python/jupyter-support-py)
  + [Django Tutorial](/docs/python/tutorial-django)
  + [FastAPI Tutorial](/docs/python/tutorial-fastapi)
  + [Flask Tutorial](/docs/python/tutorial-flask)
  + [Create Containers](/docs/python/tutorial-create-containers)
  + [Deploy Python Apps](/docs/python/python-on-azure)
  + [Python in the Web](/docs/python/python-web)
  + [Settings Reference](/docs/python/settings-reference)
* [Java](#java-articles)
  + [Getting Started](/docs/java/java-tutorial)
  + [Navigate and Edit](/docs/java/java-editing)
  + [Refactoring](/docs/java/java-refactoring)
  + [Formatting and Linting](/docs/java/java-linting)
  + [Project Management](/docs/java/java-project)
  + [Build Tools](/docs/java/java-build)
  + [Run and Debug](/docs/java/java-debugging)
  + [Testing](/docs/java/java-testing)
  + [Spring Boot](/docs/java/java-spring-boot)
  + [Modernizing Java Apps](/docs/java/java-app-mod)
  + [Application Servers](/docs/java/java-tomcat-jetty)
  + [Deploy Java Apps](/docs/java/java-on-azure)
  + [GUI Applications](/docs/java/java-gui)
  + [Extensions](/docs/java/extensions)
  + [FAQ](/docs/java/java-faq)
* [C++](#cpp-articles)
  + [Intro Videos](/docs/cpp/introvideos-cpp)
  + [GCC on Linux](/docs/cpp/config-linux)
  + [GCC on Windows](/docs/cpp/config-mingw)
  + [GCC on Windows Subsystem for Linux](/docs/cpp/config-wsl)
  + [Clang on macOS](/docs/cpp/config-clang-mac)
  + [Microsoft C++ on Windows](/docs/cpp/config-msvc)
  + [Build with CMake](/docs/cpp/build-with-cmake)
  + [CMake Tools on Linux](/docs/cpp/cmake-linux)
  + [CMake Quick Start](/docs/cpp/cmake-quickstart)
  + [C++ Dev Tools for Copilot](/docs/cpp/cpp-devtools)
  + [Editing and Navigating](/docs/cpp/cpp-ide)
  + [Debugging](/docs/cpp/cpp-debug)
  + [Configure Debugging](/docs/cpp/launch-json-reference)
  + [Refactoring](/docs/cpp/cpp-refactoring)
  + [Settings Reference](/docs/cpp/customize-cpp-settings)
  + [Configure IntelliSense](/docs/cpp/configure-intellisense)
  + [Configure IntelliSense for Cross-Compiling](/docs/cpp/configure-intellisense-crosscompilation)
  + [FAQ](/docs/cpp/faq-cpp)
* [C#](#csharp-articles)
  + [Intro Videos](/docs/csharp/introvideos-csharp)
  + [Get Started](/docs/csharp/get-started)
  + [Navigate and Edit](/docs/csharp/navigate-edit)
  + [IntelliCode](/docs/csharp/intellicode)
  + [Refactoring](/docs/csharp/refactoring)
  + [Formatting and Linting](/docs/csharp/formatting-linting)
  + [Project Management](/docs/csharp/project-management)
  + [Build Tools](/docs/csharp/build-tools)
  + [Package Management](/docs/csharp/package-management)
  + [Run and Debug](/docs/csharp/debugging)
  + [Testing](/docs/csharp/testing)
  + [FAQ](/docs/csharp/cs-dev-kit-faq)
* [Container Tools](#containers-articles)
  + [Overview](/docs/containers/overview)
  + [Node.js](/docs/containers/quickstart-node)
  + [Python](/docs/containers/quickstart-python)
  + [ASP.NET Core](/docs/containers/quickstart-aspnet-core)
  + [Debug](/docs/containers/debug-common)
  + [Docker Compose](/docs/containers/docker-compose)
  + [Registries](/docs/containers/quickstart-container-registries)
  + [Deploy to Azure](/docs/containers/app-service)
  + [Choose a Dev Environment](/docs/containers/choosing-dev-environment)
  + [Customize](/docs/containers/reference)
  + [Develop with Kubernetes](/docs/containers/bridge-to-kubernetes)
  + [Tips and Tricks](/docs/containers/troubleshooting)
* [Data Science](#datascience-articles)
  + [Overview](/docs/datascience/overview)
  + [Jupyter Notebooks](/docs/datascience/jupyter-notebooks)
  + [Data Science Tutorial](/docs/datascience/data-science-tutorial)
  + [Python Interactive](/docs/datascience/python-interactive)
  + [Data Wrangler Quick Start](/docs/datascience/data-wrangler-quick-start)
  + [Data Wrangler](/docs/datascience/data-wrangler)
  + [PyTorch Support](/docs/datascience/pytorch-support)
  + [Azure Machine Learning](/docs/datascience/azure-machine-learning)
  + [Manage Jupyter Kernels](/docs/datascience/jupyter-kernel-management)
  + [Jupyter Notebooks on the Web](/docs/datascience/notebooks-web)
  + [Data Science in Microsoft Fabric](/docs/datascience/microsoft-fabric-quickstart)
* [Intelligent Apps](#intelligentapps-articles)
  + [Foundry Toolkit Overview](/docs/intelligentapps/overview)
  + [Foundry Toolkit Copilot Tools](/docs/intelligentapps/copilot-tools)
  + [Create Agents](/docs/intelligentapps/create-agents)
  + [Models](/docs/intelligentapps/models)
  + [Playground](/docs/intelligentapps/playground)
  + [Agent Builder](/docs/intelligentapps/agentbuilder)
  + [Agent Inspector](/docs/intelligentapps/agent-inspector)
  + [Evaluation](/docs/intelligentapps/evaluation)
  + [Tool Catalog](/docs/intelligentapps/tool-catalog)
  + [Fine-Tuning (Automated Setup)](/docs/intelligentapps/finetune)
  + [Fine-Tuning (Project Template)](/docs/intelligentapps/finetune-legacy)
  + [Model Conversion](/docs/intelligentapps/modelconversion)
  + [Tracing](/docs/intelligentapps/tracing)
  + [Profiling (Windows ML)](/docs/intelligentapps/profiling)
  + [FAQ](/docs/intelligentapps/faq)
  + [Reference](#intelligentapps-reference-articles)
    - [File Structure](/docs/intelligentapps/reference/FileStructure)
    - [Manual Model Conversion](/docs/intelligentapps/reference/ManualModelConversion)
    - [Manual Model Conversion on GPU](/docs/intelligentapps/reference/ManualConversionOnGPU)
    - [Setup Environment Without Foundry Toolkit](/docs/intelligentapps/reference/SetupWithoutAITK)
    - [Template Project](/docs/intelligentapps/reference/TemplateProject)
    - [Migrating from Visualizer to Agent Inspector](/docs/intelligentapps/reference/migrate-from-visualizer)
* [Azure](#azure-articles)
  + [Overview](/docs/azure/overview)
  + [Getting Started](/docs/azure/gettingstarted)
  + [Resources View](/docs/azure/resourcesextension)
  + [Deployment](/docs/azure/deployment)
  + [VS Code for the Web - Azure](/docs/azure/vscodeforweb)
  + [Containers](/docs/azure/containers)
  + [Azure Kubernetes Service](/docs/azure/aksextensions)
  + [Kubernetes](/docs/azure/kubernetes)
  + [MongoDB](/docs/azure/mongodb)
  + [Remote Debugging for Node.js](/docs/azure/remote-debugging)
* [Remote](#remote-articles)
  + [Overview](/docs/remote/remote-overview)
  + [SSH](/docs/remote/ssh)
  + [Dev Containers](/docs/remote/dev-containers)
  + [Windows Subsystem for Linux](/docs/remote/wsl)
  + [GitHub Codespaces](/docs/remote/codespaces)
  + [VS Code Server](/docs/remote/vscode-server)
  + [Tunnels](/docs/remote/tunnels)
  + [SSH Tutorial](/docs/remote/ssh-tutorial)
  + [WSL Tutorial](/docs/remote/wsl-tutorial)
  + [Tips and Tricks](/docs/remote/troubleshooting)
  + [FAQ](/docs/remote/faq)
* [Dev Containers](#devcontainers-articles)
  + [Overview](/docs/devcontainers/containers)
  + [Tutorial](/docs/devcontainers/tutorial)
  + [Attach to Container](/docs/devcontainers/attach-container)
  + [Create Dev Container](/docs/devcontainers/create-dev-container)
  + [Advanced Containers](/docs/devcontainers/containers-advanced)
  + [devcontainer.json](/docs/devcontainers/devcontainerjson-reference)
  + [Dev Container CLI](/docs/devcontainers/devcontainer-cli)
  + [Tips and Tricks](/docs/devcontainers/tips-and-tricks)
  + [FAQ](/docs/devcontainers/faq)
* [Reference](#reference-articles)
  + [Default Keyboard Shortcuts](/docs/reference/default-keybindings)
  + [Default Settings](/docs/reference/default-settings)
  + [Substitution Variables](/docs/reference/variables-reference)
  + [Tasks Schema](/docs/reference/tasks-appendix)

Topics

Overview

Overview
Linux
macOS
Windows
VS Code for the Web
Raspberry Pi
Network
Additional Components
Uninstall

VS Code Tutorial
Copilot Quickstart
User Interface
Personalize VS Code
Install Extensions
Tips and Tricks
Intro Videos

Overview
Setup
Quickstart

Overview
Language Models
Context
Tools
Agents
Customization
Trust & Safety

Overview
Agents Tutorial
Agents Window
Planning
Memory
Tools
Subagents
Local Agents
Copilot CLI
Cloud Agents
Third-Party Agents

Overview
Chat Sessions
Session Insights
Add Context
Inline Chat
Review Edits
Checkpoints
Artifacts Panel
Debug Chat Interactions
Prompt Examples

Overview
Instructions
Prompt Files
Custom Agents
Agent Skills
Language Models
MCP
Hooks
Plugins

Context Engineering
Customize AI
Test-Driven Development
Edit Notebooks with AI
Test with AI
Test Web Apps with Browser Tools
Debug with AI
MCP Dev Guide
OpenTelemetry Monitoring
Inline Suggestions
Smart Actions
Best Practices
Security
Troubleshooting
FAQ

Cheat Sheet
Settings Reference
MCP Configuration
Workspace Context

Display Language
Layout
Keyboard Shortcuts
Settings
Settings Sync

Extension Marketplace
Extension Runtime Security
Themes
Profiles

Overview
Voice Interactions
Command Line Interface
Telemetry

Basic Editing
IntelliSense
Code Navigation
Refactoring
Snippets

Overview
Multi-Root Workspaces
Workspace Trust

Tasks
Debugging
Debug Configuration
Testing
Port Forwarding
Integrated Browser

Overview
Quickstart
Staging & Committing
Branches & Worktrees
Repositories & Remotes
Merge Conflicts
Collaborate on GitHub
Troubleshooting
FAQ

Getting Started Tutorial
Terminal Basics
Terminal Profiles
Shell Integration
Appearance
Advanced

Overview
Enterprise Policies
AI Settings
Extensions
Telemetry
Updates

Overview
JavaScript
JSON
HTML
Emmet
CSS, SCSS and Less
TypeScript
Markdown
PowerShell
C++
Java
PHP
Python
Julia
R
Ruby
Rust
Go
T-SQL
C#
.NET
Swift

Working with JavaScript
Node.js Tutorial
Node.js Debugging
Deploy Node.js Apps
Browser Debugging
Angular Tutorial
React Tutorial
Vue Tutorial
Debugging Recipes
Performance Profiling
Extensions

Tutorial
Transpiling
Editing
Refactoring
Debugging

Quick Start
Tutorial
Run Python Code
Editing
Linting
Formatting
Debugging
Environments
Testing
Python Interactive
Django Tutorial
FastAPI Tutorial
Flask Tutorial
Create Containers
Deploy Python Apps
Python in the Web
Settings Reference

Getting Started
Navigate and Edit
Refactoring
Formatting and Linting
Project Management
Build Tools
Run and Debug
Testing
Spring Boot
Modernizing Java Apps
Application Servers
Deploy Java Apps
GUI Applications
Extensions
FAQ

Intro Videos
GCC on Linux
GCC on Windows
GCC on Windows Subsystem for Linux
Clang on macOS
Microsoft C++ on Windows
Build with CMake
CMake Tools on Linux
CMake Quick Start
C++ Dev Tools for Copilot
Editing and Navigating
Debugging
Configure Debugging
Refactoring
Settings Reference
Configure IntelliSense
Configure IntelliSense for Cross-Compiling
FAQ

Intro Videos
Get Started
Navigate and Edit
IntelliCode
Refactoring
Formatting and Linting
Project Management
Build Tools
Package Management
Run and Debug
Testing
FAQ

Overview
Node.js
Python
ASP.NET Core
Debug
Docker Compose
Registries
Deploy to Azure
Choose a Dev Environment
Customize
Develop with Kubernetes
Tips and Tricks

Overview
Jupyter Notebooks
Data Science Tutorial
Python Interactive
Data Wrangler Quick Start
Data Wrangler
PyTorch Support
Azure Machine Learning
Manage Jupyter Kernels
Jupyter Notebooks on the Web
Data Science in Microsoft Fabric

Foundry Toolkit Overview
Foundry Toolkit Copilot Tools
Create Agents
Models
Playground
Agent Builder
Agent Inspector
Evaluation
Tool Catalog
Fine-Tuning (Automated Setup)
Fine-Tuning (Project Template)
Model Conversion
Tracing
Profiling (Windows ML)
FAQ

File Structure
Manual Model Conversion
Manual Model Conversion on GPU
Setup Environment Without Foundry Toolkit
Template Project
Migrating from Visualizer to Agent Inspector

Overview
Getting Started
Resources View
Deployment
VS Code for the Web - Azure
Containers
Azure Kubernetes Service
Kubernetes
MongoDB
Remote Debugging for Node.js

Overview
SSH
Dev Containers
Windows Subsystem for Linux
GitHub Codespaces
VS Code Server
Tunnels
SSH Tutorial
WSL Tutorial
Tips and Tricks
FAQ

Overview
Tutorial
Attach to Container
Create Dev Container
Advanced Containers
devcontainer.json
Dev Container CLI
Tips and Tricks
FAQ

Default Keyboard Shortcuts
Default Settings
Substitution Variables
Tasks Schema

Copy as Markdown

* Copy as Markdown
* View as Markdown

#### On this page there are 15 sectionsOn this page

* [Installation](#_installation)
* [Shell integration quality](#_shell-integration-quality)
* [IntelliSense](#_intellisense)
* [Command decorations and the overview ruler](#_command-decorations-and-the-overview-ruler)
* [Command navigation](#_command-navigation)
* [Command guide](#_command-guide)
* [Sticky scroll](#_sticky-scroll)
* [Quick fixes](#_quick-fixes)
* [Run recent command](#_run-recent-command)
* [Go to recent directory](#_go-to-recent-directory)
* [Current working directory detection](#_current-working-directory-detection)
* [Extended PowerShell keyboard shortcuts](#_extended-powershell-keyboard-shortcuts)
* [Enhanced accessibility](#_enhanced-accessibility)
* [Supported escape sequences](#_supported-escape-sequences)
* [Common questions](#_common-questions)

# Terminal Shell Integration

Visual Studio Code has the ability to integrate with common shells, allowing the terminal to understand more about what's actually happening inside the shell. This additional information enables some useful features such as [working directory detection](#_current-working-directory-detection) and command detection, [decorations](#_command-decorations-and-the-overview-ruler), and [navigation](#_command-navigation).

Supported shells:

* Linux/macOS: bash, fish, pwsh, zsh
* Windows: Git Bash, pwsh

## Installation

### Automatic script injection

By default, the shell integration script should automatically activate on supported shells launched from VS Code. This is done by injecting arguments and/or environment variables when the shell session launches. This automatic injection can be disabled by setting

terminal.integrated.shellIntegration.enabled

Open in VS Code
Open in VS Code Insiders
 to `false`.

This standard, easy way will not work for some advanced use cases like in sub-shells, through a regular `ssh` session (when not using the [Remote - SSH extension](/docs/remote/ssh)) or for some complex shell setups. The recommended way to enable shell integration for those is [manual installation](#_manual-installation).

> **Note**: Automatic injection may not work on old versions of the shell, for example older versions of fish do not support the `$XDG_DATA_DIRS` environment variable which is how injection works. You may still be able to manually install to get it working.

> **Windows Note**: VS Code shell integration requires the [permission to run PowerShell scripts](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies). If you have exclusive use of your user account on your machine, consider running:
>
> ```
> if ((Get-ExecutionPolicy -Scope LocalMachine) -eq 'Undefined' -and (Get-ExecutionPolicy -Scope CurrentUser) -eq 'Undefined') {
>     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> }
> ```

### Manual installation

To manually install shell integration, the VS Code shell integration script needs to run during your shell's initialization. Where and how to do this depends on the shell and OS you're using. When using manual install it's recommended to set

terminal.integrated.shellIntegration.enabled

Open in VS Code
Open in VS Code Insiders
 to `false`, though not mandatory.

> **Tip:** When using the [Insiders build](https://code.visualstudio.com/insiders), replace `code` with `code-insiders` below.

**bash**

Add the following to your `~/.bashrc` file. Run `code ~/.bashrc` in bash to open the file in VS Code.

```
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

**fish**

Add the following to your `config.fish`. Run `code $__fish_config_dir/config.fish` in fish to open the file in VS Code.

```
string match -q "$TERM_PROGRAM" "vscode"
and . (code --locate-shell-integration-path fish)
```

**pwsh**

Add the following to your [PowerShell profile](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.2). Run `code $Profile` in pwsh to open the file in VS Code.

```
if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }
```

**zsh**

Add the following to your `~/.zshrc` file. Run `code ~/.zshrc` in zsh to open the file in VS Code.

```
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"
```

**Git Bash**

Add the following to your `~/.bashrc` file. Run `code ~/.bashrc` in Git Bash to open the file in VS Code.

```
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

#### Portability versus performance

The above shell integration installation is cross-platform and compatible with any installation type if `code` is in the `$PATH`. However, this recommended approach starts Node.js to fetch the script path, leading to a slight delay in shell startup. To mitigate this delay, inline the script above by resolving the path ahead of time and adding it directly into your init script.

```
# Output the executable's path first:
code --locate-shell-integration-path bash

# Add the result of the above to the source statement:
[[ "$TERM_PROGRAM" == "vscode" ]] && . "/path/to/shell/integration/script.sh"
```

## Shell integration quality

When using shell integration, it has a "quality" associated with it that declares the capabilities of it. These qualities are determined by how the shell integration script behaves.

* **None**: No shell integration is active.
* **Rich**: Shell integration is active and command detection is working in an ideal way.
* **Basic**: Shell integration is active, but command detection might not support all functionality. For example, the command run location is detected, but not its exit status.

To view the shell integration quality, hover the terminal tab. Optionally, select **Show Details** on the hover to view more detailed information.

## IntelliSense

IntelliSense in the terminal enables you to receive suggestions for files, folders, commands, command arguments and options. This feature can be enabled or disabled with the

terminal.integrated.suggest.enabled

Open in VS Code
Open in VS Code Insiders
 setting.

![Screenshot of the terminal showing a user has typed git checkout and receives suggestions for the branch name.](/assets/docs/terminal/shell-integration/terminal-suggest.png)

As you type, a list of suggestions will appear. To manually trigger the suggestions, use the ⌃Space (Windows, Linux Ctrl+Space) keyboard shortcut.

Tip

Ctrl+Space may be the keybinding to trigger your Input Method Editor (IME) at the OS level. If so, you can rebind the `workbench.action.terminal.triggerSuggest` command with a custom [keybinding](https://code.visualstudio.com/docs/configure/keybindings#_keyboard-shortcuts-editor) or change the OS-level shortcut.

By default, Tab inserts the suggestion. Once you navigate the list, Enter inserts the suggestion. You can configure this behavior with the

terminal.integrated.suggest.selectionMode

Open in VS Code
Open in VS Code Insiders
 setting.

There are various settings to configure how terminal IntelliSense behaves:

* terminal.integrated.suggest.quickSuggestions

  Open in VS Code
  Open in VS Code Insiders
  : show automatically depending on the content of the command line, as opposed to manually via Ctrl+Space.
* terminal.integrated.suggest.suggestOnTriggerCharacters

  Open in VS Code
  Open in VS Code Insiders
  : show automatically after a "trigger character" such as `-` or `/`.
* terminal.integrated.suggest.runOnEnter

  Open in VS Code
  Open in VS Code Insiders
  : optionally run the command when Enter is used (not Tab).
* terminal.integrated.suggest.windowsExecutableExtensions

  Open in VS Code
  Open in VS Code Insiders
  : the list of extensions that are treated as executables on Windows.
* terminal.integrated.suggest.providers

  Open in VS Code
  Open in VS Code Insiders
  : provides the ability to disable specific providers, for example extensions may contribute completions you don't want.
* terminal.integrated.suggest.showStatusBar

  Open in VS Code
  Open in VS Code Insiders
  : show the status bar at the bottom of the IntelliSense popup.
* terminal.integrated.suggest.cdPath

  Open in VS Code
  Open in VS Code Insiders
  : enable `$CDPATH` integration.
* terminal.integrated.suggest.inlineSuggestion

  Open in VS Code
  Open in VS Code Insiders
  : integrate with shell "ghost text" and how to present it.
* terminal.integrated.suggest.upArrowNavigatesHistory

  Open in VS Code
  Open in VS Code Insiders
  : send up arrow to the shell instead of browsing completions, this is particularly useful on zsh where you can filter and then press up to do a history search with that prefix.
* terminal.integrated.suggest.selectionMode

  Open in VS Code
  Open in VS Code Insiders
  : how the Intellisense popup is focused which determines what Enter and Tab do.
* terminal.integrated.suggest.insertTrailingSpace

  Open in VS Code
  Open in VS Code Insiders
  : insert a trailing space and re-trigger completions after accepting.

### Global completion caching

To improve performance, VS Code aggressively caches globals for a particular shell. When you make changes to shell startup logic that adds commands, manually refresh the cache with the **Terminal: Clear Suggest Cached Globals** command (`terminal.integrated.suggest.clearCachedGlobals`) if they weren't picked up automatically.

## Command decorations and the overview ruler

One of the things that shell integration enables is the ability to get the exit codes of the commands run within the terminal. Using this information, decorations are added to the left of the line to indicate whether the command succeeded or failed. These decorations also show up in the relatively new overview ruler in the scroll bar, just like in the editor.

![Blue circles appear next to successful commands, red circles with crosses appear next to failed commands. The color of the circles appears in the scroll bar](/assets/docs/terminal/shell-integration/decorations.png)

The decorations can be interacted with to give some contextual actions like re-running the command:

![Clicking a successful command decoration shows a context menu containing items: Copy Output, Copy Output as HTML, Rerun Command and How does this work?](/assets/docs/terminal/shell-integration/decoration-menu.png)

The command and overview ruler decorations can be configured with the

terminal.integrated.shellIntegration.decorationsEnabled

Open in VS Code
Open in VS Code Insiders
 setting.

## Command navigation

The commands detected by shell integration feed into the command navigation feature (Ctrl/Cmd+Up, Ctrl/Cmd+Down) to give it more reliable command positions. This feature allows for quick navigation between commands and selection of their output. To select from the current position to the command, you can also hold down Shift, pressing Shift+Ctrl/Cmd+Up and Shift+Ctrl/Cmd+Down.

## Command guide

The command guide is a bar that shows up beside a command and its output when hovered. This helps more quickly identify the command and also is a way to verify that shell integration is working properly.

![Screenshot of the terminal, highlighting the command guide vertical bar on the left-hand side to indicate the boundary of a command.](/assets/docs/terminal/shell-integration/terminal-command-guide.png)

You can customize the color of the command guide by using Color Themes. To toggle the command guide, configure the

terminal.integrated.shellIntegration.showCommandGuide

Open in VS Code
Open in VS Code Insiders
 setting.

## Sticky scroll

The sticky scroll feature will "stick" the command that is partially showing at the top of the terminal, making it much easier to see what command that output belongs to. Clicking on the sticky scroll component will scroll to the command's location in the terminal buffer.

![Sticky scroll will show the command at the top of the terminal viewport](/assets/docs/terminal/shell-integration/sticky-scroll.png)

This can be enabled with the

terminal.integrated.stickyScroll.enabled

Open in VS Code
Open in VS Code Insiders
 setting.

## Quick fixes

VS Code scans the output of a command and presents a Quick Fix with actions that have a high likelihood of being what the user will want to do next.

![Running 'git push --set-upstream' will present a lightbulb that opens a dropdown with an option to open a new PR on github.com](/assets/docs/terminal/shell-integration/quick-fix.png)

Here are some of the built-in Quick Fixes:

* When it's detected that a port is already being listened to, suggest to kill the process and re-run the previous command.
* When `git push` fails due to an upstream not being set, suggest to push with the upstream set.
* When a `git` subcommand fails with a similar command error, suggest to use the similar command(s).
* When `git push` results in a suggestion to create a GitHub PR, suggest to open the link.
* When a `General` or `cmd-not-found` PowerShell feedback provider triggers, suggest each suggestion.

The Quick Fix feature also supports [accessibility signals](/docs/configure/accessibility/accessibility#_accessibility-signals) for additional feedback when a Quick Fix is available.

## Run recent command

The **Terminal: Run Recent Command** command surfaces history from various sources in a Quick Pick, providing similar functionality to a shell's reverse search (Ctrl+R). The sources are the current session's history, previous session history for this shell type and the common shell history file.

![The "run recent command" command shows a quick pick with previously run commands that can be filtered similar to the go to file command](/assets/docs/terminal/shell-integration/recent-command.png)

Some other functionality of the command:

* By default the search mode is "contiguous search", meaning the search term must exactly match. The button on the right of the search input allows switching to fuzzy search.
* In the current session section, there is a clipboard icon in the right of the Quick Pick that will open the command output in an editor.
* The pin action in the right of the Quick Pick can pin the command to the top of the list.
* Alt can be held to write the text to the terminal without running it.
* The amount of history stored in the previous session section is determined by the

  terminal.integrated.shellIntegration.history

  Open in VS Code
  Open in VS Code Insiders
   setting.

The default keyboard shortcut for this command is Ctrl+Alt+R. However, when accessibility mode is on these are reversed; Ctrl+R runs a recent command and Ctrl+Alt+R sends Ctrl+R to the shell.

The keyboard shortcuts can be flipped when accessibility mode is off with the following keyboard shortcuts:

```
{
    "key": "ctrl+r",
    "command": "workbench.action.terminal.runRecentCommand",
    "when": "terminalFocus"
},
{
  "key": "ctrl+alt+r",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u0012"/*^R*/ },
  "when": "terminalFocus"
}
```

## Go to recent directory

Similar to the run recent command feature, the **Terminal: Go to Recent Directory** command keeps track of directories that have been visited and allows quick filtering and navigating (`cd`) to them. Alt can be held to write the text to the terminal without running it.

The default keyboard shortcut for this command is ⌘G (Windows, Linux Ctrl+G) as it behaves similar to the **Go to Line/Column** command in the editor. Ctrl+G can be send to the shell with Ctrl+Alt+G.

## Current working directory detection

Shell integration tells VS Code what the current working directory of the shell is. This information is not possible to get on Windows without trying to detect the prompt through regex and requires polling on macOS and Linux, which isn't good for performance.

One of the biggest features this enables is enhanced resolving of links in the terminal. Take a link `package.json` for example, when the link is activated while shell integration is disabled this will open a search quick pick with `package.json` as the filter if there are multiple `package.json` files in the workspace. When shell integration is enabled however, it will open the `package.json` file in the current folder directly because the current location is known. This allows the output of `ls` for example to reliably open the correct file.

The current working directory is also used to show the directory in the terminal tab, in the run recent command quick pick and for the `"terminal.integrated.splitCwd": "inherited"` feature.

## Extended PowerShell keyboard shortcuts

Windows' console API allows for more keyboard shortcuts than Linux/macOS terminals, since VS Code's terminal emulates the latter even on Windows there are some PowerShell keyboard shortcuts that aren't possible using the standard means due to lack of VT encoding such as Ctrl+Space. Shell integration allows VS Code to attach a custom keyboard shortcuts to send a special sequence to PowerShell that then gets handled in the shell integration script and forwarded to the proper key handler.

The following keyboard shortcuts should work in PowerShell when shell integration is enabled:

* Ctrl+Space: Defaults to `MenuComplete` on Windows only
* Alt+Space: Defaults to `SetMark` on all platforms
* Shift+Enter: Defaults to `AddLine` on all platforms
* Shift+End: Defaults to `SelectLine` on all platforms
* Shift+Home: Defaults to `SelectBackwardsLine` on all platforms

## Enhanced accessibility

The information that shell integration provides to VS Code is used to improve [accessibility in the terminal](/docs/configure/accessibility/accessibility#_terminal-accessibility). Some examples of enhancements are:

* Navigation through detected commands in the accessible buffer (⌥F2 (Windows Alt+F2, Linux Shift+Alt+F2))
* An [audio cue](/docs/configure/accessibility/accessibility#_accessibility-signals) plays when a command fails.
* Underlying text box synchronizing such that using the arrow and backspace keys behave more correctly.

## Supported escape sequences

VS Code supports several custom escape sequences:

### VS Code custom sequences 'OSC 633 ; ... ST'

VS Code has a set of custom escape sequences designed to enable the shell integration feature when run in VS Code's terminal. These are used by the built-in scripts but can also be used by any application capable of sending sequences to the terminal, for example the [Julia extension](https://marketplace.visualstudio.com/items?itemName=julialang.language-julia) uses these to support shell integration in the Julia REPL.

These sequences should be ignored by other terminals, but unless other terminals end up adopting the sequences more widely, it's recommended to check that `$TERM_PROGRAM` is `vscode` before writing them.

* `OSC 633 ; A ST`: Mark prompt start.
* `OSC 633 ; B ST`: Mark prompt end.
* `OSC 633 ; C ST`: Mark pre-execution.
* `OSC 633 ; D [; <exitcode>] ST`: Mark execution finished with an optional exit code.
* `OSC 633 ; E ; <commandline> [; <nonce>] ST`: Explicitly set the command line with an optional nonce.

  The E sequence allows the terminal to reliably get the exact command line interpreted by the shell. When this is not specified, the terminal may fallback to using the A, B and C sequences to get the command, or disable the detection all together if it's unreliable.

  The optional nonce can be used to verify the sequence came from the shell integration script to prevent command spoofing. When the nonce is verified successfully, some protections before using the commands will be removed for an improved user experience.

  The command line can escape ASCII characters using the `\xAB` format, where AB are the hexadecimal representation of the character code (case insensitive), and escape the `\` character using `\\`. It's required to escape semi-colon (`0x3b`) and characters 0x20 and below and this is particularly important for new line and semi-colon.

  Some examples:

  ```
  "\"  -> "\\"
  "\n" -> "\x0a"
  ";"  -> "\x3b"
  ```
* `OSC 633 ; P ; <Property>=<Value> ST`: Set a property on the terminal, only known properties will be handled.

  Known properties:

  + `Cwd`: Reports the current working directory to the terminal.
  + `IsWindows`: Indicates whether the terminal is using a Windows backend like winpty or conpty. This may be used to enable additional heuristics as the positioning of the shell integration sequences are not guaranteed to be correct. Valid values are `True` and `False`.
  + `HasRichCommandDetection`: Indicates whether the terminal has rich command detection capabilities. This property is set to `True` when the shell integration script acts ideally as VS Code expects it, specifically sequences should come in the expected positions in the order `A, B, E, C, D`.

### Final Term shell integration

VS Code supports Final Term's shell integration sequences, which allow non-VS Code shell integration scripts to work in VS Code. This results in a somewhat degraded experience as it doesn't support as many features as `OSC 633`. Here are the specific sequences that are supported:

* `OSC 133 ; A ST`: Mark prompt start.
* `OSC 133 ; B ST`: Mark prompt end.
* `OSC 133 ; C ST`: Mark pre-execution.
* `OSC 133 ; D [; <exitcode>] ST`: Mark execution finished with an optional exit code.

### iTerm2 shell integration

The following sequences that iTerm2 pioneered are supported:

* `OSC 1337 ; CurrentDir=<Cwd> ST`: Sets the current working directory of the terminal, similar to `OSC 633 ; P ; Cwd=<Cwd> ST`.
* `OSC 1337 ; SetMark ST`: Adds a mark to the left of the line it was triggered on and also adds an annotation to the scroll bar:

  ![When the sequence is written to the terminal a small grey circle will appear to the left of the command, with a matching annotation in the scroll bar](/assets/docs/terminal/shell-integration/setmark.png)

  These marks integrate with command navigation to make them easy to navigate to via ⌘↑ (Windows, Linux Ctrl+Up) and ⌘↓ (Windows, Linux Ctrl+Down).

## Common questions

### When does automatic injection not work?

There are several cases where automatic injection doesn't work, here are some common cases:

* `$PROMPT_COMMAND` is in an unsupported format, changing it to point to a single function is an easy way to work around this. For example:

  ```
  prompt() {
    printf "\033]0;%s@%s:%s\007" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/\~}"
  }
  PROMPT_COMMAND=prompt
  ```
* Some shell plugins may disable VS Code's shell integration explicitly by unsetting `$VSCODE_SHELL_INTEGRATION` when they initialize.

### Why are command decorations showing when the feature is disabled?

The likely cause of this is that your system has shell integration for another terminal installed that [VS Code understands](#_final-term-shell-integration). If you don't want any decorations, you can hide them with the following setting:

```
"terminal.integrated.shellIntegration.decorationsEnabled": never
```

Alternatively, you could remove the shell integration script from your shell rc/startup script but you will lose access to command-aware features like [command navigation](#_command-navigation).

### Why does the command decoration jump around on Windows?

Windows uses an emulated pseudoterminal (pty) backend called ConPTY. It works a little differently to a regular pty because it needs to maintain compatibility with the Windows Console API. One of the impacts of this is the pty handles rendering specially in such a way that the shell integration sequences that identify the commands in the terminal buffer may be misplaced. When the command jumps around it's typically after a command has run, and VS Code's heuristics have kicked in to improve the position of the command decorations.

5/28/2026

![Search](/assets/icons/search-dark.svg)

* [![VS Code on Github](/assets/icons/github-icon.svg)](https://github.com/microsoft/vscode)
* [![Follow us on X](/assets/icons/x-icon.svg)](https://go.microsoft.com/fwlink/?LinkID=533687)
* [![VS Code on LinkedIn](/assets/icons/linkedin-icon.svg)](https://www.linkedin.com/showcase/vs-code)
* [![VS Code on Bluesky](/assets/icons/bluesky-icon.svg)](https://bsky.app/profile/vscode.dev)
* [![Join the VS Code community on Reddit](/assets/icons/reddit-icon.svg)](https://www.reddit.com/r/vscode/)
* [![The VS Code Insiders Podcast](/assets/icons/podcast-icon.svg)](https://www.vscodepodcast.com)
* [![VS Code on TikTok](/assets/icons/tiktok-icon.svg)](https://www.tiktok.com/%40vscode)
* [![VS Code on YouTube](/assets/icons/youtube-icon.svg)](https://www.youtube.com/%40code)

[![Microsoft homepage](/assets/icons/microsoft.svg)](https://www.microsoft.com)

* [Support](https://support.serviceshub.microsoft.com/supportforbusiness/create?sapId=d66407ed-3967-b000-4cfb-2c318cad363d "Get support for VS Code")
* [Privacy](https://go.microsoft.com/fwlink/?LinkId=521839 "View the Microsoft privacy statement")
* Manage Cookies
* [Terms of Use](https://www.microsoft.com/legal/terms-of-use "View the Microsoft Terms of Use")
* [License](/License "View the Visual Studio Code license")

* Your Privacy Choices Opt-Out Icon

  [Your Privacy Choices](https://aka.ms/YourCaliforniaPrivacyChoices "View Your Privacy Choices")
* [Consumer Health Privacy](https://go.microsoft.com/fwlink/?linkid=2259814 "View the Microsoft Consumer Health Privacy policy")

---
title: "Wave AI (context-aware terminal assistant)"
source_url: "https://docs.waveterm.dev/waveai"
source_type: docs
fetched: 2026-06-01
topic: prior-art
tags: ["wave-terminal", "wave-ai", "scrollback", "terminal-context", "widget", "cli-integration"]
summary: "端末出力・スクロールバック・ファイルを文脈に取り込む端末アシスタントWave AIのドキュメント。Terminalツール文脈やCLI連携を説明。"
relevance: "端末バッファ/スクロールバックをモデル文脈に渡す際の取り込み単位・文脈トグルの先行例。read層の粒度設計の参考。"
chars: 1823
---

[Skip to main content](#__docusaurus_skipToContent_fallback)

[![Wave Terminal Documentation](/img/logo/wave-light.png)![Wave Terminal Documentation](/img/logo/wave-dark.png)](https://www.waveterm.dev/)[Docs](/)[Storybook](https://docs.waveterm.dev/storybook)

Search

[![Wave Terminal Documentation](/img/logo/wave-light.png)![Wave Terminal Documentation](/img/logo/wave-dark.png)](https://www.waveterm.dev/)

* [Home](/)
* [Getting Started](/gettingstarted)
* [Wave AI](/waveai)
* [Wave AI (Local Models + BYOK)](/waveai-modes)
* [Claude Code Integration](/claude-code)
* [Key Bindings](/keybindings)
* [Workspaces](/workspaces)
* [Connections](/connections)
* [Customization](/customization)
* [Secrets](/secrets)
* [Tabs](/tabs)
* [Widgets](/widgets)
* [Configuration](/config)
* [Durable Sessions](/durable-sessions)
* [Tab Backgrounds](/tab-backgrounds)
* [AI Presets (Deprecated)](/ai-presets)
* [wsh overview](/wsh)
* [wsh reference](/wsh-reference)
* [Custom Widgets](/customwidgets)
* [Telemetry](/telemetry)
* [FAQ](/faq)
* [Release Notes](/releasenotes)
* [layout](/layout)
* [Legacy Telemetry](/telemetry-old)

* Wave AI

On this page

# Wave AI

[Edit this page](https://github.com/wavetermdev/waveterm/edit/main/docs/docs/waveai.mdx)

[Previous

Getting Started](/gettingstarted)[Next

Wave AI (Local Models + BYOK)](/waveai-modes)

* [Keyboard Shortcuts](#keyboard-shortcuts)
* [Widget Context Toggle](#widget-context-toggle)
* [File Attachments](#file-attachments)
* [CLI Integration](#cli-integration)
* [AI Tools (Widget Context Enabled)](#ai-tools-widget-context-enabled)
  + [Terminal](#terminal)
  + [File System](#file-system)
  + [Web](#web)
  + [All Widgets](#all-widgets)
* [Local Models & BYOK](#local-models--byok)
* [Privacy](#privacy)

Copyright © 2026 Command Line Inc. Built with Docusaurus.

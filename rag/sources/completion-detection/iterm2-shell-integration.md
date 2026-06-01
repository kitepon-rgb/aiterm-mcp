---
title: "iTerm2 Shell Integration (FinalTerm/OSC 133)"
source_url: "https://iterm2.com/documentation-shell-integration.html"
source_type: docs
fetched: 2026-06-01
topic: completion-detection
tags: ["osc133", "shell-integration", "prompt-marks", "finalterm"]
summary: "iTerm2のshell integrationとFinalTerm由来のOSCシーケンス解説"
relevance: "OSC133によるプロンプト/コマンド境界マークは完了境界検出の有力候補"
chars: 2905
---

[![](/img/logo2x.jpg)](/index.html)

* Menu
* [![](/images/DonateButton.png)](/donate.html)

* [![](/images/DonateButton.png)](/donate.html)

* [Home](/index.html)
* [News](/news.html)
* [Features](/features.html)
* [FAQ](/faq.html)
* [Documentation](/documentation.html)
* [Downloads](/downloads.html)

Table of Contents

Introduction

* [Highlights for New Users](/documentation-highlights.html)
* [General Usage](/documentation-general-usage.html)

User Interface

* [Menu Items](/documentation-menu-items.html)
* [Settings](/documentation-preferences.html)
* [Touch Bar](/documentation-touch-bar.html)
* [Copy Mode](/documentation-copymode.html)
* [Fonts](/documentation-fonts.html)
* [Profile Search Syntax](/documentation-search-syntax.html)
* [Command Selection and Command URLs](/documentation-command-selection.html)
* [Status Bar](/documentation-status-bar.html)

Features

* [Automatic Profile Switching](/documentation-automatic-profile-switching.html)
* [Badges](/documentation-badges.html)
* [Buried Sessions](/documentation-buried-sessions.html)
* [Captured Output](/documentation-captured-output.html)
* [Coprocesses](/documentation-coprocesses.html)
* [Hotkeys](/documentation-hotkey.html)
* [Session Restoration](/documentation-restoration.html)
* [Shell Integration](/documentation-shell-integration.html)
* [Smart Selection](/documentation-smart-selection.html)
* [tmux Integration](/documentation-tmux-integration.html)
* [Triggers](/documentation-triggers.html)
* [Utilities](/documentation-utilities.html)
* [Web Browser](/documentation-web.html)
* [AI Chat](/documentation-ai-chat.html)

Scripting

* [Scripting Fundamentals](/documentation-scripting-fundamentals.html)
* [Scripting Variables](/documentation-variables.html)
* [Python API](https://iterm2.com/python-api)
* [Scripting with AppleScript (Deprecated)](/documentation-scripting.html)

Advanced

* [Dynamic Profiles](/documentation-dynamic-profiles.html)
* [Inline Images Protocol](/documentation-images.html)
* [Proprietary Escape Codes](/documentation-escape-codes.html)

---

# Shell Integration

iTerm2 may be integrated with the unix shell so that it can keep track of your command history, current working directory, host name, and more--even over ssh. This enables several useful features.

Shell integration is compatible with bash, fish (2.3 and later), tcsh, xonsh (iTerm2 3.6.10 and later), and zsh.

### How To Enable Shell Integration

This section describes the four ways to enable shell integration:

1. [Load it automatically.](#load-automatically)
2. [Use the **Install Shell Integration** menu item.](#download-and-run)
3. [Install it by hand.](#install-by-hand)
4. [Configure triggers appropriately.](#triggers)

---

iTerm2 by George Nachman. Website by Matthew Freeman, George Nachman, and James A. Rosen.

Website updated and optimized by [HexBrain](http://hexbrain.com)

[Sponsors](/sponsors.html)

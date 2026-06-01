---
title: "OSC 133 - Shell Integration (Contour Terminal)"
source_url: "https://contour-terminal.org/vt-extensions/osc-133-shell-integration/"
source_type: spec
fetched: 2026-06-01
topic: completion-detection
tags: ["osc-133", "spec", "parameters", "click-events", "cmdline-url"]
summary: "OSC 133のA/B/C/Dを書式(OSC 133;Cmd[;Params]ST)とパラメータ付きで明示した仕様ページ。"
relevance: "パラメータ(click_events, cmdline_url, exit code)まで含むパース仕様。read層でOSC 133を解釈する際の実装基準。"
chars: 6171
---

[ ]
[ ]

[Skip to content](#osc-133-shell-integration)

[![logo](/assets/contour-logo.png)](../.. "Contour Terminal Emulator")

Contour Terminal Emulator

OSC 133 - Shell Integration

Initializing search

[contour-terminal/contour](https://github.com/contour-terminal/contour/ "Go to repository")

* [Home](../..)
* [Getting started](../../install/)
* [Configuration](../../configuration/)
* [Features](../../features/)
* [VT sequence reference](../../vt-sequence/)
* [VT extensions](../)
* [Internals](../../internals/)

[![logo](/assets/contour-logo.png)](../.. "Contour Terminal Emulator")
Contour Terminal Emulator

[contour-terminal/contour](https://github.com/contour-terminal/contour/ "Go to repository")

* [ ]

  [Home](../..)

  Home
  + [Contribution Guidelines](../../CONTRIBUTING/)
* [ ]

  Getting started

  Getting started
  + [Installation](../../install/)
  + [Release Notes](../../release-notes/)
* [ ]

  [Configuration](../../configuration/)

  Configuration
  + [Profiles](../../configuration/profiles/)
  + [Colors](../../configuration/colors/)
  + [Indicator Statusline](../../configuration/indicator-statusline/)
  + [Path Handling in Configuration](../../configuration/paths/)
  + [Key Mapping](../../configuration/key-mapping/)
* [ ]

  Features

  Features
  + [List of features](../../features/)
  + [Font ligatures](../../demo/font-ligatures/)
  + [Images](../../demo/images/)
  + [Input method editor (IME)](../../demo/ime/)
  + [Line marks](../../demo/line-marks/)
  + [Status line](../../demo/statusline/)
  + [Hint mode](../../demo/hint-mode/)
  + [Input modes](../../input-modes/)
  + [Size indicator](../../demo/size_indicator/)
  + [Git branch drawings](../../demo/git-branch-drawings/)
* [ ]

  [VT sequence reference](../../vt-sequence/)

  VT sequence reference
* [x]

  [VT extensions](../)

  VT extensions
  + [Clickable Links](../clickable-links/)
  + [Unicode Core](../unicode-core/)
  + [Vertical Line Markers](../vertical-line-marks/)
  + [Dark and Light Mode detection](../color-palette-update-notifications/)
  + [Synchronized Output](../synchronized-output/)
  + [Buffer Capture](../buffer-capture/)
  + [Query or Change Font Settings](../font-settings/)
  + [Line Reflow Reconfiguration](../line-reflow-mode/)
  + [Save and Restore SGR attributes.](../save-and-restore-sgr-attributes/)
  + [ ]

    OSC 133 - Shell Integration

    [OSC 133 - Shell Integration](./)

    Table of contents
    - [Sequence Specification](#sequence-specification)

      * [Commands](#commands)

        + [A - Prompt Start](#a-prompt-start)
        + [B - Prompt End](#b-prompt-end)
        + [C - Command Output Start](#c-command-output-start)
        + [D - Command Finished](#d-command-finished)
    - [Example Flow](#example-flow)
    - [Related Extensions](#related-extensions)
  + [Semantic Block Query (DEC Mode 2034)](../semantic-block-query/)
* [ ]

  [Internals](../../internals/)

  Internals
  + [Coding Style Guidelines](../../internals/CODING_STYLE/)
  + [A terminal emulator's text stack.](../../internals/text-stack/)

Table of contents

* [Sequence Specification](#sequence-specification)

  + [Commands](#commands)

    - [A - Prompt Start](#a-prompt-start)
    - [B - Prompt End](#b-prompt-end)
    - [C - Command Output Start](#c-command-output-start)
    - [D - Command Finished](#d-command-finished)
* [Example Flow](#example-flow)
* [Related Extensions](#related-extensions)

# OSC 133 - Shell Integration

This documentation describes the OSC 133 sequence used for shell integration, inspired by FinalTerm.

## Sequence Specification

**Format:** `OSC 133 ; <Command> [; <Parameters>...] ST`

Where:

* `OSC` is `\033]`.
* `ST` (String Terminator) is `\033\` (or BEL `\007`).
* `<Command>` is a single character identifier (A, B, C, D).

### Commands

#### A - Prompt Start

Sent before the shell prompt starts printing.

**Format:** `OSC 133 ; A [; <Key>=<Value>...] ST`

**Parameters:**

* `click_events=1`: Optional. If present (e.g., `OSC 133;A;click_events=1;ST`), indicates that the terminal should enable mouse click reporting for the prompt area.

**Behavior:**

* Marks the current line as a prompt line (conceptually similar to setting a "mark").
* Notifies the terminal that the prompt is beginning.

#### B - Prompt End

Sent after the shell prompt has finished printing and before user input begins.

**Format:** `OSC 133 ; B ST`

**Behavior:**

* Notifies the terminal that the prompt has ended.

#### C - Command Output Start

Sent after the user has finished typing the command (usually on Enter press) and before the command output begins.

**Format:** `OSC 133 ; C [; <Key>=<Value>...] ST`

**Parameters:**

* `cmdline_url=<EncodedURL>`: Optional. Defines the command line being executed. The URL is percent-encoded.

**Behavior:**

* Notifies the terminal that command execution is starting and output will follow.
* The `cmdline_url` parameter allows the terminal to know exactly what command is being run (useful for features like "Run Recent Command").

#### D - Command Finished

Sent after the command has finished executing and before the next prompt starts.

**Format:** `OSC 133 ; D [; <ExitCode>] ST`

**Parameters:**

* `<ExitCode>`: The integer exit code of the command (e.g., `0` for success).

**Behavior:**

* Notifies the terminal that the command has finished.
* Reports the exit code of the command.

---

## Example Flow

```
# Prompt Start
printf "\033]133;A\033\\"

# ... print prompt ...
printf "user@host:~$ "

# Prompt End
printf "\033]133;B\033\\"

# ... user types command (e.g., 'ls') ...

# Command Output Start
printf "\033]133;C\033\\"

# ... command output ...
ls

# Command Finished (exit code 0)
printf "\033]133;D;0\033\\"
```

## Related Extensions

* **SETMARK (CSI > M)**: This extension is deprecated in favor of OSC 133.
  It is however similar to `OSC 133 ; A` by triggering `promptStart` and marking the line.

Back to top

[Previous

Save and Restore SGR attributes.](../save-and-restore-sgr-attributes/)
[Next

Semantic Block Query (DEC Mode 2034)](../semantic-block-query/)

Made with
[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

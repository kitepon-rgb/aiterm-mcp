---
title: "libtmux - Pane Interaction (capture_pane / send_keys)"
source_url: "https://libtmux.git-pull.com/topics/pane_interaction.html"
source_type: docs
fetched: 2026-06-01
topic: ansi-handling
tags: ["libtmux", "python", "capture-pane", "send-keys", "escape-sequences", "join-wrapped"]
summary: "tmuxをPythonオブジェクトで操作するlibtmuxの公式ドキュメント。capture_pane(escape_sequences=, join_wrapped=)とsend_keysの実用例。"
relevance: "keystroke送出(send_keys)と画面読取(capture_pane)をtmux越しに行う実装パターンの直接参照。我々のsend/readをtmuxへ実装する際の写経元。"
chars: 17886
---

Contents

Menu

Expand

Light mode

Dark mode

Auto light/dark, in light mode

Auto light/dark, in dark mode

[ ]
[ ]

[Skip to content](#furo-main-content)

*Friendly reminder:* 📌 Pin the package, libtmux is pre-1.0 and APIs will be [changing](/migration.html) throughout 2026.

[libtmux 0.58.0 documentation](../../)

[![Light Logo](../../_static/img/libtmux.svg)
![Dark Logo](../../_static/img/libtmux.svg)

libtmux 0.58.0 documentation](../../)

* [Quickstart](../../quickstart/)
* [Topics](../)[x]
* [API Reference](../../api/)[ ]
* [Testing Utilities](../../api/testing/)[ ]
* [Internals](../../internals/)[ ]
  + [Dataclass helpers - `libtmux._internal.dataclasses`](../../internals/api/libtmux._internal.dataclasses/)
  + [List querying - `libtmux._internal.query_list`](../../internals/api/libtmux._internal.query_list/)
  + [Internal Constants - `libtmux._internal.constants`](../../internals/api/libtmux._internal.constants/)
  + [Internal Sparse Array - `libtmux._internal.sparse_array`](../../internals/api/libtmux._internal.sparse_array/)
* [Project](../../project/)[ ]
  + [Development](../../project/contributing/)
  + [Code Style](../../project/code-style/)
  + [Releasing](../../project/releasing/)
  + [Public API](../../project/public-api/)
  + [Compatibility](../../project/compatibility/)
  + [Deprecations](../../project/deprecations/)
* [Changelog](../../history/)
* [Migration notes](../../migration/)
* [Glossary](../../glossary/)
* [MCP](https://libtmux-mcp.git-pull.com)
* [GitHub](https://github.com/tmux-python/libtmux)

team git-pull / [Tony Narlock](https://tony.sh):

vcs-python
[vcspull](https://vcspull.git-pull.com)
([libvcs](https://libvcs.git-pull.com)),
[g](https://g.git-pull.com)

tmux-python

[tmuxp](https://tmuxp.git-pull.com)

[libtmux](https://libtmux.git-pull.com)
([mcp](https://libtmux-mcp.git-pull.com),
[pytest](https://libtmux.git-pull.com/pytest-plugin/))

cihai

[unihan-etl](https://unihan-etl.git-pull.com)
([db](https://unihan-db.git-pull.com))

[cihai](https://cihai.git-pull.com)
([cli](https://cihai-cli.git-pull.com))

django

[django-slugify-processor](https://django-slugify-processor.git-pull.com)

[django-docutils](https://django-docutils.git-pull.com)

AI

[libtmux-mcp](https://libtmux-mcp.git-pull.com)

[agentgrep](https://agentgrep.org)
([mcp](https://agentgrep.org/mcp/))

docs + tests

[gp-libs](https://gp-libs.git-pull.com)

[gp-sphinx](https://gp-sphinx.git-pull.com)

web

[social-embed](https://social-embed.org)

Back to top

[View this page](https://github.com/tmux-python/libtmux/blob/master/docs/topics/pane_interaction.md?plain=true "View this page")

[Edit this page](https://github.com/tmux-python/libtmux/edit/master/docs/topics/pane_interaction.md "Edit this page")

# Pane Interaction[¶](#pane-interaction "Link to this heading")

libtmux provides powerful methods for interacting with tmux panes programmatically.
This is especially useful for automation, testing, and orchestrating terminal-based
workflows.

Open two terminals:

Terminal one: start tmux in a separate terminal:

```
$ tmux
```

Terminal two, `python` or `ptpython` if you have it:

```
$ python
```

## Sending Commands[¶](#sending-commands "Link to this heading")

The [`send_keys()`](../../api/libtmux.pane/#libtmux.Pane.send_keys "libtmux.Pane.send_keys") method sends text to a pane, optionally pressing
Enter to execute it.

### Basic command execution[¶](#basic-command-execution "Link to this heading")

```
>>> pane = window.split(shell='sh')

>>> pane.send_keys('echo "Hello from libtmux"')

>>> import time; time.sleep(0.1)  # Allow command to execute

>>> output = pane.capture_pane()
>>> 'Hello from libtmux' in '\\n'.join(output)
True
```

### Send without pressing Enter[¶](#send-without-pressing-enter "Link to this heading")

Use `enter=False` to type text without executing:

```
>>> pane.send_keys('echo "waiting"', enter=False)

>>> # Text is typed but not executed
>>> output = pane.capture_pane()
>>> 'waiting' in '\\n'.join(output)
True
```

Press Enter separately with [`enter()`](../../api/libtmux.pane/#libtmux.Pane.enter "libtmux.Pane.enter"):

```
>>> import time

>>> # First type something without pressing Enter
>>> pane.send_keys('echo "execute me"', enter=False)

>>> pane.enter()
Pane(%... Window(@... ..., Session($... ...)))

>>> time.sleep(0.2)

>>> output = pane.capture_pane()
>>> 'execute me' in '\\n'.join(output)
True
```

### Literal mode for special characters[¶](#literal-mode-for-special-characters "Link to this heading")

Use `literal=True` to send special characters without interpretation:

```
>>> import time

>>> pane.send_keys('echo "Tab:\\tNewline:\\n"', literal=True)

>>> time.sleep(0.1)
```

### Suppress shell history[¶](#suppress-shell-history "Link to this heading")

Use `suppress_history=True` to prepend a space (prevents command from being
saved in shell history):

```
>>> import time

>>> pane.send_keys('echo "secret command"', suppress_history=True)

>>> time.sleep(0.1)
```

### Flag-only invocation[¶](#flag-only-invocation "Link to this heading")

When you want to invoke `send-keys` only for its flags — resetting the
pane or repeating a key — pass `cmd=None`:

```
>>> # Repeat the last key 5 times (-N 5)
>>> pane.send_keys(cmd=None, repeat=5)

>>> # Reset the pane to default state (-R)
>>> pane.send_keys(cmd=None, reset=True)
```

`cmd=None` requires at least one of `reset=True`, `repeat=N`, or
`copy_mode_cmd=...`; calling it with no flag raises `ValueError` to
prevent silent no-ops.

## Capturing Output[¶](#capturing-output "Link to this heading")

The [`capture_pane()`](../../api/libtmux.pane/#libtmux.Pane.capture_pane "libtmux.Pane.capture_pane") method captures text from a pane’s buffer.

### Basic capture[¶](#basic-capture "Link to this heading")

```
>>> import time

>>> pane.send_keys('echo "Line 1"; echo "Line 2"; echo "Line 3"')

>>> time.sleep(0.1)

>>> output = pane.capture_pane()
>>> isinstance(output, list)
True
>>> any('Line 2' in line for line in output)
True
```

### Capture with line ranges[¶](#capture-with-line-ranges "Link to this heading")

Capture specific line ranges using `start` and `end` parameters:

```
>>> # Capture last 5 lines of visible pane
>>> recent = pane.capture_pane(start=-5, end='-')
>>> isinstance(recent, list)
True

>>> # Capture from start of history to current
>>> full_history = pane.capture_pane(start='-', end='-')
>>> len(full_history) >= 0
True
```

### Capture with ANSI escape sequences[¶](#capture-with-ansi-escape-sequences "Link to this heading")

Capture colored output with escape sequences preserved using `escape_sequences=True`:

```
>>> import time

>>> pane.send_keys('printf "\\033[31mRED\\033[0m \\033[32mGREEN\\033[0m"')
>>> time.sleep(0.1)

>>> # Capture with ANSI codes stripped (default)
>>> output = pane.capture_pane()
>>> 'RED' in '\\n'.join(output)
True

>>> # Capture with ANSI escape sequences preserved
>>> colored_output = pane.capture_pane(escape_sequences=True)
>>> isinstance(colored_output, list)
True
```

### Join wrapped lines[¶](#join-wrapped-lines "Link to this heading")

Long lines that wrap in the terminal can be joined back together:

```
>>> import time

>>> # Send a very long line that will wrap
>>> pane.send_keys('echo "' + 'x' * 200 + '"')
>>> time.sleep(0.1)

>>> # Capture with wrapped lines joined
>>> output = pane.capture_pane(join_wrapped=True)
>>> isinstance(output, list)
True
```

### Preserve trailing spaces[¶](#preserve-trailing-spaces "Link to this heading")

By default, trailing spaces are trimmed. Use `preserve_trailing=True` to keep them:

```
>>> import time

>>> pane.send_keys('printf "text   \\n"')  # 3 trailing spaces
>>> time.sleep(0.1)

>>> # Capture with trailing spaces preserved
>>> output = pane.capture_pane(preserve_trailing=True)
>>> isinstance(output, list)
True
```

### Capture flags summary[¶](#capture-flags-summary "Link to this heading")

| Parameter | tmux Flag | Description |
| --- | --- | --- |
| `escape_sequences` | `-e` | Include ANSI escape sequences (colors, attributes) |
| `escape_non_printable` | `-C` | Escape non-printable chars as octal `\xxx` |
| `join_wrapped` | `-J` | Join wrapped lines back together |
| `preserve_trailing` | `-N` | Preserve trailing spaces at line ends |
| `trim_trailing` | `-T` | Trim trailing empty positions (tmux 3.4+) |
| `pending` | `-P` | Dump the unprocessed input buffer instead of the screen |

Note

The `trim_trailing` parameter requires tmux 3.4+. If used with an older version,
a warning is issued and the flag is ignored.

### Capturing the pending input buffer[¶](#capturing-the-pending-input-buffer "Link to this heading")

Use `pending=True` to dump bytes tmux has buffered in its parser but
not yet committed to the pane’s terminal — input the tmux process read
from the pane’s PTY but hasn’t fed through its escape-sequence parser
into the visible screen. Use to inspect partial control sequences
mid-write.

```
>>> pending = pane.capture_pane(pending=True)
>>> isinstance(pending, list)
True
```

`pending=True` is mutually exclusive with the line-range and screen-mode
flags (`start`, `end`, `escape_sequences`, etc.) — tmux ignores them when
`-P` is set.

## Waiting for Output[¶](#waiting-for-output "Link to this heading")

A common pattern in automation is waiting for a command to complete.

### Polling for completion marker[¶](#polling-for-completion-marker "Link to this heading")

```
>>> import time

>>> pane.send_keys('sleep 0.2; echo "TASK_COMPLETE"')

>>> # Poll for completion
>>> for _ in range(30):
...     output = pane.capture_pane()
...     if 'TASK_COMPLETE' in '\\n'.join(output):
...         break
...     time.sleep(0.1)

>>> 'TASK_COMPLETE' in '\\n'.join(output)
True
```

### Helper function for waiting[¶](#helper-function-for-waiting "Link to this heading")

```
>>> import time

>>> def wait_for_text(pane, text, timeout=5.0):
...     """Wait for text to appear in pane output."""
...     start = time.time()
...     while time.time() - start < timeout:
...         output = pane.capture_pane()
...         if text in '\\n'.join(output):
...             return True
...         time.sleep(0.1)
...     return False

>>> pane.send_keys('echo "READY"')
>>> wait_for_text(pane, 'READY', timeout=2.0)
True
```

## Querying Pane State[¶](#querying-pane-state "Link to this heading")

The [`display_message()`](../../api/libtmux.pane/#libtmux.Pane.display_message "libtmux.Pane.display_message") method queries tmux format variables.

### Get pane dimensions[¶](#get-pane-dimensions "Link to this heading")

```
>>> width = pane.display_message('#{pane_width}', get_text=True)
>>> isinstance(width, list) and len(width) > 0
True

>>> height = pane.display_message('#{pane_height}', get_text=True)
>>> isinstance(height, list) and len(height) > 0
True
```

### Get pane information[¶](#get-pane-information "Link to this heading")

```
>>> # Current working directory
>>> cwd = pane.display_message('#{pane_current_path}', get_text=True)
>>> isinstance(cwd, list)
True

>>> # Pane ID
>>> pane_id = pane.display_message('#{pane_id}', get_text=True)
>>> pane_id[0].startswith('%')
True
```

### Common format variables[¶](#common-format-variables "Link to this heading")

| Variable | Description |
| --- | --- |
| `#{pane_width}` | Pane width in characters |
| `#{pane_height}` | Pane height in characters |
| `#{pane_current_path}` | Current working directory |
| `#{pane_pid}` | PID of the pane’s shell |
| `#{pane_id}` | Unique pane ID (e.g., `%0`) |
| `#{pane_index}` | Pane index in window |

## Resizing Panes[¶](#resizing-panes "Link to this heading")

The [`resize()`](../../api/libtmux.pane/#libtmux.Pane.resize "libtmux.Pane.resize") method adjusts pane dimensions.

### Resize by specific dimensions[¶](#resize-by-specific-dimensions "Link to this heading")

```
>>> # Make pane larger
>>> pane.resize(height=20, width=80)
Pane(%... Window(@... ..., Session($... ...)))
```

### Resize by adjustment[¶](#resize-by-adjustment "Link to this heading")

```
>>> from libtmux.constants import ResizeAdjustmentDirection

>>> # Increase height by 5 rows
>>> pane.resize(adjustment_direction=ResizeAdjustmentDirection.Up, adjustment=5)
Pane(%... Window(@... ..., Session($... ...)))

>>> # Decrease width by 10 columns
>>> pane.resize(adjustment_direction=ResizeAdjustmentDirection.Left, adjustment=10)
Pane(%... Window(@... ..., Session($... ...)))
```

### Zoom toggle[¶](#zoom-toggle "Link to this heading")

```
>>> # Zoom pane to fill window
>>> pane.resize(zoom=True)
Pane(%... Window(@... ..., Session($... ...)))

>>> # Unzoom
>>> pane.resize(zoom=True)
Pane(%... Window(@... ..., Session($... ...)))
```

## Clearing the Pane[¶](#clearing-the-pane "Link to this heading")

The [`clear()`](../../api/libtmux.pane/#libtmux.Pane.clear "libtmux.Pane.clear") method clears the pane’s screen:

```
>>> pane.clear()
Pane(%... Window(@... ..., Session($... ...)))
```

## Killing Panes[¶](#killing-panes "Link to this heading")

The [`kill()`](../../api/libtmux.pane/#libtmux.Pane.kill "libtmux.Pane.kill") method destroys a pane:

```
>>> # Create a temporary pane
>>> temp_pane = pane.split()
>>> temp_pane in window.panes
True

>>> # Kill it
>>> temp_pane.kill()
>>> temp_pane not in window.panes
True
```

### Kill all except current[¶](#kill-all-except-current "Link to this heading")

```
>>> # Setup: create multiple panes
>>> pane.window.resize(height=60, width=120)
Window(@... ...)

>>> keep_pane = pane.split()
>>> extra1 = pane.split()
>>> extra2 = pane.split()

>>> # Kill all except keep_pane
>>> keep_pane.kill(all_except=True)

>>> keep_pane in window.panes
True
>>> extra1 not in window.panes
True
>>> extra2 not in window.panes
True

>>> # Cleanup
>>> keep_pane.kill()
```

## Practical Recipes[¶](#practical-recipes "Link to this heading")

### Recipe: Run command and capture output[¶](#recipe-run-command-and-capture-output "Link to this heading")

```
>>> import time

>>> def run_and_capture(pane, command, marker='__DONE__', timeout=5.0):
...     """Run a command and return its output."""
...     pane.send_keys(f'{command}; echo {marker}')
...     start = time.time()
...     while time.time() - start < timeout:
...         output = pane.capture_pane()
...         output_str = '\\n'.join(output)
...         if marker in output_str:
...             return output  # Return all captured output
...         time.sleep(0.1)
...     raise TimeoutError(f'Command did not complete within {timeout}s')

>>> result = run_and_capture(pane, 'echo "captured text"', timeout=2.0)
>>> 'captured text' in '\\n'.join(result)
True
```

### Recipe: Check for error patterns[¶](#recipe-check-for-error-patterns "Link to this heading")

```
>>> import time

>>> def check_for_errors(pane, error_patterns=None):
...     """Check pane output for error patterns."""
...     if error_patterns is None:
...         error_patterns = ['error:', 'Error:', 'ERROR', 'failed', 'FAILED']
...     output = '\\n'.join(pane.capture_pane())
...     for pattern in error_patterns:
...         if pattern in output:
...             return True
...     return False

>>> pane.send_keys('echo "All good"')
>>> time.sleep(0.1)
>>> check_for_errors(pane)
False
```

See also

* [API Reference](../../api/#api) for the full API reference
* [`Pane`](../../api/libtmux.pane/#libtmux.Pane "libtmux.Pane") for all pane methods
* [Automation Patterns](../automation_patterns/#automation-patterns) for advanced orchestration patterns

[Next

Workspace Setup](../workspace_setup/)
[Previous

QueryList Filtering](../filtering/)

Copyright © Copyright 2016- Tony Narlock

Made with [Sphinx](https://www.sphinx-doc.org/) and [gp-sphinx](https://github.com/git-pull/gp-sphinx)
(fork of [Furo](https://github.com/pradyunsg/furo)
by [@pradyunsg](https://pradyunsg.me))

Source: `docs/topics/pane_interaction.md`
·
Machine-readable:
[Markdown](../pane_interaction.md),
[raw source](https://github.com/tmux-python/libtmux/raw/master/docs/topics/pane_interaction.md),
[docs.json](../../docs.json),
[llms.txt](../../llms.txt),
[llms-full.txt](../../llms-full.txt)

On this page

* Pane Interaction
  + [Sending Commands](#sending-commands)
    - [Basic command execution](#basic-command-execution)
    - [Send without pressing Enter](#send-without-pressing-enter)
    - [Literal mode for special characters](#literal-mode-for-special-characters)
    - [Suppress shell history](#suppress-shell-history)
    - [Flag-only invocation](#flag-only-invocation)
  + [Capturing Output](#capturing-output)
    - [Basic capture](#basic-capture)
    - [Capture with line ranges](#capture-with-line-ranges)
    - [Capture with ANSI escape sequences](#capture-with-ansi-escape-sequences)
    - [Join wrapped lines](#join-wrapped-lines)
    - [Preserve trailing spaces](#preserve-trailing-spaces)
    - [Capture flags summary](#capture-flags-summary)
    - [Capturing the pending input buffer](#capturing-the-pending-input-buffer)
  + [Waiting for Output](#waiting-for-output)
    - [Polling for completion marker](#polling-for-completion-marker)
    - [Helper function for waiting](#helper-function-for-waiting)
  + [Querying Pane State](#querying-pane-state)
    - [Get pane dimensions](#get-pane-dimensions)
    - [Get pane information](#get-pane-information)
    - [Common format variables](#common-format-variables)
  + [Resizing Panes](#resizing-panes)
    - [Resize by specific dimensions](#resize-by-specific-dimensions)
    - [Resize by adjustment](#resize-by-adjustment)
    - [Zoom toggle](#zoom-toggle)
  + [Clearing the Pane](#clearing-the-pane)
  + [Killing Panes](#killing-panes)
    - [Kill all except current](#kill-all-except-current)
  + [Practical Recipes](#practical-recipes)
    - [Recipe: Run command and capture output](#recipe-run-command-and-capture-output)
    - [Recipe: Check for error patterns](#recipe-check-for-error-patterns)

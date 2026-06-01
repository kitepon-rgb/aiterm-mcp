---
title: "Terminal-Shell integration - a proposed specification (Per Bothner)"
source_url: "https://per.bothner.com/blog/2019/shell-integration-proposal/"
source_type: article
fetched: 2026-06-01
topic: completion-detection
tags: ["osc-133", "finalterm", "semantic-prompt", "spec-proposal", "shell-integration"]
summary: "OSC 133系セマンティックプロンプトの設計思想と要件を整理した提案記事。FinalTerm/iTerm2/DomTermの実装差を横断。"
relevance: "完了境界(プロンプト開始/コマンド開始/出力開始/終了+exit code)をなぜ・どう区切るかの原典的論拠。我々の境界検出設計の出発点になる。"
chars: 10489
---

[Per's home page](../../../index.html)
[Per's Papers](../../../papers/index.html)
[Per's Software](../../../software/index.html)
[Per and Nathan's photos](http://pics.bothner.com/)

# [Per Bothner's blog](../../index.html)

Archive:
[2019](../../2019/)
[2018](../../2018/)
[2017](../../2017/)
[2016](../../2016/)
[2014](../../2014/)
[2013](../../2013/)
[2011](../../2011/)
[2010](../../2010/)
[2009](../../2009/)
[2008](../../2008/)
[2007](../../2007/)

Categories:
[Kawa](../../Kawa/)
[Scheme](../../Scheme/)
[DomTerm](../../DomTerm/)
[UI](../../UI/)
[Java](../../Java/)
[JavaFX](../../JavaFX/)
[drafts](../../drafts/)

Powered by [IkiWiki](http://ikiwiki.info/).

## Terminal-Shell integration - a proposed specification

"Shell integration" refers to a protocol
between a terminal emulator and a shell (or other REPL)
to provide various features, some shown below.
The main idea is that the shell sends extra escape sequences to mark
the various parts of a command: prompt, input, and output.
Terminals that have supported some variation of this concept include
[XMLterm](https://www.xml.com/pub/2000/06/07/xmlterm/index.html),
[GraphTerm](https://github.com/mitotic/graphterm),
[FinalTerm](https://github.com/p-e-w/finalterm),
[Iterm2](https://iterm2.com/documentation-shell-integration.html),
[ExtraTerm](http://extraterm.org/), and
[DomTerm](http://domterm.org/Wire-byte-protocol.html).
These protocols are not consistent and have missing funtionality,
so I have been working on
a [proposed specification](https://gitlab.freedesktop.org/Per_Bothner/specifications/blob/master/proposals/semantic-prompts.md).

The rest of this article will show some of the supported features,
and discuss some unresolved issues.
If you want to try out the current state, please
[clone DomTerm](https://github.com/PerBothner/DomTerm),
and follow the
[build instructions](https://domterm.org/Downloading-and-building.html).
Best results (and the following screenshots) use the current
[gitgub master of Fish](https://github.com/fish-shell/fish-shell/),
after sourcing `tools/shell-integration.fish`
(in the DomTerm sources).

### Visually separate commands from each other

Shell integration enables each command (with its associated input and output)
to be separated from other commands.
The default DomTerm styling uses a thin partially-transparent green line
you can see in the screenshot below
![colors1.png](./colors1.png)

### Different styling for prompt, input, and output

It is helpful to use a different styling for input and output.
A simple version is to add distinctive styling for the prompt,
but adding styling for entire input lines is even better.
The DomTerm default styling (for light mode) is a pale green background
for the prompt, a light yellow for the actual input, and a slighly darker
yellow for the rest of the input line.
Using pale background colors makes it less likely that it will conflict
with user color preferences, including syntax coloring.

![colors2.png](./colors2.png)

Note that the actual user input are distictively styled,
even spaces. It is helpful to see what are the actual input characters,
to avoid surprises in selection or cursor movement.
The above `echo -n foo \`  illustrates this -
the input line ends with two spaces:
The final space is removed by the fish parser, but the space before
is escaped by a backslash, as you can see in the output.
(The down-arrow `⏎` symbol is emitted by fish to indicate
a missing final newline in the output. The output ends in two spaces: one
following `foo` in the input and one following the backspash.)

### Button to hide/show command output

One useful feature enabled by shell integration
is a button to hide (or show) the output of a command.
DomTerm puts a downward triangle in the right "gutter" of the first
line if there is any output or more than one input line.
Clicking on the button hides all but the first line, and changes
the triangle to a right-pointing one
(that can be clicked to restore the hidden lines).

![hidden1.png](./hidden1.png)

DomTerm places the hide/show button in the same "right gutter"
that is also used to mark wrapped long lines (as shown above).
The same area is also used to show error status (below),
and for the cursor when at the end of a line.

### Show error status

When a command finishes, the application can send the exit status
in an escape sequence to the terminal.
DomTerm handles a non-zero exit status by displaying a red circle
in the right gutter of the last line of the command.
(If there is no output, as with the `false` command,
the circle appears in the last input line.)
Hovering over the red circle displays the exit code.

![errors1.png](./errors1.png)

### Move cursor using mouse

People new to shells usually expect that they can move the input cursor
using a mouse click, and are surprised when it doesn't work.
Experienced shell users also sometimes want this ability,
for example making an edit to a long command.
This can be implemented using xterm-style mouse handling,
but that is non-trivial to implement.
It also has some undesirable side-effects, including disabling
the default mouse behavior for selection and for context menus.

A simpler solution is to configure a terminal emulator to map
a mouse click to the appropriate number of cursor-motion keystrokes.
By default, the terminal can send the escape sequences emitted for
the Left and Right arrow keys.
This works well for many unmodified REPL applications.
(However, to avoid surprises, this has to be specifically enabled
by adding a special escape sequence to the prompt.)

DomTerm also allows you to "force" mouse-click translation:
If the Alt modifier is pressed during a left mouse-click,
the DomTerm sends the appropriate arrow-key sequence to move the cursor,
even if translation has not been eplicitly requested.
This is useful for an application like `vim`,
which understands arrow keys but does not have mouse handling by default.

Motion is easy to handle when moving within a single line.
Some input editors (such as [`fish`](https://fishshell.com/docs/current/index.html#multiline)\_ support multi-line input areas.
Things get more complicated when the mouse-click is a different line
than the current position. When the terminal calculates the arrow-key
sequence it must be able to
ignore prompts and non-significant spacing, such as the indentation
`fish` emits, or the space before any right-edge prompt.
Another issue is what kind cursor motion the terminal should send:
For `fish` you only want to send Left/Right arrows,
since Up/Down moves through the history.
The draft protocol and the DomTerm implementation support multiple options.

### Integrating the selection and clipboard

How to integrate the system selection and clipboard with the
input editor raises a number of questions that deserve a separate article.
The way Emacs integrates the "region" with the selection
seems a good approach (but the devil is in the details).

In DomTerm, if you make a selection that ends inside the input area,
then DomTerm moves the cursor to the end of the selection
(in the same way as if you clicked):

![sel1.png](./sel1.png)

If you type Shift-Right or Shift-Left (optionally with Ctrl)
the selection is extended and the cursor moved to the new endpoint.
For example, typing Ctrl-Shift-Right extends the selection by one word:

![sel2.png](./sel2.png)

Typing Ctrl-Shift-X copies the selection to the clipboard, and deletes it
by emulating the appropriate number of Delete or Backspace key-presses.

Coming soon is having Delete or Backspace delete the selection,
without copying to the clipboard.

### Re-flow on window re-size

Many terminals will automatically re-flow (re-break) wrapped
lines when the window width is changed.
The terminal will also send a notification to the application,
which may also re-display the output to take into account the changed size.
The re-display done by the terminal may be conflict with that
done by the application. For fullscreen applications it's not
a problem because the applications can clear the buffer and re-paint,
which clear any conflicting re-flow done by the terminal.
For shells it is trickier: Suppose the current input fits on one line,
but the window is made narrower. The terminal re-wraps the line as two lines.
Then the application gets the window-changed notification, and
redisplays the input line - but without taking into account the
terminal's re-wrap, making a mess of the display.

This is a hard problem: Having the application assume re-wrap has happened
is unreliable, because another re-size and re-wrap may have happened in
the meanwhile. It is better to disable terminal re-wrap for the current line
(the one containing the cursor), but that breaks in the case of multi-line
input if the application re-sends previous input lines.

The proposed specification recommends that on re-size the application
re-sends a prompt-start escape sequence, but not the command-start
escape sequence. The terminal can if needed move the cursor
to the first input line when it sees the prompt-start sequence.
This seems to work pretty well.

(Better would be to let the terminal can handle the re-wrap, and the
application not do re-display at all. This avoids the race condition,
and it makes old input lines wrap the same way as the current line.
However, that may require more radical protocol changes:
It works best if the application can act as if the available
width is unlimited, and delegate line-breaking it to the terminals.)

### Select only real user input

When selecting and copying text that includes input it is usually
more useful to ignore indentation, prompts, and extra spacing
(such as between user input and a right prompt).

### Right and continution prompts Some shells and input libraries (including fish and JLine3) let the application specify a "right prompt" displayed at the right of the line. This may complicate selection/copy, as you may not want to include the right prompt (especially in the middle of multi-line input), nor do you want selection to include the spacing before the prompt. Ideally, reflow after width change should adjust the spacing so the prompt of old input lines stays at the right. (This is not yet implemented.) Fish will only display the right prompt if there enough space; ideally this should be taken account on reflow.

Tags:
[DomTerm](../../tag/DomTerm/)
[UI](../../tag/UI/)

Created 14 Jun 2019 16:27 PDT. Last edited 16 Oct 2019 13:03 PDT.

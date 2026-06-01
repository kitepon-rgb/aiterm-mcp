---
title: "Aider In-chat commands (/run, /test)"
source_url: "https://aider.chat/docs/usage/commands.html"
source_type: docs
fetched: 2026-06-01
topic: prior-art
tags: ["aider", "shell-integration", "run-command", "test-command", "output-feedback"]
summary: "aiderのチャット内コマンド一覧。/runで任意シェルコマンドを実行し出力をLLMへ戻す、/testは非ゼロ終了時のみ出力を取り込む挙動を説明。"
relevance: "コマンド実行結果をモデルへ還流する境界設計の参照。終了コード基準で取り込み量を変える運用は完了検出の一案。"
chars: 12868
---

[Skip to main content](#main-content)

Link

Menu

Expand

(external link)

Document

Search

Copy

Copied

[aider](/)

* [Installation](/docs/install.html)
  + [Optional steps](/docs/install/optional.html)
  + [Aider with docker](/docs/install/docker.html)
  + [GitHub Codespaces](/docs/install/codespaces.html)
  + [Replit](/docs/install/replit.html)
* [Usage](/docs/usage.html)
  + [Tips](/docs/usage/tips.html)
  + [In-chat commands](/docs/usage/commands.html)
  + [Chat modes](/docs/usage/modes.html)
  + [Tutorial videos](/docs/usage/tutorials.html)
  + [Voice-to-code with aider](/docs/usage/voice.html)
  + [Images & web pages](/docs/usage/images-urls.html)
  + [Prompt caching](/docs/usage/caching.html)
  + [Aider in your IDE](/docs/usage/watch.html)
  + [Notifications](/docs/usage/notifications.html)
  + [Aider in your browser](/docs/usage/browser.html)
  + [Specifying coding conventions](/docs/usage/conventions.html)
  + [Copy/paste with web chat](/docs/usage/copypaste.html)
  + [Linting and testing](/docs/usage/lint-test.html)
  + [Editing config & text files](/docs/usage/not-code.html)
* [Connecting to LLMs](/docs/llms.html)
  + [OpenAI](/docs/llms/openai.html)
  + [Anthropic](/docs/llms/anthropic.html)
  + [Gemini](/docs/llms/gemini.html)
  + [GROQ](/docs/llms/groq.html)
  + [LM Studio](/docs/llms/lm-studio.html)
  + [xAI](/docs/llms/xai.html)
  + [Azure](/docs/llms/azure.html)
  + [Cohere](/docs/llms/cohere.html)
  + [DeepSeek](/docs/llms/deepseek.html)
  + [Ollama](/docs/llms/ollama.html)
  + [OpenAI compatible APIs](/docs/llms/openai-compat.html)
  + [OpenRouter](/docs/llms/openrouter.html)
  + [GitHub Copilot](/docs/llms/github.html)
  + [Vertex AI](/docs/llms/vertex.html)
  + [Amazon Bedrock](/docs/llms/bedrock.html)
  + [Other LLMs](/docs/llms/other.html)
  + [Model warnings](/docs/llms/warnings.html)
* [Configuration](/docs/config.html)
  + [API Keys](/docs/config/api-keys.html)
  + [Options reference](/docs/config/options.html)
  + [YAML config file](/docs/config/aider_conf.html)
  + [Config with .env](/docs/config/dotenv.html)
  + [Editor configuration](/docs/config/editor.html)
  + [Reasoning models](/docs/config/reasoning.html)
  + [Advanced model settings](/docs/config/adv-model-settings.html)
  + [Model Aliases](/docs/config/model-aliases.html)
* [Troubleshooting](/docs/troubleshooting.html)
  + [File editing problems](/docs/troubleshooting/edit-errors.html)
  + [Model warnings](/docs/troubleshooting/warnings.html)
  + [Token limits](/docs/troubleshooting/token-limits.html)
  + [Aider not found](/docs/troubleshooting/aider-not-found.html)
  + [Dependency versions](/docs/troubleshooting/imports.html)
  + [Models and API keys](/docs/troubleshooting/models-and-keys.html)
  + [Using /help](/docs/troubleshooting/support.html)
* [Screen recordings](/docs/recordings/)
  + [Add language support via tree-sitter-language-pack](/docs/recordings/tree-sitter-language-pack.html)
  + [Add –auto-accept-architect feature](/docs/recordings/auto-accept-architect.html)
  + [Don’t /drop read-only files added at launch](/docs/recordings/dont-drop-original-read-files.html)
  + [Warn when users apply unsupported reasoning settings](/docs/recordings/model-accepts-settings.html)
* [Example chat transcripts](/examples/README.html)
  + [Create a simple flask app with aider](/examples/hello-world-flask.html)
  + [Modify an open source 2048 game with aider](/examples/2048-game.html)
  + [A complex multi-file change, with debugging](/examples/complex-change.html)
  + [Create a “black box” test case](/examples/add-test.html)
  + [Automatically update docs with aider](/examples/update-docs.html)
  + [Build pong with aider and pygame.](/examples/pong.html)
  + [Complete a css exercise with aider](/examples/css-exercises.html)
  + [Download, analyze and plot US Census data](/examples/census.html)
  + [Editing an asciinema cast file with aider](/examples/asciinema.html)
  + [Hello aider!](/examples/hello.html)
  + [Honor the NO\_COLOR environment variable](/examples/no-color.html)
  + [Improve css styling of chat transcripts](/examples/chat-transcript-css.html)
  + [Semantic search & replace code with aider](/examples/semantic-search-replace.html)
* [More info](/docs/more-info.html)
  + [Git integration](/docs/git.html)
  + [Supported languages](/docs/languages.html)
  + [Repository map](/docs/repomap.html)
  + [Scripting aider](/docs/scripting.html)
  + [Infinite output](/docs/more/infinite-output.html)
  + [Edit formats](/docs/more/edit-formats.html)
  + [Analytics](/docs/more/analytics.html)
  + [Privacy policy](/docs/legal/privacy.html)
* [FAQ](/docs/faq.html)
* [Release history](/HISTORY.html)
* [Aider LLM Leaderboards](/docs/leaderboards/)
  + [Code editing leaderboard](/docs/leaderboards/edit.html)
  + [Refactoring leaderboard](/docs/leaderboards/refactor.html)
  + [Scores by release date](/docs/leaderboards/by-release-date.html)
  + [Benchmark notes](/docs/leaderboards/notes.html)
  + [Contributing results](/docs/leaderboards/contrib.html)
* [Aider blog](/blog/)

* [GitHub](https://github.com/Aider-AI/aider)
* [Discord](https://discord.gg/Y7X7bhMQFV)

Aider is AI pair programming in your terminal.
Aider is on
[GitHub](https://github.com/Aider-AI/aider)
and
[Discord](https://discord.gg/Y7X7bhMQFV).

* [GitHub](https://github.com/Aider-AI/aider)
* [Discord](https://discord.gg/Y7X7bhMQFV)
* [Blog](/blog/)

1. [Usage](/docs/usage.html)
2. In-chat commands

# In-chat commands

* [Slash commands](#slash-commands)
* [Entering multi-line chat messages](#entering-multi-line-chat-messages)
* [Interrupting with CONTROL-C](#interrupting-with-control-c)
* [Keybindings](#keybindings)
  + [Emacs](#emacs)
  + [Vi](#vi)

## Slash commands

Aider supports commands from within the chat, which all start with `/`.

| Command | Description |
| --- | --- |
| **/add** | Add files to the chat so aider can edit them or review them in detail |
| **/architect** | Enter architect/editor mode using 2 different models. If no prompt provided, switches to architect/editor mode. |
| **/ask** | Ask questions about the code base without editing any files. If no prompt provided, switches to ask mode. |
| **/chat-mode** | Switch to a new chat mode |
| **/clear** | Clear the chat history |
| **/code** | Ask for changes to your code. If no prompt provided, switches to code mode. |
| **/commit** | Commit edits to the repo made outside the chat (commit message optional) |
| **/context** | Enter context mode to see surrounding code context. If no prompt provided, switches to context mode. |
| **/copy** | Copy the last assistant message to the clipboard |
| **/copy-context** | Copy the current chat context as markdown, suitable to paste into a web UI |
| **/diff** | Display the diff of changes since the last message |
| **/drop** | Remove files from the chat session to free up context space |
| **/edit** | Alias for /editor: Open an editor to write a prompt |
| **/editor** | Open an editor to write a prompt |
| **/editor-model** | Switch the Editor Model to a new LLM |
| **/exit** | Exit the application |
| **/git** | Run a git command (output excluded from chat) |
| **/help** | Ask questions about aider |
| **/lint** | Lint and fix in-chat files or all dirty files if none in chat |
| **/load** | Load and execute commands from a file |
| **/ls** | List all known files and indicate which are included in the chat session |
| **/map** | Print out the current repository map |
| **/map-refresh** | Force a refresh of the repository map |
| **/model** | Switch the Main Model to a new LLM |
| **/models** | Search the list of available models |
| **/multiline-mode** | Toggle multiline mode (swaps behavior of Enter and Meta+Enter) |
| **/ok** | Alias for `/code Ok, please go ahead and make those changes.` (any args are appended) |
| **/paste** | Paste image/text from the clipboard into the chat. Optionally provide a name for the image. |
| **/quit** | Exit the application |
| **/read-only** | Add files to the chat that are for reference only, or turn added files to read-only |
| **/reasoning-effort** | Set the reasoning effort level (values: number or low/medium/high depending on model) |
| **/report** | Report a problem by opening a GitHub Issue |
| **/reset** | Drop all files and clear the chat history |
| **/run** | Run a shell command and optionally add the output to the chat (alias: !) |
| **/save** | Save commands to a file that can reconstruct the current chat session’s files |
| **/settings** | Print out the current settings |
| **/test** | Run a shell command and add the output to the chat on non-zero exit code |
| **/think-tokens** | Set the thinking token budget, eg: 8096, 8k, 10.5k, 0.5M, or 0 to disable. |
| **/tokens** | Report on the number of tokens used by the current chat context |
| **/undo** | Undo the last git commit if it was done by aider |
| **/voice** | Record and transcribe voice input |
| **/weak-model** | Switch the Weak Model to a new LLM |
| **/web** | Scrape a webpage, convert to markdown and send in a message |

You can easily re-send commands or messages.
Use the up arrow ⬆ to scroll back
or CONTROL-R to search your message history.

## Entering multi-line chat messages

You can send long, multi-line messages in the chat in a few ways:

* Paste a multi-line message directly into the chat.
* Enter `{` alone on the first line to start a multiline message and `}` alone on the last line to end it.
  + Or, start with `{tag` (where “tag” is any sequence of letters/numbers) and end with `tag}`. This is useful when you need to include closing braces `}` in your message.
* Use Meta-ENTER to start a new line without sending the message (Esc+ENTER in some environments).
* Use `/paste` to paste text from the clipboard into the chat.
* Use the `/editor` command (or press `Ctrl-X Ctrl-E` if your terminal allows) to open your editor to create the next chat message. See [editor configuration docs](/docs/config/editor.html) for more info.
* Use multiline-mode, which swaps the function of Meta-Enter and Enter, so that Enter inserts a newline, and Meta-Enter submits your command. To enable multiline mode:
  + Use the `/multiline-mode` command to toggle it during a session.
  + Use the `--multiline` switch.

Example with a tag:

```
{python
def hello():
    print("Hello}")  # Note: contains a brace
python}
```

People often ask for SHIFT-ENTER to be a soft-newline.
Unfortunately there is no portable way to detect that keystroke in terminals.

## Interrupting with CONTROL-C

It’s always safe to use Control-C to interrupt aider if it isn’t providing a useful response. The partial response remains in the conversation, so you can refer to it when you reply to the LLM with more information or direction.

## Keybindings

The interactive prompt is built with [prompt-toolkit](https://github.com/prompt-toolkit/python-prompt-toolkit) which provides emacs and vi keybindings.

### Emacs

* `Up Arrow` : Move up one line in the current message.
* `Down Arrow` : Move down one line in the current message.
* `Ctrl-Up` : Scroll back through previously sent messages.
* `Ctrl-Down` : Scroll forward through previously sent messages.
* `Ctrl-A` : Move cursor to the start of the line.
* `Ctrl-B` : Move cursor back one character.
* `Ctrl-D` : Delete the character under the cursor.
* `Ctrl-E` : Move cursor to the end of the line.
* `Ctrl-F` : Move cursor forward one character.
* `Ctrl-K` : Delete from the cursor to the end of the line.
* `Ctrl-L` : Clear the screen.
* `Ctrl-N` : Move down to the next history entry.
* `Ctrl-P` : Move up to the previous history entry.
* `Ctrl-R` : Reverse search in command history.
* `Ctrl-X Ctrl-E` : Open the current input in an external editor
* `Ctrl-Y` : Paste (yank) text that was previously cut.

### Vi

To use vi/vim keybindings, run aider with the `--vim` switch.

* `Up Arrow` : Move up one line in the current message.
* `Down Arrow` : Move down one line in the current message.
* `Ctrl-Up` : Scroll back through previously sent messages.
* `Ctrl-Down` : Scroll forward through previously sent messages.
* `Esc` : Switch to command mode.
* `i` : Switch to insert mode.
* `a` : Move cursor one character to the right and switch to insert mode.
* `A` : Move cursor to the end of the line and switch to insert mode.
* `I` : Move cursor to the beginning of the line and switch to insert mode.
* `h` : Move cursor one character to the left.
* `j` : Move cursor down one line.
* `k` : Move cursor up one line.
* `l` : Move cursor one character to the right.
* `w` : Move cursor forward one word.
* `b` : Move cursor backward one word.
* `0` : Move cursor to the beginning of the line.
* `$` : Move cursor to the end of the line.
* `x` : Delete the character under the cursor.
* `dd` : Delete the current line.
* `u` : Undo the last change.
* `Ctrl-R` : Redo the last undone change.

---
title: "Warp: Full Terminal Use (agent on a live PTY)"
source_url: "https://docs.warp.dev/agent-platform/capabilities/full-terminal-use/"
source_type: docs
fetched: 2026-06-01
topic: prior-art
tags: ["warp", "agent-mode", "pty", "live-buffer", "prompts", "takeover", "interactive"]
summary: "Warpエージェントが対話PTYに接続し、ライブの端末バッファを読み、コマンド書込み・プロンプト応答・対話アプリ操作を行い、人へ操作権を返す仕組みのドキュメント。"
relevance: "1個の対話PTYを握りバッファを読む/キーを流す/プロンプトに応答する、まさに我々の構想と同一の製品実装。状態追跡と制御受渡しの設計が直接効く。"
chars: 37863
---

[Skip to content](#_top)

For the complete documentation in markdown, see [llms.txt](/llms.txt).
Markdown versions of each page are available by appending .md to any URL.

[Warp](https://www.warp.dev)

* [Terminal](/)
* [Agents](/agent-platform/)
* [Reference](/reference/)
* [API](/api)
* [Changelog](/changelog/2026/)
* [Support & Community](/support-and-community/)
* [Enterprise](/enterprise/)
* [Guides](/guides/)

[GitHub](https://github.com/warpdotdev)

  Select theme   DarkLightAuto

Search  `CtrlK`

Cancel

Ask

Ask a question

What do you want to know about Warp?

Powered by [kapa.ai](https://kapa.ai)

Protected by reCAPTCHA

* [Terminal](/)
* [Agents](/agent-platform/)
* [Reference](/reference/)
* [API](/api)
* [Changelog](/changelog/2026/)
* [Support & Community](/support-and-community/)
* [Enterprise](/enterprise/)
* [Guides](/guides/)

* Getting started
  + [Agents overview](/agent-platform/)
  + [Agents in Warp](/agent-platform/getting-started/agents-in-warp/)
  + [Agent FAQs](/agent-platform/getting-started/faqs/)
* Warp Agents
  + [Warp Agents overview](/agent-platform/local-agents/overview/)
  + Capabilities
    - [Overview](/agent-platform/capabilities/)
    - [Slash commands](/agent-platform/capabilities/slash-commands/)
    - [Skills](/agent-platform/capabilities/skills/)
    - [Planning](/agent-platform/capabilities/planning/)
    - [Task lists](/agent-platform/capabilities/task-lists/)
    - [Rules](/agent-platform/capabilities/rules/)
    - [Agent notifications](/agent-platform/capabilities/agent-notifications/)
    - [Full terminal use](/agent-platform/capabilities/full-terminal-use/)
    - [Computer use](/agent-platform/capabilities/computer-use/)
    - [Codebase Context](/agent-platform/capabilities/codebase-context/)
    - [Profiles & permissions](/agent-platform/capabilities/agent-profiles-permissions/)
    - [Web search](/agent-platform/capabilities/web-search/)
    - [Session sharing](/agent-platform/local-agents/session-sharing/)
    - [Cloud-synced conversations](/agent-platform/local-agents/cloud-conversations/)
  + Interacting with agents
    - [Overview](/agent-platform/local-agents/interacting-with-agents/)
    - [Terminal and Agent modes](/agent-platform/local-agents/interacting-with-agents/terminal-and-agent-modes/)
    - [Conversation forking](/agent-platform/local-agents/interacting-with-agents/conversation-forking/)
    - [Code diffs](/agent-platform/local-agents/code-diffs/)
    - [Voice](/agent-platform/local-agents/interacting-with-agents/voice/)
  + Agent context
    - [Overview](/agent-platform/local-agents/agent-context/)
    - [Blocks as context](/agent-platform/local-agents/agent-context/blocks-as-context/)
    - [Images as context](/agent-platform/local-agents/agent-context/images-as-context/)
    - [URLs as context](/agent-platform/local-agents/agent-context/urls-as-context/)
    - [Selection as context](/agent-platform/local-agents/agent-context/selection-as-context/)
    - [Using @ to add context](/agent-platform/local-agents/agent-context/using-to-add-context/)
    - [Model Context Protocol (MCP)](/agent-platform/capabilities/mcp/)
  + Inference & providers
    - [Model choice](/agent-platform/inference/model-choice/)
    - [Bring Your Own API Key](/agent-platform/inference/bring-your-own-api-key/)
    - [Custom inference endpoint](/agent-platform/inference/custom-inference-endpoint/)
  + [Interactive code review](/agent-platform/local-agents/interactive-code-review/)
  + [Active AI recommendations](/agent-platform/local-agents/active-ai/)
  + [Generate (Legacy)](/agent-platform/local-agents/generate/)
* Third-Party CLI Agents
  + [Overview](/agent-platform/cli-agents/overview/)
  + [Claude Code](/agent-platform/cli-agents/claude-code/)
  + [Codex](/agent-platform/cli-agents/codex/)
  + [OpenCode](/agent-platform/cli-agents/opencode/)
  + [Rich input editor](/agent-platform/cli-agents/rich-input/)
  + [Remote Control](/agent-platform/cli-agents/remote-control/)
* Oz Cloud Agents & Orchestration
  + [Cloud agents overview](/agent-platform/cloud-agents/overview/)
  + [Quickstart](/agent-platform/cloud-agents/quickstart/)
  + [Oz platform](/agent-platform/cloud-agents/platform/)
  + Triggers
    - [Overview](/agent-platform/cloud-agents/triggers/)
    - [Quickstart](/agent-platform/cloud-agents/triggers/scheduled-agents-quickstart/)
    - [Scheduled agents](/agent-platform/cloud-agents/triggers/scheduled-agents/)
  + Integrations
    - [Overview](/agent-platform/cloud-agents/integrations/)
    - [Quickstart](/agent-platform/cloud-agents/integrations/quickstart/)
    - [Slack](/agent-platform/cloud-agents/integrations/slack/)
    - [Linear](/agent-platform/cloud-agents/integrations/linear/)
    - GitHub Actions
      * [Overview](/agent-platform/cloud-agents/integrations/github-actions/)
      * [Quickstart](/agent-platform/cloud-agents/integrations/quickstart-github-actions/)
    - [Azure DevOps](/agent-platform/cloud-agents/integrations/azure-devops/)
    - [Bitbucket](/agent-platform/cloud-agents/integrations/bitbucket/)
    - [GitLab](/agent-platform/cloud-agents/integrations/gitlab/)
    - [AWS, GCP, and other cloud providers](/agent-platform/cloud-agents/integrations/cloud-providers/)
    - [Demo: Issue triage bot](/agent-platform/cloud-agents/integrations/demo-issue-triage-bot/)
  + [Environments](/agent-platform/cloud-agents/environments/)
  + [Managing cloud agents](/agent-platform/cloud-agents/managing-cloud-agents/)
  + Orchestration
    - [Multi-agent orchestration](/agent-platform/cloud-agents/orchestration/)
    - [Running orchestrated agents](/agent-platform/cloud-agents/orchestration/multi-agent-runs/)
  + [Agent identities](/agent-platform/cloud-agents/agents/)
  + [Oz web app](/agent-platform/cloud-agents/oz-web-app/)
  + [Skills as agents](/agent-platform/cloud-agents/skills-as-agents/)
  + [Viewing cloud agent runs](/agent-platform/cloud-agents/viewing-cloud-agent-runs/)
  + Handoff
    - [Overview](/agent-platform/cloud-agents/handoff/)
    - [Local to cloud](/agent-platform/cloud-agents/handoff/local-to-cloud/)
    - [Cloud to cloud](/agent-platform/cloud-agents/handoff/cloud-to-cloud/)
    - [Snapshots](/agent-platform/cloud-agents/handoff/snapshots/)
  + [Secrets](/agent-platform/cloud-agents/secrets/)
  + Harnesses
    - [Overview](/agent-platform/cloud-agents/harnesses/)
    - [Warp Agent](/agent-platform/cloud-agents/harnesses/warp-agent/)
    - [Claude Code](/agent-platform/cloud-agents/harnesses/claude-code/)
    - [Codex](/agent-platform/cloud-agents/harnesses/codex/)
    - [Authentication](/agent-platform/cloud-agents/harnesses/authentication/)
  + [MCP servers](/agent-platform/cloud-agents/mcp/)
  + [Deployment patterns](/agent-platform/cloud-agents/deployment-patterns/)
  + [Warp-hosted agents](/agent-platform/cloud-agents/warp-hosting/)
  + Self-hosting
    - [Overview](/agent-platform/cloud-agents/self-hosting/)
    - [Quickstart](/agent-platform/cloud-agents/self-hosting/quickstart/)
    - [Managed: Docker](/agent-platform/cloud-agents/self-hosting/managed-docker/)
    - [Managed: Kubernetes](/agent-platform/cloud-agents/self-hosting/managed-kubernetes/)
    - [Managed: Direct](/agent-platform/cloud-agents/self-hosting/managed-direct/)
    - [Unmanaged](/agent-platform/cloud-agents/self-hosting/unmanaged/)
    - [Monitoring](/agent-platform/cloud-agents/self-hosting/monitoring/)
    - [Self-hosted worker reference](/agent-platform/cloud-agents/self-hosting/reference/)
    - [Security and networking](/agent-platform/cloud-agents/self-hosting/security-and-networking/)
    - [Troubleshooting](/agent-platform/cloud-agents/self-hosting/troubleshooting/)
  + [Access, billing, and identity](/agent-platform/cloud-agents/team-access-billing-and-identity/)
  + [Cloud agent FAQs](/agent-platform/cloud-agents/faqs/)
* Memory (Research Preview)
  + [Agent Memory](/agent-platform/agent-memory/)

[GitHub](https://github.com/warpdotdev)

  Select theme   DarkLightAuto

On this page

* [Overview](#_top)
* [Overview](#overview)
* [How Full Terminal Use works](#how-full-terminal-use-works)
  + [Configuring agent permissions and autonomy](#configuring-agent-permissions-and-autonomy)
  + [Credits usage](#credits-usage)
* [Example workflows](#example-workflows)

## On this page

* [Overview](#_top)
* [Overview](#overview)
* [How Full Terminal Use works](#how-full-terminal-use-works)
  + [Configuring agent permissions and autonomy](#configuring-agent-permissions-and-autonomy)
  + [Credits usage](#credits-usage)
* [Example workflows](#example-workflows)
[Edit page](https://github.com/warpdotdev/docs/edit/main/src/content/docs/agent-platform/capabilities/full-terminal-use.mdx)[Join our Slack community](https://go.warp.dev/join-preview)

Last updated May 27, 2026

© 2026 Warp

Agents > Capabilities

# Full Terminal Use

Copy

Copy page

Copy page as Markdown for LLMs

View as Markdown ↗

View this page as plain text

 [Open in ChatGPT ↗

Ask ChatGPT about this page](https://chatgpt.com/?q=Read%20https%3A%2F%2Fdocs.warp.dev%2Fagent-platform%2Fcapabilities%2Ffull-terminal-use%2F.%20I%20want%20to%20ask%20questions%20about%20it.)  [Open in Claude ↗

Ask Claude about this page](https://claude.ai/new?q=Read%20https%3A%2F%2Fdocs.warp.dev%2Fagent-platform%2Fcapabilities%2Ffull-terminal-use%2F.%20I%20want%20to%20ask%20questions%20about%20it.)

Export as PDF

Save or print this page

Copied!

 # Full Terminal Use
import { Tabs, TabItem } from '@astrojs/starlight/components';
import VideoEmbed from '@components/VideoEmbed.astro';
Full Terminal Use lets Warp's agent operate directly inside interactive terminal applications like database shells, debuggers, text editors, and long-running servers. The agent can see the live terminal buffer, write commands, respond to prompts, and hand control back to you at any time.
The agent can see the live terminal buffer (terminal state), write to the PTY to run commands, respond to prompts, and continue working inside the running process while you stay in control.
<VideoEmbed url="https://youtu.be/gBdehHrtb94?si=-vvl4ipGwwoWxEJq" />
## Overview
With Full Terminal Use, Warp’s agent can attach to interactive tools like `psql`, `vim`, `python`, `gdb`, `top`, or your dev server, read the terminal output as it changes, and interact with the application as if you were typing.
You can either ask the agent to start an interactive program, or you can start it yourself and then tag the agent in once the tool is already running. In both cases, the agent sees the same terminal buffer (and PTY session) you do and can act on it.
## How Full Terminal Use works
#### Start an interactive command
You can either ask the agent to run an interactive command, or start one manually and then tag the agent in:
\* \*\*Ask the agent to start an interactive tool\*\*
\* Example:
\* “Open a Postgres shell and help me inspect the orders table.”
\* “Start the dev server and debug this 500 error.”
\* \*\*Or start the command yourself, then tag the agent in\*\*
\* Example:
\* If you’ve already launched an interactive tool (for example `psql` or `npm run dev`), you can bring the agent into the running session using the "Use Agent" button in the terminal footer or via `CMD + I` .
<figure>
![Option to tag the agent into a running command.](../../../../assets/agent-platform/full-terminal-use-tag-hint.png)
<figcaption>Option to tag the agent into a running command.</figcaption>
</figure>
\* Once the agent is tagged in, you can follow up with natural-language requests such as:
“Watch this process and help debug the error on the /session endpoint.”
\* Warp then attaches the agent to the active PTY so it can see the current terminal buffer and propose actions inside the session.
<VideoEmbed url="https://www.loom.com/share/bcedc521071a4b6a9bbcf74b5156f903" title="Tagging in the agent." />
<figure>
![Running a build command.](../../../../assets/agent-platform/full-terminal-use-build.png)
<figcaption>Running a build command.</figcaption>
</figure>
<figure>
![Tagging in the Agent to monitor the dev server.](../../../../assets/agent-platform/full-terminal-use-dev-monitor.png)
<figcaption>Tagging in the Agent to monitor the dev server.</figcaption>
</figure>
Warp attaches the agent to the running command so it can see and control the terminal buffer.
#### Agents propose actions inside the session
Once attached, you can continue using natural language and the agent turns your requests into concrete terminal actions. For example, in a Postgres shell:
\* You: “Show me all the tables and describe the orders table.”
\* Agent: proposes running commands like: `\dt` --> `\d+ orders`
In the UI, you’ll see a request to:
\* Run a specific command
\* Optionally enable auto-approval for similar commands in this session
#### Switching control between user and the agent
You can swap control at any time.
\*\*Take over\*\*
\* Use the Takeover control to stop the agent from typing or performing any actions.
\* The shell stays open, and you can type directly into the same session.
<figure>
![Option to take over from agent in the footer.](../../../../assets/agent-platform/full-terminal-use-takeover.png)
<figcaption>Option to take over from agent in the footer.</figcaption>
</figure>
\*\*Hand back control\*\*
\* When you’re ready for the agent to continue, click the control again.
\* The agent resumes where you left off, with full access to the current terminal state.
<figure>
![Option to hand-off to the agent in the conversation footer.](../../../../assets/agent-platform/full-terminal-use-handoff.png)
<figcaption>Option to hand-off to the agent in the conversation footer.</figcaption>
</figure>
This makes it easy to:
\* Let the agent do mechanical work (paging output, trying variants of a command)
\* Step in for delicate or security-sensitive actions
\* Then let the agent continue once the critical step is done
#### Long-running commands in terminal vs agent view
The behavior differs based on where you start the long-running command:
<Tabs>
<TabItem label="From terminal view">
1. Run an interactive command (e.g., `python`, `psql`)
2. Press `⌘↩` (macOS) or `Ctrl+Shift+Enter` (Windows/Linux), or use `⌘I` (macOS) / `Ctrl+I` (Windows/Linux), to tag in the agent
3. The input switches to Agent Mode with full controls
4. When you exit, an agent conversation block appears in your terminal block list
5. Click the block to reopen the full conversation with your LRC interaction context
</TabItem>
<TabItem label="From agent view">
1. The agent runs an interactive command as part of your conversation
2. Use `⌘↩` (macOS) or `Ctrl+Shift+Enter` (Windows/Linux) to tag in if the agent isn't already interacting
3. The UI stays the same since you're already in agent view
4. When you exit, the interaction remains part of your conversation. No separate block is created in the terminal block list
5. Commands run in agent view are automatically included as context
</TabItem>
</Tabs>
:::note
You can also use `CMD + I` (macOS) or `CTRL + I` (Windows/Linux) to toggle agent control in either view.
:::
#### Showing and hiding agent responses
Warp gives you control over how much agent output appears in Full Terminal Use.
\*\*Toggle visibility\*\*
Use the `Hide responses` or `Show responses` button or `CMD + G` in the interactive command footer to switch between showing all agent output or hiding it from the terminal view.
Note that this only affects the agent's messages and proposals; your terminal state and command output remain unchanged.
\*\*Behavior when hidden\*\*
\* When agent responses are hidden, your own agent requests automatically dismiss after \*\*4 seconds\*\* to keep the terminal clear.
\* You can also manually dismiss any user query at any time by hovering over it and clicking the X.
<VideoEmbed url="https://www.loom.com/share/c639fb4ab33343a39037b2083c66858a" />
---
### Configuring agent permissions and autonomy
You control how much autonomy the agent has when interacting with the terminal.
#### Session-level approvals
Each time the agent wants to take an action inside an interactive shell, you’ll see the agent’s reasoning, a brief explanation, and the proposed command. From there you can:
\* Allow the command once (for example by approving it or pressing `ENTER`).
\* Turn on auto-approval for similar commands in this session (for example with `CMD + SHIFT + I`).
\* Refine the request with `CTRL + C`, which clears the proposed action and lets you follow up with a different query.
\* Take over manually with `CMD + I`, which stops the agent from issuing any further PTY writes until you hand control back.
<figure>
![Allow, Refine, or Take over an agent response.](../../../../assets/agent-platform/allow-refine-takeover.png)
<figcaption>Allow, Refine, or Take over an agent response.</figcaption>
</figure>
![Ability to accept or auto-approve future interactions.](../../../../assets/agent-platform/full-terminal-use-options-2.png)
This lets you tighten or loosen control for the current task:
\* For exploratory work, use \*\*Always allow\*\* to reduce friction.
\* For production systems or sensitive operations, use \*\*Allow once\*\* and review each step.
#### Global permission settings
You can configure global defaults from your [Agent Profiles & Permissions](/agent-platform/capabilities/agent-profiles-permissions/) settings:
\* \*\*Ask on first write\*\*: The first write to a shell process requires approval. After that, all subsequent writes for that specific process/command will be approved.
\* \*\*Always ask\*\*: Every write to the shell process from the agent requires your explicit approval.
\* \*\*Always allow\*\*: The agent can write to the shell process without prompting you each time.
These settings apply to every session that uses Full Terminal Use. You can still override them on a per-session basis when prompted. For example, you can enable \*\*auto-approval\*\* for similar commands in the current session using the fast-forward control, or switch to a \*\*different AI profile\*\* with its own permission settings for that conversation.
:::note
\*\*Note\*\*: All [Secret Redaction](/support-and-community/privacy-and-security/secret-redaction/) features still apply during Full Terminal Use, so sensitive values in your environment or output remain protected.
:::
### Credits usage
All AI interactions from Full Terminal Use consume [credits](/support-and-community/plans-and-billing/credits/), including understanding your natural language requests.
Credits are consumed in a similar way as other Oz actions that use the same model and a similar context size.
\*\*Interactive sessions can consume more credits if:\*\*
\* The agent runs many commands in an interactive shell on your behalf.
\* There is a significant amount of terminal output to read and summarize.
\*\*To manage credit usage:\*\*
\* Use tighter scopes:
\* “Describe just the orders table.” instead of “Explain the entire database.”
\* Pause autonomy for high-volume tasks with copious terminal output:
\* Take over manual control when running large batches or long logs.
\* Use stricter permissions:
\* Set global permissions to "Ask on first write" or "Always ask", then approve only what you need.
:::note
To learn more about what goes into a credit and how to get more value from AI usage in Warp, see: [\_Getting the most out of credits in Warp\_](https://www.warp.dev/blog/warp-ai-requests).
:::
## Example workflows
Here’s a demo from one of our engineers, Maggie, that walks through a couple of Full Terminal Use examples.
<VideoEmbed url="https://www.loom.com/share/d47ee09153df417983df65a339a9d6f2" />
Below are some common interactive tools where Full Terminal Use is particularly useful: database shells (Postgres, MySQL, SQLite), debuggers such as gdb, language-specific REPLs like python or node, text editors and file explorers, and long-running dev servers or monitoring tools such as top and htop.
<table><thead><tr><th width="158.5418701171875">Tool</th><th width="326.64208984375">Example tasks</th><th>Agents can...</th></tr></thead><tbody><tr><td><strong>Database shells (REPLs)</strong><br /><br />e.g. <code>psql</code>, <code>mysql</code>, <code>sqlite</code>, etc.</td><td><ul><li>“List all tables and describe the users and orders tables.”</li><li>“Create a new table to store archived user sessions.”</li><li>“Show me all rows in orders from the last 30 days, grouped by status.”</li><li>“Generate and run a query that finds the top 10 customers by revenue.”</li></ul></td><td><ul><li>Navigate <code>\d</code>, <code>\dt</code>, <code>DESCRIBE</code>, etc.</li><li>Write and execute SQL queries</li><li>Summarize results in plain language</li></ul></td></tr><tr><td><strong>Text editors</strong><br /><br />e.g. <code>vim</code>, <code>nano</code>, etc.</td><td><ul><li>“Open this file in vim and add a Markdown header and a boilerplate section.”</li><li>“Insert a docstring above this function explaining what it does.”</li><li>“Generate a CSS utility class block and insert it in this file.”</li></ul></td><td><ul><li>Navigate within the editor using keystrokes</li><li>Insert, edit, and delete text</li><li>Save and quit when done</li></ul></td></tr><tr><td><strong>Python REPLs</strong><br /><br />e.g. <code>python</code>, <code>ipython</code></td><td><ul><li>“Start a Python REPL and define a function that calculates a moving average.”</li><li>“Write a unit test for this function and run it.”</li><li>“Plot x from 0 to 10 and y = sin(x).”</li></ul></td><td><ul><li>Import modules</li><li>Define functions and classes</li><li>Run tests and small scripts</li><li>Print or summarize results back to you</li></ul></td></tr><tr><td><strong>Debuggers</strong><br /><br />e.g. <code>gdb</code>, <code>lldb</code>, language-specific debuggers</td><td><ul><li>“Start gdb for this binary and set a breakpoint on <code>handle\_request</code>.”</li><li>“Run until the breakpoint, then show the stack and local variables.”</li><li>“Inspect this pointer and tell me if it looks invalid.”</li></ul></td><td><ul><li>Issue debugger commands (break, run, next, continue, bt, etc.)</li><li>Walk through execution step by step</li><li>Summarize relevant state so you don’t have to remember every command</li></ul></td></tr><tr><td><strong>Long-running servers and services</strong><br /><br />e.g. <code>npm run dev</code>, <code>uvicorn</code>, Rails servers, etc</td><td><ul><li>“Run the dev server and debug the internal server error on /session.”</li><li>“Send a sample request to this endpoint and explain the failure.”</li><li>“Kill the server once you identify the error and propose a code diff.”</li></ul></td><td><ul><li>Watch server logs in real time</li><li>Notice new errors as they appear</li><li>Stop the server when appropriate</li><li>Propose code changes (for example, via a diff) based on what it observes</li></ul></td></tr><tr><td><strong>Version control workflows</strong><br /><br />e.g. <code>git rebase -i</code>, complex git commands</td><td><ul><li>“Interactively rebase master onto <code>feature-branch</code> to squash these commits into one.”</li><li>“Resolve these merge conflicts and ensure tests pass.”</li></ul></td><td><ul><li>Navigate interactive rebase prompts</li><li>Edit commit messages</li><li>Apply conflict resolutions you approve</li></ul></td></tr><tr><td><strong>Cloud provider CLIs</strong><br /><br />e.g. <code>gcloud</code>, <code>aws</code>, <code>az</code>, etc.</td><td><ul><li>“Use gcloud to create a new Kubernetes cluster with these settings.”</li><li>“Provision a new RDS instance for staging and show me the connection details.”</li></ul></td><td><ul><li>Walk through multi-step CLI workflows</li><li>Handle prompts and confirmations</li><li>Summarize the resulting resources</li></ul></td></tr></tbody></table>

Full Terminal Use means Warp's agents can interact with active terminal apps to monitor live output and run commands.

Full Terminal Use lets Warp’s agent operate directly inside interactive terminal applications like database shells, debuggers, text editors, and long-running servers. The agent can see the live terminal buffer, write commands, respond to prompts, and hand control back to you at any time.

The agent can see the live terminal buffer (terminal state), write to the PTY to run commands, respond to prompts, and continue working inside the running process while you stay in control.

![YouTube video](https://i.ytimg.com/vi/gBdehHrtb94/sddefault.jpg)

## Overview

[Section titled “Overview”](#overview)

With Full Terminal Use, Warp’s agent can attach to interactive tools like `psql`, `vim`, `python`, `gdb`, `top`, or your dev server, read the terminal output as it changes, and interact with the application as if you were typing.

You can either ask the agent to start an interactive program, or you can start it yourself and then tag the agent in once the tool is already running. In both cases, the agent sees the same terminal buffer (and PTY session) you do and can act on it.

## How Full Terminal Use works

[Section titled “How Full Terminal Use works”](#how-full-terminal-use-works)

#### Start an interactive command

[Section titled “Start an interactive command”](#start-an-interactive-command)

You can either ask the agent to run an interactive command, or start one manually and then tag the agent in:

* **Ask the agent to start an interactive tool**
  + Example:
    - “Open a Postgres shell and help me inspect the orders table.”
    - “Start the dev server and debug this 500 error.”
* **Or start the command yourself, then tag the agent in**
  + Example:

    - If you’ve already launched an interactive tool (for example `psql` or `npm run dev`), you can bring the agent into the running session using the “Use Agent” button in the terminal footer or via `CMD + I` .

    ![Option to tag the agent into a running command.](/_astro/full-terminal-use-tag-hint.DM6M9wdZ_Z2r9k8i.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

    Option to tag the agent into a running command.

    - Once the agent is tagged in, you can follow up with natural-language requests such as:

      “Watch this process and help debug the error on the /session endpoint.”
    - Warp then attaches the agent to the active PTY so it can see the current terminal buffer and propose actions inside the session.

![Running a build command.](/_astro/full-terminal-use-build.-vzlHVBj_Z1gqnPm.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

Running a build command.

![Tagging in the Agent to monitor the dev server.](/_astro/full-terminal-use-dev-monitor.DwZYeczz_1R0Kxt.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

Tagging in the Agent to monitor the dev server.

Warp attaches the agent to the running command so it can see and control the terminal buffer.

#### Agents propose actions inside the session

[Section titled “Agents propose actions inside the session”](#agents-propose-actions-inside-the-session)

Once attached, you can continue using natural language and the agent turns your requests into concrete terminal actions. For example, in a Postgres shell:

* You: “Show me all the tables and describe the orders table.”
* Agent: proposes running commands like: `\dt` —> `\d+ orders`

In the UI, you’ll see a request to:

* Run a specific command
* Optionally enable auto-approval for similar commands in this session

#### Switching control between user and the agent

[Section titled “Switching control between user and the agent”](#switching-control-between-user-and-the-agent)

You can swap control at any time.

**Take over**

* Use the Takeover control to stop the agent from typing or performing any actions.
* The shell stays open, and you can type directly into the same session.

![Option to take over from agent in the footer.](/_astro/full-terminal-use-takeover.CXmq55EP_ZbcbAV.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

Option to take over from agent in the footer.

**Hand back control**

* When you’re ready for the agent to continue, click the control again.
* The agent resumes where you left off, with full access to the current terminal state.

![Option to hand-off to the agent in the conversation footer.](/_astro/full-terminal-use-handoff.Dg0srGBm_2s0hhm.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

Option to hand-off to the agent in the conversation footer.

This makes it easy to:

* Let the agent do mechanical work (paging output, trying variants of a command)
* Step in for delicate or security-sensitive actions
* Then let the agent continue once the critical step is done

#### Long-running commands in terminal vs agent view

[Section titled “Long-running commands in terminal vs agent view”](#long-running-commands-in-terminal-vs-agent-view)

The behavior differs based on where you start the long-running command:

* [From terminal view](#tab-panel-630)
* [From agent view](#tab-panel-631)

1. Run an interactive command (e.g., `python`, `psql`)
2. Press `⌘↩` (macOS) or `Ctrl+Shift+Enter` (Windows/Linux), or use `⌘I` (macOS) / `Ctrl+I` (Windows/Linux), to tag in the agent
3. The input switches to Agent Mode with full controls
4. When you exit, an agent conversation block appears in your terminal block list
5. Click the block to reopen the full conversation with your LRC interaction context

1. The agent runs an interactive command as part of your conversation
2. Use `⌘↩` (macOS) or `Ctrl+Shift+Enter` (Windows/Linux) to tag in if the agent isn’t already interacting
3. The UI stays the same since you’re already in agent view
4. When you exit, the interaction remains part of your conversation. No separate block is created in the terminal block list
5. Commands run in agent view are automatically included as context

Note

You can also use `CMD + I` (macOS) or `CTRL + I` (Windows/Linux) to toggle agent control in either view.

#### Showing and hiding agent responses

[Section titled “Showing and hiding agent responses”](#showing-and-hiding-agent-responses)

Warp gives you control over how much agent output appears in Full Terminal Use.

**Toggle visibility**

Use the `Hide responses` or `Show responses` button or `CMD + G` in the interactive command footer to switch between showing all agent output or hiding it from the terminal view.

Note that this only affects the agent’s messages and proposals; your terminal state and command output remain unchanged.

**Behavior when hidden**

* When agent responses are hidden, your own agent requests automatically dismiss after **4 seconds** to keep the terminal clear.
* You can also manually dismiss any user query at any time by hovering over it and clicking the X.

---

### Configuring agent permissions and autonomy

[Section titled “Configuring agent permissions and autonomy”](#configuring-agent-permissions-and-autonomy)

You control how much autonomy the agent has when interacting with the terminal.

#### Session-level approvals

[Section titled “Session-level approvals”](#session-level-approvals)

Each time the agent wants to take an action inside an interactive shell, you’ll see the agent’s reasoning, a brief explanation, and the proposed command. From there you can:

* Allow the command once (for example by approving it or pressing `ENTER`).
* Turn on auto-approval for similar commands in this session (for example with `CMD + SHIFT + I`).
* Refine the request with `CTRL + C`, which clears the proposed action and lets you follow up with a different query.
* Take over manually with `CMD + I`, which stops the agent from issuing any further PTY writes until you hand control back.

![Allow, Refine, or Take over an agent response.](/_astro/allow-refine-takeover.DQirdZqB_Z2ci4In.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

Allow, Refine, or Take over an agent response.

![Ability to accept or auto-approve future interactions.](/_astro/full-terminal-use-options-2.DF_SdCro_2gKxp3.webp?dpl=dpl_BavhFK2qgGMqxYU8eYe72bb1dPZM)

This lets you tighten or loosen control for the current task:

* For exploratory work, use **Always allow** to reduce friction.
* For production systems or sensitive operations, use **Allow once** and review each step.

#### Global permission settings

[Section titled “Global permission settings”](#global-permission-settings)

You can configure global defaults from your [Agent Profiles & Permissions](/agent-platform/capabilities/agent-profiles-permissions/) settings:

* **Ask on first write**: The first write to a shell process requires approval. After that, all subsequent writes for that specific process/command will be approved.
* **Always ask**: Every write to the shell process from the agent requires your explicit approval.
* **Always allow**: The agent can write to the shell process without prompting you each time.

These settings apply to every session that uses Full Terminal Use. You can still override them on a per-session basis when prompted. For example, you can enable **auto-approval** for similar commands in the current session using the fast-forward control, or switch to a **different AI profile** with its own permission settings for that conversation.

Note

**Note**: All [Secret Redaction](/support-and-community/privacy-and-security/secret-redaction/) features still apply during Full Terminal Use, so sensitive values in your environment or output remain protected.

### Credits usage

[Section titled “Credits usage”](#credits-usage)

All AI interactions from Full Terminal Use consume [credits](/support-and-community/plans-and-billing/credits/), including understanding your natural language requests.

Credits are consumed in a similar way as other Oz actions that use the same model and a similar context size.

**Interactive sessions can consume more credits if:**

* The agent runs many commands in an interactive shell on your behalf.
* There is a significant amount of terminal output to read and summarize.

**To manage credit usage:**

* Use tighter scopes:
  + “Describe just the orders table.” instead of “Explain the entire database.”
* Pause autonomy for high-volume tasks with copious terminal output:
  + Take over manual control when running large batches or long logs.
* Use stricter permissions:
  + Set global permissions to “Ask on first write” or “Always ask”, then approve only what you need.

Note

To learn more about what goes into a credit and how to get more value from AI usage in Warp, see: [*Getting the most out of credits in Warp*](https://www.warp.dev/blog/warp-ai-requests).

## Example workflows

[Section titled “Example workflows”](#example-workflows)

Here’s a demo from one of our engineers, Maggie, that walks through a couple of Full Terminal Use examples.

Below are some common interactive tools where Full Terminal Use is particularly useful: database shells (Postgres, MySQL, SQLite), debuggers such as gdb, language-specific REPLs like python or node, text editors and file explorers, and long-running dev servers or monitoring tools such as top and htop.

| Tool | Example tasks | Agents can… |
| --- | --- | --- |
| **Database shells (REPLs)**  e.g. `psql`, `mysql`, `sqlite`, etc. | * “List all tables and describe the users and orders tables.” * “Create a new table to store archived user sessions.” * “Show me all rows in orders from the last 30 days, grouped by status.” * “Generate and run a query that finds the top 10 customers by revenue.” | * Navigate `\d`, `\dt`, `DESCRIBE`, etc. * Write and execute SQL queries * Summarize results in plain language |
| **Text editors**  e.g. `vim`, `nano`, etc. | * “Open this file in vim and add a Markdown header and a boilerplate section.” * “Insert a docstring above this function explaining what it does.” * “Generate a CSS utility class block and insert it in this file.” | * Navigate within the editor using keystrokes * Insert, edit, and delete text * Save and quit when done |
| **Python REPLs**  e.g. `python`, `ipython` | * “Start a Python REPL and define a function that calculates a moving average.” * “Write a unit test for this function and run it.” * “Plot x from 0 to 10 and y = sin(x).” | * Import modules * Define functions and classes * Run tests and small scripts * Print or summarize results back to you |
| **Debuggers**  e.g. `gdb`, `lldb`, language-specific debuggers | * “Start gdb for this binary and set a breakpoint on `handle_request`.” * “Run until the breakpoint, then show the stack and local variables.” * “Inspect this pointer and tell me if it looks invalid.” | * Issue debugger commands (break, run, next, continue, bt, etc.) * Walk through execution step by step * Summarize relevant state so you don’t have to remember every command |
| **Long-running servers and services**  e.g. `npm run dev`, `uvicorn`, Rails servers, etc | * “Run the dev server and debug the internal server error on /session.” * “Send a sample request to this endpoint and explain the failure.” * “Kill the server once you identify the error and propose a code diff.” | * Watch server logs in real time * Notice new errors as they appear * Stop the server when appropriate * Propose code changes (for example, via a diff) based on what it observes |
| **Version control workflows**  e.g. `git rebase -i`, complex git commands | * “Interactively rebase master onto `feature-branch` to squash these commits into one.” * “Resolve these merge conflicts and ensure tests pass.” | * Navigate interactive rebase prompts * Edit commit messages * Apply conflict resolutions you approve |
| **Cloud provider CLIs**  e.g. `gcloud`, `aws`, `az`, etc. | * “Use gcloud to create a new Kubernetes cluster with these settings.” * “Provision a new RDS instance for staging and show me the connection details.” | * Walk through multi-step CLI workflows * Handle prompts and confirmations * Summarize the resulting resources |

[Previous
 Agent notifications](/agent-platform/capabilities/agent-notifications/)   [Next
 Computer use](/agent-platform/capabilities/computer-use/)

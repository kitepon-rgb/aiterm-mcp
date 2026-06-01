---
title: "Control Mode — tmux/tmux Wiki"
source_url: "https://github.com/tmux/tmux/wiki/Control-Mode"
source_type: docs
fetched: 2026-06-01
topic: backends
tags: ["tmux", "control-mode", "-CC", "protocol", "%begin", "%output", "notifications"]
summary: "tmux制御モード(-CC)のプロトコル仕様。%begin/%end/%errorのガード行、%output等の非同期通知、コマンド送受信の行ベース仕様。"
relevance: "端末エミュレーションせず1本のソケット越しにコマンド送出と出力読取を構造化できる。完了境界検出を %begin/%end ガードで決定論化する設計の直接の根拠。"
chars: 20509
---

[Skip to content](#start-of-content)

## Navigation Menu

Toggle navigation

[Sign in](/login?return_to=https%3A%2F%2Fgithub.com%2Ftmux%2Ftmux%2Fwiki%2FControl-Mode)

Appearance settings

* Platform

  + AI CODE CREATION
    - [GitHub CopilotWrite better code with AI](https://github.com/features/copilot)
    - [GitHub SparkBuild and deploy intelligent apps](https://github.com/features/spark)
    - [GitHub ModelsManage and compare prompts](https://github.com/features/models)
    - [MCP RegistryNewIntegrate external tools](https://github.com/mcp)
  + DEVELOPER WORKFLOWS
    - [ActionsAutomate any workflow](https://github.com/features/actions)
    - [CodespacesInstant dev environments](https://github.com/features/codespaces)
    - [IssuesPlan and track work](https://github.com/features/issues)
    - [Code ReviewManage code changes](https://github.com/features/code-review)
  + APPLICATION SECURITY
    - [GitHub Advanced SecurityFind and fix vulnerabilities](https://github.com/security/advanced-security)
    - [Code securitySecure your code as you build](https://github.com/security/advanced-security/code-security)
    - [Secret protectionStop leaks before they start](https://github.com/security/advanced-security/secret-protection)
  + EXPLORE
    - [Why GitHub](https://github.com/why-github)
    - [Documentation](https://docs.github.com)
    - [Blog](https://github.blog)
    - [Changelog](https://github.blog/changelog)
    - [Marketplace](https://github.com/marketplace)

  [View all features](https://github.com/features)
* Solutions

  + BY COMPANY SIZE
    - [Enterprises](https://github.com/enterprise)
    - [Small and medium teams](https://github.com/team)
    - [Startups](https://github.com/enterprise/startups)
    - [Nonprofits](https://github.com/solutions/industry/nonprofits)
  + BY USE CASE
    - [App Modernization](https://github.com/solutions/use-case/app-modernization)
    - [DevSecOps](https://github.com/solutions/use-case/devsecops)
    - [DevOps](https://github.com/solutions/use-case/devops)
    - [CI/CD](https://github.com/solutions/use-case/ci-cd)
    - [View all use cases](https://github.com/solutions/use-case)
  + BY INDUSTRY
    - [Healthcare](https://github.com/solutions/industry/healthcare)
    - [Financial services](https://github.com/solutions/industry/financial-services)
    - [Manufacturing](https://github.com/solutions/industry/manufacturing)
    - [Government](https://github.com/solutions/industry/government)
    - [View all industries](https://github.com/solutions/industry)

  [View all solutions](https://github.com/solutions)
* Resources

  + EXPLORE BY TOPIC
    - [AI](https://github.com/resources/articles?topic=ai)
    - [Software Development](https://github.com/resources/articles?topic=software-development)
    - [DevOps](https://github.com/resources/articles?topic=devops)
    - [Security](https://github.com/resources/articles?topic=security)
    - [View all topics](https://github.com/resources/articles)
  + EXPLORE BY TYPE
    - [Customer stories](https://github.com/customer-stories)
    - [Events & webinars](https://github.com/resources/events)
    - [Ebooks & reports](https://github.com/resources/whitepapers)
    - [Business insights](https://github.com/solutions/executive-insights)
    - [GitHub Skills](https://skills.github.com)
  + SUPPORT & SERVICES
    - [Documentation](https://docs.github.com)
    - [Customer support](https://support.github.com)
    - [Community forum](https://github.com/orgs/community/discussions)
    - [Trust center](https://github.com/trust-center)
    - [Partners](https://github.com/partners)

  [View all resources](https://github.com/resources)
* Open Source

  + COMMUNITY
    - [GitHub SponsorsFund open source developers](https://github.com/sponsors)
  + PROGRAMS
    - [Security Lab](https://securitylab.github.com)
    - [Maintainer Community](https://maintainers.github.com)
    - [Accelerator](https://github.com/accelerator)
    - [GitHub Stars](https://stars.github.com)
    - [Archive Program](https://archiveprogram.github.com)
  + REPOSITORIES
    - [Topics](https://github.com/topics)
    - [Trending](https://github.com/trending)
    - [Collections](https://github.com/collections)
* Enterprise

  + ENTERPRISE SOLUTIONS
    - [Enterprise platformAI-powered developer platform](https://github.com/enterprise)
  + AVAILABLE ADD-ONS
    - [GitHub Advanced SecurityEnterprise-grade security features](https://github.com/security/advanced-security)
    - [Copilot for BusinessEnterprise-grade AI features](https://github.com/features/copilot/copilot-business)
    - [Premium SupportEnterprise-grade 24/7 support](https://github.com/premium-support)
* [Pricing](https://github.com/pricing)

Search or jump to...

# Search code, repositories, users, issues, pull requests...

Search

Clear

[Search syntax tips](https://docs.github.com/search-github/github-code-search/understanding-github-code-search-syntax)

# Provide feedback

We read every piece of feedback, and take your input very seriously.

[ ]
Include my email address so I can be contacted

Cancel
 Submit feedback

# Saved searches

## Use saved searches to filter your results more quickly

Cancel
 Create saved search

[Sign in](/login?return_to=https%3A%2F%2Fgithub.com%2Ftmux%2Ftmux%2Fwiki%2FControl-Mode)

[Sign up](/signup?ref_cta=Sign+up&ref_loc=header+logged+out&ref_page=%2F%3Cuser-name%3E%2F%3Crepo-name%3E%2Fwiki%2Fshow&source=header-repo&source_repo=tmux%2Ftmux)

Appearance settings

Resetting focus

You signed in with another tab or window. Reload to refresh your session.
You signed out in another tab or window. Reload to refresh your session.
You switched accounts on another tab or window. Reload to refresh your session.

Dismiss alert

{{ message }}

[tmux](/tmux)
/
**[tmux](/tmux/tmux)**
Public

* ### Uh oh!

  There was an error while loading. Please reload this page.
* [Notifications](/login?return_to=%2Ftmux%2Ftmux) You must be signed in to change notification settings
* [Fork
  2.7k](/login?return_to=%2Ftmux%2Ftmux)
* [Star
   46.2k](/login?return_to=%2Ftmux%2Ftmux)

* [Code](/tmux/tmux)
* [Issues
  23](/tmux/tmux/issues)
* [Pull requests
  24](/tmux/tmux/pulls)
* [Discussions](/tmux/tmux/discussions)
* [Actions](/tmux/tmux/actions)
* [Wiki](/tmux/tmux/wiki)
* [Security and quality
  0](/tmux/tmux/security)
* [Insights](/tmux/tmux/pulse)

Additional navigation options

* [Code](/tmux/tmux)
* [Issues](/tmux/tmux/issues)
* [Pull requests](/tmux/tmux/pulls)
* [Discussions](/tmux/tmux/discussions)
* [Actions](/tmux/tmux/actions)
* [Wiki](/tmux/tmux/wiki)
* [Security and quality](/tmux/tmux/security)
* [Insights](/tmux/tmux/pulse)

# Control Mode

[Jump to bottom](#wiki-pages-box)

Nicholas Marriott edited this page Sep 1, 2020
·
[6 revisions](/tmux/tmux/wiki/Control-Mode/_history)

## Control mode

Control mode is a special mode that allows a tmux client to be used to talk to
tmux using a simple text-only protocol. It was designed and written by George
Nachman and allows his [iTerm2](https://www.iterm2.com/) terminal to interface
with tmux and show tmux panes using the iTerm2 UI.

A control mode client is just like a normal tmux client except that instead of
drawing the terminal, tmux communicates using text. Because control mode is
text only, it can easily be parsed and used over *ssh(1)*.

Control mode clients accept standard tmux commands and return their output, and
additionally sends control mode only information (mostly asynchronous
notifications) prefixed by `%`. The idea is that users of control mode use tmux
commands (`new-window`, `list-sessions`, `show-options`, and so on) to control
tmux rather than duplicating a separate command set just for control mode.

### Entering control mode

The `-C` flag to tmux starts a client in control mode. This is only really
useful with the `attach-session` or `new-session` commands that attach the
client.

`-C` has two forms. A single `-C` doesn't change any terminal attributes -
leaving the terminal in canonical mode, so for example echo is still enabled.
This is intended for testing: typing will appear, control characters like
delete and kill still work.

Two `-C` (so `-CC`) disables canonical mode and most other terminal features
and is intended for applications (that, for example, don't need echo). In
addition, the `-CC` form sends a `\033P1000p` DSC sequence (similar to ReGIS)
that a listening terminal can use to detect control mode has been entered and
sends a `%exit` line and a corresponding `ST` (`\033\`) sequence when the
client exits.

With either form, entering an empty line (just pressing `Enter`) will detach
the client.

For example, this shows output from starting a new tmux server on a socket
called `test` with a new session (it runs `new-session`) and attaching a client
in control mode, then killing the server:

```
$ tmux -Ltest -C new
%begin 1578920019 258 0
%end 1578920019 258 0
%window-add @1
%sessions-changed
%session-changed $1 1
%window-renamed @1 tmux
%output %1 nicholas@yelena:~$
%window-renamed @1 ksh
kill-server
%begin 1578920028 265 1
%end 1578920028 265 1
```

In this example, `kill-server` is a command entered by the user and the
remaining lines starting with `%` are sent by the tmux server.

### Commands

tmux commands or command sequences may be sent to the control mode client, for
example creating a new window:

```
new -n mywindow
%begin 1578920529 257 1
%end 1578920529 257 1
```

Every command produces one block of output. This is wrapped in two guard lines:
either `%begin` and `%end` if the command succeeded, or `%begin` and `%error`
if it failed.

Every `%begin`, `%end` or `%error` has three arguments:

1. the time as seconds from epoch;
2. a unique command number;
3. flags, at the moment this is always one.

The time and command number for `%begin` will always match the corresponding
`%end` or `%error`, although tmux will never mix output for different commands
so there is no requirement to use these.

Output from commands is sent as it would be if the command was used from inside
tmux or from a shell prompt, for example:

```
lsp -a
%begin 1578922740 269 1
0:0.0: [80x24] [history 0/2000, 0 bytes] %0 (active)
1:0.0: [80x24] [history 0/2000, 0 bytes] %1 (active)
1:1.0: [80x24] [history 0/2000, 0 bytes] %2 (active)
%end 1578922740 269 1
```

Or:

```
abcdef
%begin 1578923149 270 1
parse error: unknown command: abcdef
%error 1578923149 270 1
```

### Getting information

Most control mode users will want to get information from the tmux server. The
most useful commands to do this are `list-sessions`, `list-windows`,
`list-panes` and `show-options`.

The `-F` flag should be used where possible for output in a known format rather
than relying on the default. The `q` format modifier is useful for escaping.

For example listing all sessions with their ID and name:

```
ls -F '#{session_id} "#{q:session_name}"'
%begin 1578925957 337 1
$4 "\"quoted\""
$2 "abc\ def"
$0 "bar"
$1 "foo"
$3 "😀"
%end 1578925957 337 1
```

### Pane output

Like a normal tmux client, a control mode client may be attached to a single
session (which can be changed using commands like `switch-client`,
`attach-session` or `kill-session`). Any output in any pane in any window in
the attached session is sent to the control client. This takes the form of a
`%output` notification with two arguments:

1. The pane ID (*not* the pane number).
2. The output.

The output has any characters less than ASCII 32 and the `\` character replaced
with their octal equivalent, so `\` becomes `\134`. Otherwise, it is exactly
what the application running in the pane sent to tmux. It may not be valid
UTF-8 and may contain escape sequences which will be as expected by tmux (so
for `TERM=screen` or `TERM=tmux`).

For example, creating a new window and sending the *ls(1)* command:

```
neww
%begin 1578923903 256 1
%end 1578923903 256 1
%output %1 nicholas@yelena:~$
send 'ls /' Enter
%begin 1578923910 261 1
%end 1578923910 261 1
%output %1 ls /\015\015\012
%output %1 altroot/     bsd.booted   dev/         obsd*        sys@\015\012bin/         bsd.rd       etc/         reboot*      tmp/\015\012
%output %1 boot         bsd.sp       home/        root/        usr/\015\012bsd          cvs@         mnt/         sbin/        var/\015\012
%output %1 nicholas@yelena:~$
```

Note that output generated by tmux itself (for example in copy or choose mode)
is not sent to control mode clients.

### Notifications

Notifications are sent to control mode clients when a change is made, either by
another client or by the tmux server itself.

The following notifications are supported:

| Notification | Description |
| --- | --- |
| `%pane-mode-changed %pane` | A pane's mode was changed. |
| `%window-pane-changed @window %pane` | A window's active pane changed. |
| `%window-close @window` | A window was closed in the attached session. |
| `%unlinked-window-close @window` | A window was closed in another session. |
| `%window-add @window` | A window was added to the attached session. |
| `%unlinked-window-add @window` | A window was added to another session. |
| `%window-renamed @window new-name` | A window was renamed in the attached session. |
| `%unlinked-window-renamed @window new-name` | A window was renamed in another session. |
| `%session-changed $session session-name` | The attached session was changed. |
| `%client-session-changed client $session session-name` | Another client's attached session was changed. |
| `%session-renamed $session new-name` | A session was renamed. |
| `%sessions-changed` | A session was created or destroyed. |
| `%session-window-changed $session @window` | A session's current window was changed. |

`$session`, `@window` and `%pane` are session, window and pane IDs.

### Special commands

tmux provides two special arguments to the `refresh-client` command for control
mode clients to perform actions not needed by normal clients. These are:

* `refresh-client -C` sets the size of a control mode client. If this is not
  used, control mode clients do not affect the size of other clients no matter
  the value of the `window-size` option. If this is used, then they are treated
  as any other client with the given size and may set the window size.
* `refresh-client -f` (`-F` is also accepted for backwards compatibility) sets
  flags for the control mode client. Some of the flags are general but several
  are only for control mode clients:

  + `no-output` does not send any `%output` notifications;
  + `wait-exit` waits for an empty line after `%exit` before actually exiting;
  + `pause-after` is used for flow control.
* `refresh-client -A` is used for flow control and `-B` for format
  subscriptions.

In addition, `send-keys` has a `-H` flag allowing Unicode keys to be entered in a
hexadecimal form.

A few commands like `suspend-client` have no effect when used with a control
mode client.

### Flow control

tmux provides a mechanism for flow control of control mode clients. Flow
control works by allowing tmux to pause output from a pane to the client once
it becomes too far behind. Once a pane is paused, the client can ask tmux to
continue sending output once it is ready. It is up to the client to update the
content of the pane if necessary, for example using `capture-pane`.

Flow control is enabled by setting the `pause-after` flag using `refresh-client -f`. This takes a single argument which is the length of time in seconds before
a pane should be paused:

```
refresh-client -f pause-after=30
```

When a pane is paused, the `%pause` notification will be sent with the pane ID.
The pane can be continued with `refresh-client -A`:

```
refresh-client -A '%0:continue'
```

Once continued, the `%continue` notification is sent.

When flow control is enabled, the `%output` notification is not sent; instead
the `%extended-output` notification is used. This has additional arguments
terminated by a single `:` argument. Currently there are two arguments: the
pane ID and the number of milliseconds by which the pane is behind. For
example:

```
%extended-output %0 1234 : abcdef
```

`refresh-client -A` can also be used to manually pause a pane (`-A '%0:pause'`)
or to turn it on or off. Turning a pane off tells tmux that the client does not
require output from the pane to be sent and allows tmux to choose to stop
reading from the pane if possible.

### Format subscriptions

Control mode clients may subscribe to a format and be informed every time its
expanded value changes. A subscription is added or removed with the
`refresh-client -B` command. This takes a single argument which has three
pieces separated by colons:

1. A subscription name.
2. The type of item to subscribe to, one of:

   | Type | Description |
   | --- | --- |
   | Empty | The attached session. |
   | `%n` | A single pane ID. |
   | `%*` | All panes in the attached session. |
   | `@n` | A single window ID. |
   | `@*` | All windows in the attached session. |
3. The format.

If the type and format are omitted and only the subscription name is given, the
subscription is removed.

tmux expands the format once for each matching item for the given type and if
the resulting value has changed sends a `%subscription-changed` notification.
This happens at most once a second.

### General notes

A few other notes:

* Using session, window and pane IDs rather than names or indexes is strongly
  recommended because they are unambiguous.
* User options can be used to store and retrieve custom options in the tmux
  server (they can be set to server, session, window or pane). `show-options -v @foo` shows only the option value for user option `@foo`.
* Formats are the primary method of inspecting properties of a session, window
  or pane or the tmux server itself. The `display-message -p` command is useful
  for this as well as the `-F` flag to the list commands.

## Toggle table of contents Pages 11

* Loading

  [Home](/tmux/tmux/wiki)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Advanced Use](/tmux/tmux/wiki/Advanced-Use)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Clipboard](/tmux/tmux/wiki/Clipboard)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Contributing](/tmux/tmux/wiki/Contributing)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Control Mode](/tmux/tmux/wiki/Control-Mode)

  + [Control mode](/tmux/tmux/wiki/Control-Mode#control-mode)
  + [Entering control mode](/tmux/tmux/wiki/Control-Mode#entering-control-mode)
  + [Commands](/tmux/tmux/wiki/Control-Mode#commands)
  + [Getting information](/tmux/tmux/wiki/Control-Mode#getting-information)
  + [Pane output](/tmux/tmux/wiki/Control-Mode#pane-output)
  + [Notifications](/tmux/tmux/wiki/Control-Mode#notifications)
  + [Special commands](/tmux/tmux/wiki/Control-Mode#special-commands)
  + [Flow control](/tmux/tmux/wiki/Control-Mode#flow-control)
  + [Format subscriptions](/tmux/tmux/wiki/Control-Mode#format-subscriptions)
  + [General notes](/tmux/tmux/wiki/Control-Mode#general-notes)
* Loading

  [FAQ](/tmux/tmux/wiki/FAQ)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Formats](/tmux/tmux/wiki/Formats)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Getting Started](/tmux/tmux/wiki/Getting-Started)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Installing](/tmux/tmux/wiki/Installing)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Modifier Keys](/tmux/tmux/wiki/Modifier-Keys)

  ### Uh oh!

  There was an error while loading. Please reload this page.
* Loading

  [Recipes](/tmux/tmux/wiki/Recipes)

  ### Uh oh!

  There was an error while loading. Please reload this page.

### Clone this wiki locally

## Footer

© 2026 GitHub, Inc.

### Footer navigation

* [Terms](https://docs.github.com/site-policy/github-terms/github-terms-of-service)
* [Privacy](https://docs.github.com/site-policy/privacy-policies/github-privacy-statement)
* [Security](https://github.com/security)
* [Status](https://www.githubstatus.com/)
* [Community](https://github.community/)
* [Docs](https://docs.github.com/)
* [Contact](https://support.github.com?tags=dotcom-footer)
* Manage cookies
* Do not share my personal information

You can’t perform that action at this time.

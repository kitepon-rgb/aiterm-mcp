---
title: "OSC 133 (shell integration / semantic prompt) support · tmux/tmux #3064"
source_url: "https://github.com/tmux/tmux/issues/3064"
source_type: article
fetched: 2026-06-01
topic: completion-detection
tags: ["tmux", "osc-133", "passthrough", "allow-passthrough", "nesting"]
summary: "tmuxへのOSC 133対応議論。tmuxが未知のエスケープを端末へ素通ししない事と、DCSラップ/allow-passthroughの必要性。"
relevance: "tmuxバックエンド採用時、OSC 133マーカーがtmux層で消える/要passthrough設定という壊れ方を直接示す。ネスト検証の核心。"
chars: 9465
---

[Skip to content](#start-of-content)

## Navigation Menu

Toggle navigation

[Sign in](/login?return_to=https%3A%2F%2Fgithub.com%2Ftmux%2Ftmux%2Fissues%2F3064)

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

[Sign in](/login?return_to=https%3A%2F%2Fgithub.com%2Ftmux%2Ftmux%2Fissues%2F3064)

[Sign up](/signup?ref_cta=Sign+up&ref_loc=header+logged+out&ref_page=%2F%3Cuser-name%3E%2F%3Crepo-name%3E%2Fvoltron%2Fissues_fragments%2Fissue_layout&source=header-repo&source_repo=tmux%2Ftmux)

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

# OSC 133 (shell integration / semantic prompt) support #3064

New issue

Copy link

New issue

Copy link

Closed

Closed

[OSC 133 (shell integration / semantic prompt) support](#top)#3064

Copy link

[![@vimpostor](https://avatars.githubusercontent.com/u/21310755?u=9ddd310621ecec4b69eb02fba3a5d8f902a8f001&v=4&size=80)](https://github.com/vimpostor)

## Description

[![@vimpostor](https://avatars.githubusercontent.com/u/21310755?u=9ddd310621ecec4b69eb02fba3a5d8f902a8f001&v=4&size=48)](https://github.com/vimpostor)

[vimpostor](https://github.com/vimpostor)

opened [on Feb 10, 2022](https://github.com/tmux/tmux/issues/3064#issue-1130337235)

Issue body actions

It would be good if tmux supported OSC 133, which is a control sequence that specifies where the prompt ended, and where the output of the executed program starts and ends.
This can then be used for some really helpful features, such as automatically scrolling to the beginning of the output of the last shell command, cycling between the last prompt inputs or selecting the entire output of the last ran command.

The spec can be found here: <https://gitlab.freedesktop.org/Per_Bothner/specifications/blob/master/proposals/semantic-prompts.md>
An example terminal emulator that implements this feature is wezterm: <https://wezfurlong.org/wezterm/shell-integration.html>

I am mainly interested in the OSC 133 part, the OSC 7 part can be considered a separate issue.

Is this something that you would be willing to accept into the tmux codebase? If so, I can implement this myself in the near future.

This control sequence has to be supported from the shell, for example in the case of zsh one could use [powerlevel10k](https://github.com/romkatv/powerlevel10k) and enable it by setting `POWERLEVEL9K_TERM_SHELL_INTEGRATION=true`.

Reactions are currently unavailable

## Metadata

## Metadata

### Assignees

No one assigned

### Labels

No labels

No labels

### Type

No type

### Fields

[Give feedback](https://github.com/orgs/community/discussions/189141)

No fields configured for issues without a type.

### Projects

No projects

### Milestone

No milestone

### Relationships

None yet

### Development

No branches or pull requests

## Issue actions

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

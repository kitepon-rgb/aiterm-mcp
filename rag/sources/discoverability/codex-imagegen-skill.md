---
title: "Image generation in Codex"
source_url: "https://learn.chatgpt.com/docs/image-generation#generate-or-edit-an-image"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["codex", "imagegen", "skills"]
summary: "Codexで$imagegenを呼び出す公式資料。"
relevance: "Claude CodeからCodex CLIの対話機能を操作する差別化表現の根拠。"
chars: 32059
---

[![OpenAI Developers](/OpenAI_Developers.svg)   ChatGPT](/)

[Home](/)

[API](/api/docs)

[Codex](https://learn.chatgpt.com/docs)

[Docs

Guides, concepts, and product docs for Codex](https://learn.chatgpt.com/docs)[Use cases

Example workflows and tasks teams can take on with ChatGPT or Codex](https://learn.chatgpt.com/use-cases)

[Docs](/codex)

[Use cases](/codex/use-cases)

[Resources](/codex/resources)

[ChatGPT](/chatgpt)

[Plugins

Extend ChatGPT and Codex](/plugins)[Workspace Agents

Trigger published ChatGPT workspace agents](/workspace-agents)[Commerce

Build commerce flows in ChatGPT](/commerce)[Ads

Publish and measure ads in ChatGPT](/ads)

[Resources](/learn)

[Showcase

Demo apps to get inspired](/showcase)[Blog

Learnings and experiences from developers](/blog)[Cookbook

Notebook examples for building with OpenAI models](/cookbook)[Learn

Docs, videos, and demo apps for building with OpenAI](/learn)[Community

Programs, meetups, and support for builders](/community)

Start searching

[API Dashboard](https://platform.openai.com/login)

[Try ChatGPT](https://chatgpt.com/)

[Overview](/codex)  [Features](/codex/features)  [Configuration](/codex/configuration)  [Developers](/codex/developers)  [Security](/codex/security-administration)  [Administration](/codex/administration)  [Use Cases](/codex/use-cases)  [Resources](/codex/resources)

## Search the docs

Search docs

### Suggested

responses createreasoning\_effortrealtimeprompt caching

Primary navigation

API  Codex  ChatGPT  Docs  Use cases  Resources  Resources

Search docs

### Suggested

responses createreasoning\_effortrealtimeprompt caching

Overview  Models  Agents  Tools  Voice & Audio  Production  API reference

OverviewModelsAgentsToolsVoice & AudioProductionAPI referenceDocs sectionOverview

* [Home](/api/docs)

### Get started

* [Quickstart](/api/docs/quickstart)
* [Using GPT-5.6](/api/docs/guides/latest-model)
* [Key concepts](/api/docs/concepts)

### Core concepts

* [Responses API](/api/docs/guides/migrate-to-responses)
* [Conversation state](/api/docs/guides/conversation-state)
* [Background mode](/api/docs/guides/background)
* [Streaming](/api/docs/guides/streaming-responses)
* [WebSocket mode](/api/docs/guides/websocket-mode)
* [Multi-agent](/api/docs/guides/responses-multi-agent)
* [Webhooks](/api/docs/guides/webhooks)
* [File inputs](/api/docs/guides/file-inputs)
* [Compaction](/api/docs/guides/compaction)
* [Counting tokens](/api/docs/guides/token-counting)

### SDKs and CLI

* [OpenAI SDK](/api/docs/libraries)
* [OpenAI CLI](/api/docs/libraries/openai-cli)

### Resources

* [Changelog](/api/docs/changelog)
* [Deprecations](/api/docs/deprecations)
* [Supported countries](/api/docs/supported-countries)
* [OpenAI Crawlers](/api/docs/bots)
* [Terms and policies](https://openai.com/policies)

### Legacy APIs

* Agent Builder
  + [Overview](/api/docs/guides/agent-builder)
  + [Migration guide](/api/docs/guides/agent-builder/migrate-from-agent-builder)
  + [Node reference](/api/docs/guides/node-reference)
  + [Safety in building agents](/api/docs/guides/agent-builder-safety)
* Evals
  + [Getting started](/api/docs/guides/evaluation-getting-started)
  + [Working with evals](/api/docs/guides/evals)
  + [Prompt optimizer](/api/docs/guides/prompt-optimizer)
  + [External models](/api/docs/guides/external-models)
  + [Best practices](/api/docs/guides/evaluation-best-practices)
  + [Graders](/api/docs/guides/graders)
* Fine-tuning
  + [Optimization cycle](/api/docs/guides/model-optimization)
  + [Supervised fine-tuning](/api/docs/guides/supervised-fine-tuning)
  + [Vision fine-tuning](/api/docs/guides/vision-fine-tuning)
  + [Direct preference optimization](/api/docs/guides/direct-preference-optimization)
  + [Reinforcement fine-tuning](/api/docs/guides/reinforcement-fine-tuning)
  + [RFT use cases](/api/docs/guides/rft-use-cases)
  + [Best practices](/api/docs/guides/fine-tuning-best-practices)
* Assistants API
  + [Migration guide](/api/docs/assistants/migration)
  + [Deep dive](/api/docs/assistants/deep-dive)
  + [Tools](/api/docs/assistants/tools)

* [Model catalog](/api/docs/models)

### Choose a model

* [Pricing](/api/docs/pricing)
* [Model selection](/api/docs/guides/model-selection)

### Text and code

* [Text generation](/api/docs/guides/text)
* [Code generation](/api/docs/guides/code-generation)
* [Structured output](/api/docs/guides/structured-outputs)

### Prompting

* [Overview](/api/docs/guides/prompting)
* [Prompt engineering](/api/docs/guides/prompt-engineering)
* [Citation formatting](/api/docs/guides/citation-formatting)
* [Migration guide](/api/docs/guides/prompting/migrate-from-prompt-object)
* [Prompt generation](/api/docs/guides/prompt-generation)
* [Frontend prompting](/api/docs/guides/frontend-prompt)

### Reasoning

* [Reasoning models](/api/docs/guides/reasoning)
* [Reasoning best practices](/api/docs/guides/reasoning-best-practices)

### Images and video

* [Images and vision](/api/docs/guides/images-vision)
* [Image generation](/api/docs/guides/image-generation)
* [Video generation](/api/docs/guides/video-generation)

### Realtime and audio

* [Audio and speech](/api/docs/guides/audio)
* [Overview](/api/docs/guides/realtime)
* [Voice agents](/api/docs/guides/voice-agents)

### Specialized models

* [Deep research](/api/docs/guides/deep-research)
* [Embeddings](/api/docs/guides/embeddings)
* [Moderation](/api/docs/guides/moderation)

* [Overview](/api/docs/guides/agents)

### Agents SDK

* [Quickstart](/api/docs/guides/agents/quickstart)
* [Agent definitions](/api/docs/guides/agents/define-agents)
* [Models and providers](/api/docs/guides/agents/models)
* [Running agents](/api/docs/guides/agents/running-agents)
* [Sandbox agents](/api/docs/guides/agents/sandboxes)
* [Orchestration](/api/docs/guides/agents/orchestration)
* [Guardrails](/api/docs/guides/agents/guardrails-approvals)
* [Results and state](/api/docs/guides/agents/results)
* [Integrations and observability](/api/docs/guides/agents/integrations-observability)
* [Evaluate agent workflows](/api/docs/guides/agent-evals)

### ChatKit

* [Overview](/api/docs/guides/chatkit)
* [Customize](/api/docs/guides/chatkit-themes)
* [Widgets](/api/docs/guides/chatkit-widgets)
* [Actions](/api/docs/guides/chatkit-actions)
* [Advanced integrations](/api/docs/guides/custom-chatkit)

* [Overview](/api/docs/guides/tools)
* [Function calling](/api/docs/guides/function-calling)

### Search and retrieval

* [Web search](/api/docs/guides/tools-web-search)
* [File search](/api/docs/guides/tools-file-search)
* [Retrieval](/api/docs/guides/retrieval)

### Connect tools and data

* [MCP and Connectors](/api/docs/guides/tools-connectors-mcp)
* [Secure MCP Tunnel](/api/docs/guides/secure-mcp-tunnels)

### Build tool workflows

* [Skills](/api/docs/guides/tools-skills)
* [Tool search](/api/docs/guides/tools-tool-search)
* [Programmatic tool calling](/api/docs/guides/tools-programmatic-tool-calling)

### Computer and code

* [Shell](/api/docs/guides/tools-shell)
* [Computer use](/api/docs/guides/tools-computer-use)
* [Apply Patch](/api/docs/guides/tools-apply-patch)
* [Local shell](/api/docs/guides/tools-local-shell)
* [Code interpreter](/api/docs/guides/tools-code-interpreter)

### Media

* [Image generation](/api/docs/guides/tools-image-generation)

* [Overview](/api/docs/guides/realtime)

### Get started

* [Voice agents](/api/docs/guides/voice-agents)
* [Live translation](/api/docs/guides/realtime-translation)
* [Realtime prompting guide](/api/docs/guides/realtime-models-prompting)

### Audio

* [Audio and speech](/api/docs/guides/audio)
* [Realtime transcription](/api/docs/guides/realtime-transcription)
* [Speech to text](/api/docs/guides/speech-to-text)
* [Speech generation](/api/docs/guides/text-to-speech)

### Connection methods

* [WebRTC](/api/docs/guides/realtime-webrtc)
* [WebSocket](/api/docs/guides/realtime-websocket)
* [SIP](/api/docs/guides/realtime-sip)

### Sessions and operations

* [Managing conversations](/api/docs/guides/realtime-conversations)
* [Voice activity detection](/api/docs/guides/realtime-vad)
* [Realtime with tools](/api/docs/guides/realtime-mcp)
* [Webhooks and server-side controls](/api/docs/guides/realtime-server-controls)
* [Managing costs](/api/docs/guides/realtime-costs)

### Go live

* [Production best practices](/api/docs/guides/production-best-practices)
* [Deployment checklist](/api/docs/guides/deployment-checklist)

### Performance and quality

* [Latency optimization](/api/docs/guides/latency-optimization)
* [Predicted Outputs](/api/docs/guides/predicted-outputs)
* [Priority processing](/api/docs/guides/priority-processing)
* [Accuracy optimization](/api/docs/guides/optimizing-llm-accuracy)

### Cost and throughput

* [Cost optimization](/api/docs/guides/cost-optimization)
* [Prompt caching](/api/docs/guides/prompt-caching)
* [Batch](/api/docs/guides/batch)
* [Flex processing](/api/docs/guides/flex-processing)

### Safety and governance

* [Safety best practices](/api/docs/guides/safety-best-practices)
* [Red teaming](/api/docs/guides/red-teaming)
* [Safety checks](/api/docs/guides/safety-checks)
  + [Cybersecurity checks](/api/docs/guides/safety-checks/cybersecurity)
  + [Under 18 API Guidance](/api/docs/guides/safety-checks/under-18-api-guidance)
* [Your data](/api/docs/guides/your-data)
* [Permissions](/api/docs/guides/rbac)

### Infrastructure and access

* [Private Link](/api/docs/guides/private-link)
* [Workload identity federation](/api/docs/guides/workload-identity-federation)
  + [Kubernetes](/api/docs/guides/workload-identity-federation/kubernetes)
  + [AWS](/api/docs/guides/workload-identity-federation/aws)
  + [Microsoft Azure](/api/docs/guides/workload-identity-federation/microsoft-azure)
  + [Google Cloud](/api/docs/guides/workload-identity-federation/google-cloud)
  + [GitHub Actions](/api/docs/guides/workload-identity-federation/github-actions)
  + [SPIFFE](/api/docs/guides/workload-identity-federation/spiffe)
* [IP egress ranges](/api/docs/guides/ip-addresses)
* [Amazon Bedrock](/api/docs/guides/amazon-bedrock)

### Operations

* [Rate limits](/api/docs/guides/rate-limits)
* [Spend limits](/api/docs/guides/spend-limits)
* [Admin APIs](/api/docs/guides/admin-apis)
* [Error codes](/api/docs/guides/error-codes)

[Docs](https://learn.chatgpt.com/docs)  [Use cases](https://learn.chatgpt.com/use-cases)

DocsUse casesDocs sectionDocs

Plugins  Workspace Agents  Commerce  Ads

PluginsWorkspace AgentsCommerceAdsDocs sectionSelect...

* [Home](/plugins)
* [Quickstart](/plugins/quickstart)

### Core concepts

* [Plugin architecture](/plugins/concepts/plugins)
* [Skills](/plugins/concepts/skills)
* [MCP server](/plugins/concepts/mcp-server)

### Plan

* [Brainstorm use cases](/plugins/plan/use-case)
* [Define tools](/plugins/plan/tools)

### Build

* [Build an MCP server](/plugins/build/mcp-server)
* [Add UI to your MCP server (optional)](/plugins/build/chatgpt-ui)
* [Authenticate users](/plugins/build/auth)
* [Build skills](/plugins/build/skills)
* [Package your plugin](/plugins/build/plugins)
* [Examples](/plugins/build/examples)

### Test and publish

* [Connect and test your plugin](/plugins/deploy/connect-chatgpt)
* [Submit and publish](/plugins/deploy/submission)
* [Submission error reference](/plugins/deploy/submission-errors)

### Conversion specs

* [Restaurant reservation spec](/plugins/guides/restaurant-reservation-conversion-spec)
* [Product checkout spec](/plugins/guides/product-checkout-conversion-spec)

### Guides

* [UI guidelines](/plugins/concepts/ui-guidelines)
* [Optimize Metadata](/plugins/guides/optimize-metadata)
* [Security & Privacy](/plugins/guides/security-privacy)
* [Troubleshooting](/plugins/deploy/troubleshooting)

### Resources

* [Changelog](/plugins/changelog)
* [Plugin guidelines](/plugins/app-guidelines)
* [MCP server review requirements](/plugins/deploy/app-review)
* [Plugin UI reference](/plugins/reference)
* [Checkout API reference](/plugins/build/monetization)

* [Home](/workspace-agents)

### Get started

* [Trigger workspace agent runs](/workspace-agents/trigger-runs)
* [Authenticate with Workspace Agent access tokens](/workspace-agents/authentication)

* [Home](/commerce)

### Guides

* [Get started](/commerce/guides/get-started)
* [Best practices](/commerce/guides/best-practices)

### File Upload

* [Overview](/commerce/specs/file-upload/overview)
* [Products](/commerce/specs/file-upload/products)

### API

* [Overview](/commerce/specs/api/overview)
* [Feeds](/commerce/specs/api/feeds)
* [Products](/commerce/specs/api/products)
* [Promotions](/commerce/specs/api/promotions)

* [Ads Overview](/ads)

### Measurement

* [JavaScript Pixel](/ads/measurement-pixel)
* [Image tag](/ads/image-tag)
* [Conversions API](/ads/conversions-api)
* [Supported events](/ads/supported-events)

### Advertiser API

* [Overview](/ads/api-overview)
* [API partner setup](/ads/api-partner-setup)
* [Quickstart](/ads/api-quickstart)
* [Bulk API](/ads/bulk-api)
* [Product feeds](/ads/product-feeds)
* [Campaign Targeting](/ads/campaign-targeting)
* [Conversion-optimized campaigns](/ads/conversion-optimized-campaigns)

### API Reference

* [Authentication](/ads/api-reference/authentication)
* [Conversion setup](/ads/api-reference/conversion-setup)
* [Campaigns](/ads/api-reference/campaigns)
* [Ad Groups](/ads/api-reference/ad-groups)
* [Ads](/ads/api-reference/ads)
* [Ad Account](/ads/api-reference/ad-account)
* [Insights](/ads/api-reference/insights)
* [Files](/ads/api-reference/files)

Overview  Features  Configuration  Developers  Security  Administration  Use Cases  Resources

OverviewFeaturesConfigurationDevelopersSecurityAdministrationUse CasesResourcesDocs sectionFeatures

* [Home](/codex)

### Get started

* [Quickstart](/codex/quickstart)
* [Use ChatGPT](/codex/use-chatgpt)
* [Get started with Work](/codex/get-started-with-work)
* [Import from another agent](/codex/import)

### Foundations

* [Prompting](/codex/prompting)
* [Personalize ChatGPT](/codex/personalize)
* [Skills & Plugins](/codex/skills-and-plugins)
* [Permissions](/codex/permission-modes)

### Explore

* [What's new](/codex/whats-new)
* [Models](/codex/models)
* [Pricing](/codex/pricing)
* [Glossary](/codex/glossary)

### Available on

* [ChatGPT desktop app](/codex/app)
* [ChatGPT on the web](/codex/web)
* [Codex CLI](/codex/cli)
* [Codex IDE extension](/codex/ide)
* [Codex cloud](/codex/cloud)

### Releases

* [Changelog](/codex/changelog)
* [Feature Maturity](/codex/feature-maturity)
* [Open Source](/codex/open-source)

* [Overview](/codex/features)

### Workflows

* [Projects and chats](/codex/projects)
* [Sites](/codex/sites)
* [Visualizations](/codex/visualizations)
* [Scheduled tasks](/codex/automations)
* [Long-running work](/codex/long-running-work)
* [Notifications](/codex/notifications)
* [Pets](/codex/pets)
* [Codex Micro](/codex/features/codex-micro)

### Capabilities

* [Browser](/codex/browser)
* [Computer use](/codex/computer-use)
* [Voice](/codex/features/voice)
* [Plugins](/codex/plugins)
* [Web search](/codex/web-search)
* [Image generation](/codex/image-generation)
* [Image inputs](/codex/image-inputs)
* [Appshots](/codex/appshots)
* [Chrome extension](/codex/chrome-extension)
* [Work with files](/codex/artifacts-viewer)

### Reference

* [Commands](/codex/reference/commands)
* [Slash commands](/codex/reference/slash-commands)
* [Settings](/codex/reference/settings)
* [Troubleshooting](/codex/reference/troubleshooting)

* [Overview](/codex/configuration)

### Customization

* [Overview](/codex/customization/overview)
* [Memories](/codex/customization/memories)
* [Chronicle](/codex/customization/chronicle)

### Config file

* [Config Basics](/codex/config-file/config-basic)
* [Advanced Config](/codex/config-file/config-advanced)
* [Config Reference](/codex/config-file/config-reference)
* [Environment Variables](/codex/config-file/environment-variables)
* [Sample Config](/codex/config-file/config-sample)

### Agent configuration

* [AGENTS.md](/codex/agent-configuration/agents-md)
* [Subagents](/codex/agent-configuration/subagents)
* [Speed](/codex/agent-configuration/speed)
* [Rules](/codex/agent-configuration/rules)

### Extend ChatGPT and Codex

* [Record & Replay](/codex/extend/record-and-replay)
* [MCP](/codex/extend/mcp)

### Windows

* [Desktop app](/codex/windows/windows-app)
* [Windows sandbox](/codex/windows/windows-sandbox)
* [WSL](/codex/windows/wsl)

* [Overview](/codex/developers)

### Development workflows

* [Code review](/codex/code-review)
* [Integrated terminal](/codex/integrated-terminal)

### Extend and automate

* [Build skills](/codex/build-skills)
* [Build plugins](/codex/build-plugins)
* [Hooks](/codex/hooks)

### Environments

* [Modes](/codex/environments/modes)
* [Local environments](/codex/environments/local-environment)
* [Cloud environment](/codex/environments/cloud-environment)
* [Git worktrees](/codex/environments/git-worktrees)

### Build with Codex

* [Codex SDK](/codex/codex-sdk)
* [App Server](/codex/app-server)
* [MCP Server](/codex/mcp-server)
* [GitHub Action](/codex/github-action)
* [Non-interactive mode](/codex/non-interactive-mode)

### Third-party integrations

* [GitHub](/codex/third-party/github)
* [Slack](/codex/third-party/slack)
* [Linear](/codex/third-party/linear)

### Reference

* [CLI customization](/codex/cli-customization)
* [Developer commands](/codex/developer-commands)
* [Developer settings](/codex/developer-settings)

* [Overview](/codex/security-administration)

### Permissions

* [Profiles](/codex/permissions)
* [Sandboxing](/codex/sandboxing)
* [Auto-review](/codex/sandboxing/auto-review)
* [Agent approvals & security](/codex/agent-approvals-security)
* [Internet access](/codex/cloud/internet-access)

### Codex Security

* [Overview](/codex/security)
* [Cloud FAQ](/codex/security/faq)
* Codex Security plugin
  + [Quickstart](/codex/security/plugin)
  + [Run a security scan](/codex/security/plugin/scans)
  + [Run a deep scan](/codex/security/plugin/deep-scans)
  + [Review code changes](/codex/security/plugin/code-changes)
  + [Triage a backlog](/codex/security/plugin/triage-backlog)
  + [Fix findings](/codex/security/plugin/fix-findings)
  + [Export and track findings](/codex/security/plugin/export-findings)
  + [Write vulnerability reports](/codex/security/plugin/vulnerability-reports)
  + [Propose security hardening](/codex/security/plugin/security-hardening)
  + [Changelog](/codex/security/plugin/changelog)
* [Codex Security cloud setup](/codex/security/setup)
* [Improving the threat model](/codex/security/threat-model)

### Safety

* [Cyber Safety](/codex/cyber-safety)

* [Overview](/codex/administration)

### Getting started

* [Admin rollout guide](/codex/enterprise/admin-setup)
* [ChatGPT Work admin FAQ](/codex/enterprise/work-admin-faq)

### Identity and authentication

* [Authentication overview](/codex/auth)
* [Access tokens](/codex/enterprise/access-tokens)

### Workspace access, policy, and models

* [Groups and provisioning](/codex/enterprise/groups-and-provisioning)
* [Roles and workspace permissions](/codex/enterprise/roles-and-workspace-permissions)
* [Managed configuration](/codex/enterprise/managed-configuration)
* [HIPAA configuration](/codex/hipaa-configuration)
* [Workspace model availability](/codex/enterprise/workspace-model-availability)

### Plugin and connector controls

* [Plugin controls](/codex/enterprise/apps-and-connectors)
* [Skill controls](/codex/enterprise/skills)

### Usage, governance, and compliance

* [Governance](/codex/enterprise/governance)
* [Workspace analytics](/codex/enterprise/workspace-analytics)
* [Analytics API](/codex/enterprise/analytics-api)
* [Compliance API and audit events](/codex/enterprise/compliance-api)

### Deployment and model providers

* [Windows app deployment](/codex/enterprise/windows-deployment)
* [Remote connections](/codex/remote-connections)
* [Amazon Bedrock](/codex/amazon-bedrock)

* [Explore use cases](/codex/use-cases)
* [Collections](/codex/use-cases/collections)

* [Home](/codex/resources)
* [Videos](/codex/videos)
* [Showcase](https://developers.openai.com/showcase)
* [OpenAI Academy](https://openai.com/academy/)
* [Online trainings](https://academy.openai.com/home/events)

### Community

* [Codex Ambassadors](https://developers.openai.com/community/codex-ambassadors)
* [Codex for Students](https://developers.openai.com/community/students)
* [Codex for Open Source](https://developers.openai.com/community/codex-for-oss)
* [Meetups](https://developers.openai.com/community/meetups)

### Blog

* [Company blog](https://openai.com/news/)
* [Developer blog](https://developers.openai.com/blog)

* [Explore use cases](/codex/use-cases)
* [Collections](/codex/use-cases/collections)

* [Home](/codex/resources)
* [Videos](/codex/videos)
* [Showcase](https://developers.openai.com/showcase)
* [OpenAI Academy](https://openai.com/academy/)
* [Online trainings](https://academy.openai.com/home/events)

### Community

* [Codex Ambassadors](https://developers.openai.com/community/codex-ambassadors)
* [Codex for Students](https://developers.openai.com/community/students)
* [Codex for Open Source](https://developers.openai.com/community/codex-for-oss)
* [Meetups](https://developers.openai.com/community/meetups)

### Blog

* [Company blog](https://openai.com/news/)
* [Developer blog](https://developers.openai.com/blog)

[Showcase](/showcase)  Blog  Cookbook  Learn  Community

ShowcaseBlogCookbookLearnCommunityDocs sectionSelect...

* [All posts](/blog)

### Recent

* [Custom Code Review rules for Codex](/blog/custom-code-review-rules-for-codex)
* [Mastering remote engineering work from your phone](/blog/mastering-codex-remote-for-engineering)
* [Making private MCP servers reachable without making them public](/blog/connect-private-mcp-servers-to-openai-products)
* [How Perplexity Brought Voice Search to Millions Using the Realtime API](/blog/realtime-perplexity-computer)
* [Designing delightful frontends with GPT-5.4](/blog/designing-delightful-frontends-with-gpt-5-4)

### Topics

* [General](/blog/topic/general)
* [API](/blog/topic/api)
* [Apps SDK](/blog/topic/apps-sdk)
* [Audio](/blog/topic/audio)
* [Codex](/blog/topic/codex)

* [Home](/cookbook)

### Topics

* [Agents](/cookbook/topic/agents)
* [Evals](/cookbook/topic/evals)
* [Multimodal](/cookbook/topic/multimodal)
* [Text](/cookbook/topic/text)
* [Guardrails](/cookbook/topic/guardrails)
* [Optimization](/cookbook/topic/optimization)
* [ChatGPT](/cookbook/topic/chatgpt)
* [Codex](/cookbook/topic/codex)
* [gpt-oss](/cookbook/topic/gpt-oss)

### Contribute

* [Cookbook on GitHub](https://github.com/openai/openai-cookbook)

* [Home](/learn)
* [OpenAI Developers plugin](/learn/developers-codex-plugin)
* [Docs MCP](/learn/docs-mcp)

### Categories

* [Demo apps](/learn/code)
* [Videos](/learn/videos)

### Topics

* [Agents](/learn/agents)
* [Audio & Voice](/learn/audio)
* [Computer Use](/learn/cua)
* [Codex](/learn/codex)
* [Evals](/learn/evals)
* [gpt-oss](/learn/gpt-oss)
* [Fine-tuning](/learn/fine-tuning)
* [Image generation](/learn/imagegen)
* [Scaling](/learn/scaling)
* [Tools](/learn/tools)
* [Video generation](/learn/videogen)

* [Community](/community)

### Programs

* [Codex Ambassadors](/community/codex-ambassadors)
* [Codex for Students](/community/students)
* [Codex for Open Source](/community/codex-for-oss)
* [OpenAI for Startups](https://openai.com/business/why-openai/startups/)

### Events

* [Meetups](/community/meetups)

### Spaces

* [Developer Forum](https://community.openai.com/)
* [Discord](https://discord.com/invite/openai)
* [Reddit](https://www.reddit.com/r/OpenAI/)
* [X](https://x.com/OpenAIDevs)

[API Dashboard](https://platform.openai.com/login)

[Try ChatGPT](https://chatgpt.com/)

* [Overview](/codex/features)

### Workflows

* [Projects and chats](/codex/projects)
* [Sites](/codex/sites)
* [Visualizations](/codex/visualizations)
* [Scheduled tasks](/codex/automations)
* [Long-running work](/codex/long-running-work)
* [Notifications](/codex/notifications)
* [Pets](/codex/pets)
* [Codex Micro](/codex/features/codex-micro)

### Capabilities

* [Browser](/codex/browser)
* [Computer use](/codex/computer-use)
* [Voice](/codex/features/voice)
* [Plugins](/codex/plugins)
* [Web search](/codex/web-search)
* [Image generation](/codex/image-generation)
* [Image inputs](/codex/image-inputs)
* [Appshots](/codex/appshots)
* [Chrome extension](/codex/chrome-extension)
* [Work with files](/codex/artifacts-viewer)

### Reference

* [Commands](/codex/reference/commands)
* [Slash commands](/codex/reference/slash-commands)
* [Settings](/codex/reference/settings)
* [Troubleshooting](/codex/reference/troubleshooting)

![](/images/codex/surface-icons/chatgpt-app.webp)ChatGPT desktop app

Copy Page

# Image generation

Generate and edit images in ChatGPT

![](/images/codex/surface-icons/chatgpt-app.webp)ChatGPT desktop app

Copy Page

Ask ChatGPT to generate or edit images. Use image generation for UI assets,
banners, backgrounds, illustrations, sprite sheets, and placeholders you want
to create alongside code or in a ChatGPT chat.

Ask for an image from the app composer. Add a reference image when you want
ChatGPT to transform an existing asset or use it as visual guidance.

Ask for an image in a ChatGPT web chat. Attach a reference image to the
composer when you want ChatGPT to edit it or use it as visual guidance.

Describe the image in an interactive session or include `$imagegen` to invoke
the image generation skill explicitly. Attach an existing image with `-i` or
`--image` when it should guide the result.

Ask for an image from the extension chat. Drag a reference image into
the composer while holding `Shift` when Codex should edit or build on
an existing asset.

## Generate or edit an image

Describe the image in natural language. Add a reference image when you want
ChatGPT to transform or extend an existing asset.

Include `$imagegen` in your prompt to invoke the image generation skill
explicitly.

Built-in image generation uses `gpt-image-2` and counts toward your general
Codex usage limits. Image generations use included limits 3–5x faster on
average than similar turns without image generation, depending on image quality
and size. For larger batches, set `OPENAI_API_KEY` in your environment and ask
ChatGPT to generate images through the API so API pricing applies.

Image availability and usage limits in ChatGPT web depend on your plan and
workspace settings. For programmatic image generation, use the [Image
generation API](/api/docs/guides/image-generation).

## Write effective image prompts

A useful image prompt is often only one to three clear sentences. Describe the
details that determine whether the result succeeds:

* Explain the image’s purpose or intended audience.
* Name the main subject and what is happening.
* Describe the setting, composition, and visual style.
* Add framing, dimensions, lighting, colors, or materials when they matter.
* State constraints, including anything the image must not contain.

Prefer concrete visual language over broad reactions. For example, describe
where light comes from instead of asking for “beautiful lighting.” Repeat any
requirement that must stay fixed.

Example prompt

Copy prompt

Create a clean editorial illustration for an employee onboarding guide. Show a person organizing a project at a desk with a laptop, notebook, and simple progress checklist. Use soft daylight from a window on the left, restrained colors, and a modern, approachable style. Keep the background minimal. Do not include logos, text, or futuristic imagery.

## Refine the result

Start with the core idea, then make small, targeted revisions. Adjust one
element at a time so the composition and other important details do not drift.
You can also select a specific area of an image and describe the change for that
area.

When editing an existing image, say exactly what should change and what must
stay the same.

Example prompt

Copy prompt

Edit the attached image. Replace only the mug with a small potted plant. Preserve the person, desk layout, lighting, colors, crop, and every other detail exactly. Do not add text or logos.

For broader revisions, keep the feedback direct and actionable: make the image
brighter, reduce the color saturation, simplify the background, or keep the
composition while changing the style.

## Use multiple reference images

Use a small set of reference images when one image defines the content and
another defines the style, layout, or other visual direction. Identify each
image by order and explain how the images relate. Use spatial terms such as
foreground, background, left, and right when combining elements.

Example prompt

Copy prompt

Image 1 is the product photo to edit. Image 2 is the style reference. Keep the product, camera angle, layout, and objects from image 1, but apply the clean line work, muted palette, and soft shadows from image 2. Keep the product centered and leave the upper-right corner clear for later copy.

## Add text to an image

Keep in-image text short and specify it precisely. Put the exact text in
quotation marks, preserve the capitalization you want, and describe its font
style, size, color, and placement. For an uncommon name, spell out the letters
when accuracy matters. State whether any other text is allowed.

Example prompt

Copy prompt

Add only the title “SPRING WORKSHOP” in large, bold, white sans-serif letters, centered in the top third of the image. Keep the title on one line. Do not add any other text or change the underlying image.

## Create infographics and dense layouts

Image generation can help draft explainers, posters, labeled diagrams,
timelines, and other information-rich visuals. Describe the information
hierarchy and layout, keep labels concise, and request sharp text rendering.
For dense copy or production-critical typography, review every word and finish
the asset in a design tool when needed.

## Additional considerations

* **Use likenesses with care.** When depicting a real person, provide a
  reference photo when appropriate and confirm that you have permission to use
  their likeness.
* **Ask for an original treatment.** Request a generic or original design
  instead of imitating a specific brand, product, artist, or artwork.
* **Credit is optional.** You do not need to credit OpenAI for generated images,
  though you can explain how an asset was made when that context is useful.
* **Follow applicable policies.** Use images in accordance with your
  organization’s guidelines and [OpenAI’s usage
  policies](https://openai.com/policies/usage-policies/).

## Related docs

* [Codex pricing](/codex/pricing#image-generation-usage-limits)
* [Image inputs](/codex/image-inputs)
* [Image generation API guide](/api/docs/guides/image-generation)
* [Work with files](/codex/artifacts-viewer)
* [Creating images with ChatGPT](https://openai.com/academy/image-generation/)

[Image generation gallery

Explore more image generation prompts and results.](https://developers.openai.com/api/docs/guides/image-generation?gallery=open)

* [Image inputs](/codex/image-inputs)
* [Image generation API guide](/api/docs/guides/image-generation)
* [Work with files](/codex/artifacts-viewer)
* [Creating images with ChatGPT](https://openai.com/academy/image-generation/)

[Image generation gallery

Explore more image generation prompts and results.](https://developers.openai.com/api/docs/guides/image-generation?gallery=open)

* [Codex pricing](/codex/pricing#image-generation-usage-limits)
* [Image inputs](/codex/image-inputs)
* [Image generation API guide](/api/docs/guides/image-generation)
* [Work with files](/codex/artifacts-viewer)

[Image generation gallery

Explore more image generation prompts and results.](https://developers.openai.com/api/docs/guides/image-generation?gallery=open)

[Previous

Web search](/codex/web-search)[Next

Image inputs](/codex/image-inputs)

Ask AI

## Docs agent

Loading docs agent...

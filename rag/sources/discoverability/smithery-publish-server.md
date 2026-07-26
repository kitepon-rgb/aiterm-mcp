---
title: "Publish an MCP server on Smithery"
source_url: "https://smithery.ai/docs/build/publish"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["smithery", "mcp-directory", "mcpb", "submission"]
summary: "SmitheryのURL公開とローカルstdio向けMCPB公開手順。"
relevance: "aiterm-mcpをSmitheryへ登録する際の成果物要件の一次資料。"
chars: 9482
---

> ## Documentation Index
>
> Fetch the complete documentation index at: </docs/llms.txt>
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](#content-area)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘K

### Welcome

* [Introduction](/docs)

### Connect

* [Connect to MCPs](/docs/use/connect)
* [Uplink](/docs/use/uplink)
* [Token Scoping](/docs/use/token-scoping)
* [Deep Linking](/docs/use/deep-linking)
* [Listing Your Client](/docs/use/listing_your_client)

### Publish

* [Overview](/docs/build)
* [Publish](/docs/build/publish)
* [Triggers](/docs/build/triggers)

### Integrations

* [Vercel AI SDK Integration](/docs/integrations/vercel_ai_sdk)

### Concepts

* [What is MCP?](/docs/concepts/what_is_mcp)
* [Namespaces](/docs/concepts/namespaces)
* [Smithery CLI](/docs/concepts/cli)

### Cookbooks

* [Build an OAuth-compatible client](/docs/cookbooks/typescript_oauth_client)

### API Reference

* API Reference
* servers
* skills
* tokens
* namespaces
* organizations
* connect

* Support
* [Discord](https://discord.gg/Afd38S5p9A)

[Smithery Documentation home page![light logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)![dark logo](https://mintcdn.com/smithery/qpxDbsoRMODKTkrQ/logo/logo.svg?fit=max&auto=format&n=qpxDbsoRMODKTkrQ&q=85&s=e8c976cbfecac3c8ad51112af8b9f38d)](https://smithery.ai)

Search...

⌘KAsk Assistant

* Support
* [Discord](https://discord.gg/Afd38S5p9A)
* [Discord](https://discord.gg/Afd38S5p9A)

Search...

Navigation

Publish

Publish

Publish

# Publish

Copy pageCopy page

Publish your MCP server on Smithery for distribution and analytics.

Copy pageCopy page

Publish your MCP server to Smithery for distribution, analytics, and configuration UI.

* URL
* Local (MCPB Bundle)

**Bring your own hosting** — Smithery Gateway proxies to your upstream server.

1. Go to [smithery.ai/new](https://smithery.ai/new)
2. Enter your server’s public HTTPS URL
3. Complete the publishing flow

### [​](#requirements) Requirements

* Streamable HTTP transport
* OAuth support (if auth required)

**No client registration needed.** Smithery handles client registration automatically via [Client ID Metadata Documents](https://modelcontextprotocol.io/specification/draft/basic/authorization#client-id-metadata-documents).

**Need a framework or hosting?** Build MCP servers with [xmcp](https://xmcp.dev) or host them on [Gram](https://www.getgram.ai/) — both work with Smithery’s URL publishing.

### [​](#server-scanning) Server Scanning

Smithery scans your server to extract metadata (tools, prompts, resources) for your server page.

* **Public servers**: Scan completes automatically
* **Auth-required servers**: You’ll be prompted to authenticate so we can complete the scan

Static Server Card (manual metadata)

If automatic scanning can’t complete (auth wall, required configuration, or other issues), you can provide server metadata manually via a static server card at `/.well-known/mcp/server-card.json`:

```
{
  "serverInfo": {
    "name": "Your Server Name",
    "version": "1.0.0"
  },
  "authentication": {
    "required": true,
    "schemes": ["oauth2"]
  },
  "tools": [
    {
      "name": "search",
      "description": "Search for information",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    }
  ],
  "resources": [],
  "prompts": []
}
```

**Fields:**

* `serverInfo` (required): Server name and version
* `authentication` (optional): Auth requirements and supported schemes
* `tools`, `resources`, `prompts` (optional): Capability definitions per MCP spec

The schema follows types from [`@modelcontextprotocol/sdk/types.js`](https://github.com/modelcontextprotocol/typescript-sdk). See [SEP-1649](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1649) for the spec proposal.

CLI (Advanced)

You can also publish a URL-based server via CLI with a custom config schema:

```
smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server
```

To specify a config schema, pass it as a JSON string:

```
smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server --config-schema '{"type":"object","properties":{"apiKey":{"type":"string"}}}'
```

See [Session Configuration](/docs/build/session-config) for JSON Schema format with `x-from` extension.

**For local stdio servers** — Smithery distributes a pre-built MCPB bundle that clients download and run locally.

1. Prepare your `.mcpb` bundle
2. Publish the bundle to Smithery
3. Complete the publishing flow

For MCPB authoring guidance, see Anthropic’s [Build a desktop extension with MCPB](https://claude.com/docs/connectors/building/mcpb) guide and the [MCPB specification](https://github.com/modelcontextprotocol/mcpb).

### [​](#what-gets-published) What gets published

* `server.mcpb` — the MCPB bundle distributed to clients
* Configuration schema and metadata used to render your Smithery server page
* The latest downloadable stdio artifact for local installation

API

Smithery accepts multipart `bundle` uploads for stdio releases. See [Publish a server](/docs/api-reference/servers/publish-a-server).

CLI (Advanced)

Publish a bundle with:

```
smithery mcp publish ./server.mcpb -n your-org/your-server
```

## [​](#troubleshooting) Troubleshooting

### [​](#403-forbidden-during-scan) 403 Forbidden during scan

If your deployment fails with **“Initialization failed with status 403”**, it means your server rejected Smithery’s scan request. Common causes:

* **WAF or bot protection** (e.g. Cloudflare Bot Fight Mode) blocking automated requests
* **Server returning 403 for unauthenticated requests** instead of 401 — per the [MCP auth spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), servers should return 401 to trigger OAuth discovery
* **IP-based access restrictions** or allowlists that don’t include Smithery’s IP range

Smithery sends requests with User-Agent `SmitheryBot/1.0 (+https://smithery.ai)`. These requests originate from Cloudflare Workers, which some WAF configurations block by default.

#### [​](#option-1-ensure-your-server-returns-401-not-403-for-oauth) Option 1: Ensure your server returns 401 (not 403) for OAuth

If your server requires OAuth, make sure it returns **401 Unauthorized** (not 403 Forbidden) for unauthenticated requests. Smithery uses the 401 response to detect OAuth support per [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html).

#### [​](#option-2-whitelist-smithery-requests) Option 2: Whitelist Smithery requests

Cloudflare (Free plan / Bot Fight Mode)

Bot Fight Mode on the free plan cannot be bypassed with WAF custom rules. Your options:

1. **IP Access Rules**: Go to **Security > WAF > Tools > IP Access Rules** and add an Allow rule for Smithery’s IP range
2. **Disable Bot Fight Mode**: Go to **Security > Bots > Bot Fight Mode** and toggle it off (this disables bot protection for all traffic)
3. **Upgrade to Pro**: Pro plan ($20/mo) unlocks Super Bot Fight Mode with WAF skip rules (see below)

Cloudflare (Pro+ / Super Bot Fight Mode)

Create a WAF skip rule to bypass bot protection for Smithery:

1. Go to **Security > WAF > Custom Rules**
2. Create a rule with expression: `(http.user_agent contains "SmitheryBot")`
3. Action: **Skip** > select **Super Bot Fight Mode**

Other CDN / WAF providers

Add an allow rule for requests matching User-Agent `SmitheryBot/1.0`. The exact steps vary by provider — consult your CDN/WAF documentation for configuring User-Agent-based allow rules.

#### [​](#option-3-publish-a-static-server-card) Option 3: Publish a static server card

Bypass scanning entirely by serving a `/.well-known/mcp/server-card.json` endpoint on your server. See [Static Server Card](#server-scanning) above.

## [​](#get-verified) Get verified

Once your server is published, open the server’s **Settings → Verification** page to complete the automatic official-vendor verification checklist.

Was this page helpful?

YesNo

[Previous](/docs/build)[TriggersExpose events from your MCP server so consumers can receive them as webhooks.

Next](/docs/build/triggers)

⌘I

[github](https://github.com/smithery-ai)[twitter](https://twitter.com/SmitheryDotAI)[discord](https://discord.gg/Afd38S5p9A)

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com?utm_campaign=poweredBy&utm_medium=referral&utm_source=smithery)

## On this page

* [Troubleshooting](#troubleshooting)
  + [403 Forbidden during scan](#403-forbidden-during-scan)
  + [Option 1: Ensure your server returns 401 (not 403) for OAuth](#option-1-ensure-your-server-returns-401-not-403-for-oauth)
  + [Option 2: Whitelist Smithery requests](#option-2-whitelist-smithery-requests)
  + [Option 3: Publish a static server card](#option-3-publish-a-static-server-card)
* [Get verified](#get-verified)

Assistant

Responses are generated using AI and may contain mistakes.

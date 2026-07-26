---
title: "Glama MCP Server Review Methodology"
source_url: "https://glama.ai/mcp/methodology"
source_type: docs
fetched: 2026-07-26
topic: discoverability
tags: ["glama", "mcp-directory", "submission"]
summary: "GlamaのGitHub認証、所有権確認、ビルド・実行・検査方法。"
relevance: "Glama登録要件と検索掲載条件の一次資料。"
chars: 12045
---

[Skip to main content](#main-content)

[Glama](/)

[Servers](/mcp/servers)[Connectors](/mcp/connectors)[Tools](/mcp/tools)[Clients](/mcp/clients)[Inspector](/mcp/inspector)[Pricing](/pricing)Sign Up

[Glama](/)

[MCP](/mcp)

[Methodology](/mcp/methodology)

# How Glama indexes the MCP ecosystem

Glama's registry is not a passive directory. Every server – whether open-source or a hosted connector – passes through an automated analysis pipeline that builds, runs, introspects, audits, and scores it, and then repeats that process for as long as the server exists. In the twelve months preceding this writing, Glama has performed **over one million such scans**.

This page describes that pipeline in technical detail.

## 1. Open-source MCP servers

### 1.1 Maintainer verification

Before a server is listed, the submitting maintainer authenticates through **GitHub OAuth**. Glama verifies that the submitter has write or admin access to the repository they are listing. Servers cannot be submitted on behalf of someone who does not control the source.

### 1.2 Source ingestion

For every listed server, Glama clones and continuously syncs the complete Git history from GitHub. The registry reflects the current state of the repository within minutes of a push, and every historical version – every tag, every commit – remains available for inspection. Schema changes, behavioural changes, and maintainer transitions are all visible as part of the server's permanent record.

### 1.3 Sandboxed build and execution on Firecracker

Each server is built from a Dockerfile – either authored by the maintainer and checked into the repository, or inferred by Glama's AI-assisted build system from the project structure. The resulting image executes inside an isolated **Firecracker microVM**, with an ephemeral per-build filesystem and network stack. No server executes on shared infrastructure; every build and every run is a fresh, throwaway environment.

If the AI-inferred Dockerfile fails to produce a working build, the server's profile page is preserved but **distribution is withheld**: the server does not appear in search results, category listings, or recommendations. Listings only become discoverable once a reproducible build succeeds.

### 1.4 Protocol introspection

While the server runs inside its sandbox, Glama performs the standard Model Context Protocol introspection exchange: `tools/list`, `resources/list`, `prompts/list`, and their corresponding schema endpoints. The complete JSON Schema for every tool, resource, and prompt is captured – including MCP annotation hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) – and stored as the authoritative description of the server's declared capabilities.

### 1.5 Behavioural analysis

During sandbox execution, the running process is observed at the syscall and network layers. The analysis looks for a catalogue of malicious and anomalous patterns. Representative examples – non-exhaustive, and deliberately not a full disclosure of the ruleset:

* Access to credential paths not required by the declared capability set (SSH keys, cloud credential directories, browser cookie stores)
* Outbound network traffic to hosts not referenced by the server's manifest or source code
* Payload signatures indicative of exfiltration (large base64-encoded filesystem contents inside request bodies, for example)
* Process forks into unrelated binaries
* Filesystem writes outside the declared working directory

Detected findings are classified on a two-level scale, which determines how Glama responds:

* **Malicious** – the finding indicates intent to harm a user, the ecosystem, or the integrity of the registry. The server is routed to internal review. Depending on review outcome, the maintainer is contacted or the server is de-listed from the registry.
* **Risky** – the finding is noteworthy but not necessarily hostile (an overly broad filesystem request, unexpected but non-sensitive egress, for example). The finding is surfaced on the server's public registry listing so operators can make an informed decision.

### 1.6 Tool Definition Quality Score

Every captured tool schema is scored with the **Tool Definition Quality Score (TDQS)** framework ([scoring rationale →](/blog/2026-04-03-tool-definition-quality-score-tdqs)).

TDQS evaluates every tool across **six dimensions, each on a 1–5 scale**, and rolls the per-dimension scores into an overall tier:

1. **Purpose Clarity** – does the description clearly state what the tool does?
2. **Usage Guidelines** – are the conditions under which the tool should and should not be called made explicit?
3. **Behavioral Transparency** – does the description accurately describe side effects, idempotency, and destructiveness?
4. **Parameter Semantics** – are parameter names, types, and constraints specified unambiguously?
5. **Conciseness** – is the description precise without being bloated?
6. **Contextual Completeness** – does the description give an LLM consumer everything needed to invoke the tool correctly, without external lookup?

The framework is derived from empirical research on LLM tool selection, including a study of 856 tools across 103 servers and a broader survey of 10,831 MCP servers. Those studies found that **tools with well-written descriptions are selected by models 260% more often** than poorly-documented counterparts – and that, across the public ecosystem, **97% of tools contain at least one defect, 56% lack clarity on what the tool actually does, and 89% omit usage constraints**.

Beyond the per-tool score, Glama applies the same evaluation framework at two higher levels:

* **Tool-set coherence** – whether the tools exposed by a server compose into a non-overlapping, coherent API surface, or whether they duplicate, conflict, or leave gaps.
* **Server cohesiveness** – alignment between the server's stated purpose and the capabilities it actually exposes. A server that claims to be a Postgres client but exposes arbitrary shell execution scores poorly here.

### 1.7 Score transparency

Every TDQS finding is visible on the server's public registry listing. Maintainers and operators both see:

* The full dimension-by-dimension breakdown for every tool (all six axes, individually scored)
* The separate **server cohesiveness** section, with its own breakdown
* For each dimension that falls short: **what the gap is, why it matters**, and – where applicable – concrete suggestions the maintainer can apply directly to the source

The TDQS framework is publicly documented (see the rationale post linked above) and open source ([github.com/glama-ai/tool-definition-quality-score](https://github.com/glama-ai/tool-definition-quality-score)). The scoring runs the same way on a public commit as it does on a server's internal page. Scores are not a black box.

### 1.8 Re-scan cadence

Every new commit and every rebuild triggers a full re-run of sections 1.2 through 1.6. Over **one million** such scans have been performed in the past twelve months.

## 2. Hosted MCP connectors

Hosted connectors are remote MCP services that Glama does not build but indexes with the same rigour as open-source servers. The entry point differs: rather than building from source, Glama connects to the connector as an MCP client.

### 2.1 Authenticated sandbox connection

Each connector maintainer provides Glama with a sandbox credential set – API keys, OAuth tokens, or dedicated test accounts – that grants access to a non-production environment. Glama never connects to a remote MCP service using production credentials and never operates against live user data. Connectors that implement OAuth 2.1 dynamic client registration (RFC 7591) are auto-registered without human intervention.

### 2.2 Scheduled introspection

Glama runs the same introspection exchange against the connector's `streamable-http` endpoint as it runs inside open-source sandboxes: `tools/list`, `resources/list`, `prompts/list`, and full schema capture. Introspection runs on a continuous schedule rather than a one-time ingest.

### 2.3 Schema drift and prompt-injection detection

Because connectors can change without public notice – an upstream maintainer pushing a silent tool description update, for example – Glama diffs each sweep's schema against the previous. Detected drift is preserved as a versioned history. Diffs are analyzed specifically for prompt-injection patterns embedded in tool or resource descriptions: instructions directed at an LLM consumer, role-override attempts, exfiltration prompts. Any such drift is surfaced on the connector's public profile under the same two-level severity scale (Malicious / Risky) used for open-source findings.

### 2.4 Payload monitoring

All JSON-RPC traffic generated during Glama's sandbox sessions with a connector is logged and audited against the same pattern catalogue applied to open-source builds – with response-body analysis added, since connectors serve responses remotely rather than having them inspected at the syscall layer.

### 2.5 TDQS for connectors

The Tool Definition Quality Score applies to connectors exactly as it applies to open-source servers. Scores update on every introspection sweep. Drift in score over time is itself a signal, and is recorded alongside the schema history.

## 3. Relationship to the official MCP Registry

The [official MCP Registry](https://registry.modelcontextprotocol.io) is a vendor-neutral index of MCP server metadata maintained by the MCP steering group. **Glama operates as a superset of that registry.** Glama ingests and re-publishes everything in the official registry, and layers its own sandbox-derived data on top – the behavioural analysis, the schema captures from actual server runs, the TDQS scores, the drift history, and the quality annotations.

The combined dataset – official metadata plus Glama's derived analysis – is **available through Glama's public API** at [glama.ai/mcp/reference](/mcp/reference) for any consumer to build against.

## 4. What this produces

Every registry entry – open-source or connector – carries five independent, machine-verifiable signals:

1. The full schema of every capability the server exposes.
2. A TDQS score for every tool, a tool-set coherence score, and a server cohesiveness score, each with per-dimension detail and maintainer-actionable gap analysis.
3. A behavioural profile from sandbox observation (open-source) or scheduled-connection observation (connectors).
4. A change history for both schema and behaviour.
5. A last-scanned timestamp indicating data freshness.

The same entry tells you what the server does right now, what it used to do, what it's doing differently than it used to, and whether any of those differences warrant attention. This is the difference between a directory and a registry: a directory tells you a server exists; a registry tells you what it is.

## About this methodology

This page documents the indexing pipeline used by [Glama](/). The pipeline is built and maintained by [Frank Fiegel](https://github.com/punkpeye) and contributors; the codebases behind the registry and its surrounding infrastructure live at [github.com/glama-ai](https://github.com/glama-ai). Methodology improvements and edge-case reports are welcome as issues on any of the public repositories there.

Was this helpful?

YesNo

MCP

* [MCP Servers](/mcp/servers)
* [MCP Connectors](/mcp/connectors)
* [MCP Gateway](/mcp/gateway)
* [MCP Hosting](/mcp/hosting)
* [MCP Inspector](/mcp/inspector)
* [MCP Clients](/mcp/clients)
* [MCP Tools](/mcp/tools)

AI

* [Chat](/chat)
* [AI Gateway](/ai/gateway)
* [AI Models](/ai/models)

Policies

* [Terms of Service](/policies/terms-of-service)
* [Privacy Policy](/policies/privacy-policy)
* [VDP](/policies/vulnerability-disclosure)

Resources

* [Release Notes](/release-notes)
* [Support](/support)
* [Pricing](/pricing)
* [Careers](/careers)
* [Blog](/blog)
* [Newsletter](/newsletter)

[Glama](/) – all-in-one AI workspace.

[All systems online](/status)

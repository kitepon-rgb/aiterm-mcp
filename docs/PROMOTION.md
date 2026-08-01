# Distribution & launch playbook

A 0-star repo's bottleneck is **discovery + proof**, not polish. The README/repo
craft is done; this file is the outward checklist to get aiterm-mcp *found* and
the ready-to-paste announcement drafts.

Everything below is an **outward / irreversible** action (publishing, registry
submission, repo-settings, posting). Do them deliberately. The in-repo prep
(`mcpName`, `server.json`, `glama.json`, expanded npm keywords, real demo
output) is already committed — these steps activate it.

---

## Status (live)

> **v0.20.3（2026-08-01公開）**: managed Claude／Fableの共有認証preflight、
> session内の認証変更拒否、Stop完了回収race修理を含むpatch release。
> npm・GitHub Release・Official MCP Registryで公開済み。4 manifestは0.20.3で同期し、
> Official MCP Registryのlatest entryもactive。

Done and verified:

- ✅ related tests 99/99。
- ✅ release full regression 317/317、npm pack 0.20.3は14 files、MCPB 0.20.3は13 toolsでarchive validation済み。
- ✅ 実Claude Code v2.1.220／Fable 5 low effortを独立process 3本×2波で起動し、
  追加loginなしで全6件のdone・exact result・closeを確認。
- ✅ tag CI `30680336472`は全matrixとprovenance publishがsuccess。main CI `30680332796`もsuccess。
- ✅ npm `0.20.3` is latest。14 files、SLSA provenance v1、integrityとshasumを公開APIで確認。
- ✅ GitHub Release `v0.20.3`はdraft／prereleaseでなく公開済み。
- ✅ Official MCP Registry workflow `30680345129` success。
  `io.github.kitepon-rgb/aiterm-mcp` 0.20.3はactiveかつlatest。
- ✅ この端末のglobal installを0.20.2→0.20.3へ更新。registry由来binaryで3 bins、
  initialize version 0.20.3、13 tools、stderr 0 bytes。

Previously verified public surfaces:

- ✅ **npm `0.20.3` is latest** — Quo / クオ at kitepon.dev、X author link、
  Claude Code × Codex CLI lead、現行README、provenance、14-file tarballを公開APIで確認済み。
- ✅ **Official MCP Registry** — `io.github.kitepon-rgb/aiterm-mcp` 0.20.3 is active and latest.
- ⚠️ **mcp.so** — the existing listing was claimed through GitHub on 2026-07-26.
  Do not submit a duplicate. Its editor currently discards submitted changes
  (a fresh reload restores the stale 6-tool content), so the update remains blocked.
- ✅ **Smithery** — [`kitepon/aiterm-mcp`](https://smithery.ai/servers/kitepon/aiterm-mcp)
  is public with the validated MCPB, all 13 runtime tools, repository/license/icon
  metadata, and the Claude Code × Codex CLI lead. The public page scored 84/100
  immediately after metadata completion.
- ✅ **GitHub topics** include the requested discovery set; **v0.20.3 Release** is public.
- 🔄 **awesome-mcp-servers** — PR [#7620](https://github.com/punkpeye/awesome-mcp-servers/pull/7620) open (awaiting maintainer merge).
- ✅ **Announced** on r/mcp.

Remaining:

- 🔄 **Glama** — GitHub OAuth and the Add Server form were completed on
  2026-07-26. The submission is now awaiting Glama's public review/build/scan;
  `glama.json` is already present.
- ⬜ **Show HN / X / dev.to** — optional extra reach (drafts below).
- ⬜ **Animated demo GIF** — needs a real SSH target + a client-UI recording; the README currently shows real captured text instead.

The lettered steps below are kept as a re-run reference and for the announcement drafts.

---

## Already done in-repo (this session)

- `package.json`: added `mcpName: io.github.kitepon-rgb/aiterm-mcp`, expanded
  keywords to include `mcp-server`, `claude-code`, `cursor`, `devtools`.
- `server.json`: Official MCP Registry manifest (npm / stdio).
- `glama.json`: Glama maintainer-claim file.
- `README` (EN + JA): plain-English lead + SSH-pain hook up top, real captured
  demo output (no more placeholder GIF mock), named competitors in the
  comparison, install de-duplicated, constraints moved below the fold,
  maintained/Status line.

---

## A. Re-publish to npm so the new keywords/mcpName take effect（完了）

npm only re-indexes keywords on a new published version. Bump a patch, keep
`server.json` `version` in lockstep, then let CI publish on the tag.

Completed with v0.20.3 on 2026-08-01. It publishes the managed Claude/Fable shared-auth
preflight and completion-marker race repair. Acceptance evidence is recorded in
[`ADR 0021`](adr/0021-release-0.20.3-acceptance.md). The preceding public-surface correction
remains recorded in [`ADR 0019`](adr/0019-release-0.20.2-public-presentation-acceptance.md).

```bash
# 1. bump package.json + package-lock.json + server.json to the same new version (e.g. next patch)
#    (add a CHANGELOG entry for the release)
# 2. commit, then tag — CI (.github/workflows/ci.yml) publishes to npm with provenance on v* tags
git tag vX.Y.Z
git push origin main --tags
```

> Keep `package.json.version` == `server.json.version` == the npm-published
> version, or the Official Registry will reject the publish.

## B. Official MCP Registry (registry.modelcontextprotocol.io)

The one upstream that auto-feeds PulseMCP and the GitHub MCP Registry — one
action, multi-directory reach. `server.json` is already in the repo.

```bash
# install the publisher CLI (see modelcontextprotocol/registry releases)
mcp-publisher login github         # OAuth as kitepon-rgb
mcp-publisher publish              # reads ./server.json
```

Optional: add this as a CI step on the publish job (OIDC) so every release
re-registers automatically.

## C. mcp.so

The server is already listed. Do **not** submit it again. Sign in and update or
refresh the existing entry so it reflects the current 13-tool surface and
completion model. The submission form requires a repository URL; the name is
optional. The free route is queued review with random placement and nofollow;
the paid route shown on 2026-07-26 was a one-time immediate/featured option.

## D. Glama (https://glama.ai/mcp/servers)

`glama.json` (maintainers) is already in the repo. Submit the repo URL while
authenticated with GitHub, then verify ownership. Glama's current methodology
checks write/admin access through GitHub OAuth and clones, builds, runs, and
scans the repository. A failed inferred build may leave a page present but
withhold it from search, so a successful submit is not the final verification.

The live Add Server form checked on 2026-07-26 required exactly:

- Name
- A 1–2 sentence description
- Public GitHub repository URL

It did not request `server.json`. The `aiterm-mcp` submission was accepted for
review with `https://github.com/kitepon-rgb/aiterm-mcp`.

## E. Smithery (https://smithery.ai)

The old GitHub-repository publishing flow is no longer sufficient for this
stdio package. Smithery accepts either:

- a public HTTPS Streamable HTTP endpoint, or
- a prebuilt `.mcpb` bundle for a local stdio server.

aiterm-mcp is a local stdio package. Build its bundle with:

```bash
npm run mcpb:build
```

The command validates `mcpb/manifest.json`, bundles the compiled server and
production dependencies, and writes `dist/aiterm-mcp.mcpb`. The bundle's
archive integrity and staged initialize / tools-list smoke (v0.20.0, 13 tools)
passed on 2026-07-26.

```bash
smithery mcp publish dist/aiterm-mcp.mcpb -n kitepon/aiterm-mcp
```

Smithery CLI 1.2.0 could authenticate and create the server, but its MCPB
adapter forwarded the manifest's MCPB-spec `tools` summaries without the full
MCP `inputSchema` required by Smithery's release API. Omitting `tools` instead
failed with `No values to set`. The official multipart release API was used
with the unchanged, valid MCPB plus the 13 tool definitions returned by the
running server. Release
`d392fd46-32e4-4cb8-849d-ad6f391f05a7` completed with `SUCCESS`.

Public endpoints:

- Server page: <https://smithery.ai/servers/kitepon/aiterm-mcp>
- Smithery MCP URL: <https://aiterm-mcp--kitepon.run.tools>

## F. awesome-mcp-servers PR (punkpeye/awesome-mcp-servers)

Highest-SEO community list (DoFollow GitHub links). Fork, add under the
terminal/command-line category, alphabetical, then open the PR. Suggested line:

```md
- [aiterm-mcp](https://github.com/kitepon-rgb/aiterm-mcp) 🟩 🏠 - One persistent tmux-backed terminal for AI: `ssh`, `docker exec`, and REPLs nest inside a single authenticated session (no re-auth per command); token-reduced reads.
```

(Legend: 🟩 = TypeScript/Node, 🏠 = local service. Confirm the current legend in
that repo's README before submitting; add the Glama badge from step D.)

## G. GitHub topic

Completed on 2026-07-26. The repository now has all requested topics:
`mcp`, `model-context-protocol`, `tmux`, `claude-code`, and `codex-cli`.

```bash
gh repo edit kitepon-rgb/aiterm-mcp --add-topic codex-cli
```

## H. Backfill the v0.3.1 GitHub Release (closes the timeline gap)

```bash
gh release create v0.3.1 \
  --title "v0.3.1 — docs-only republish" \
  --notes "Documentation-only release so the npm page reflects the refreshed README (Quickstart, Demo, clearer CTA). No code or behavior change from 0.3.0."
```

Going forward: attach a Release to every `v*` tag so the Releases tab stays
gap-free.

## I. Third-party trust badge (no audience required)

Get an automated trust/quality score badge (e.g. MseeP / Archestra) and add it
to the badge row — third-party validation a brand-new repo otherwise lacks.

---

## Announcement drafts

Sequence: land **A–D + the demo GIF** first, *then* announce. Anchor every post
on the SSH-persistence wedge, not "another tmux MCP".

### Show HN

**Title:**
> Show HN: aiterm-mcp – one persistent terminal for AI, so SSH authenticates once

**Body:**
> I kept letting Claude Code run commands on my homelab over SSH, one tool-call
> at a time. Each call was its own connect → auth → disconnect: re-typing the
> passphrase every time, short-lived sessions piling up, and eventually
> `fail2ban` banning me from my own box. The security meant to stop attackers
> was stopping me.
>
> aiterm-mcp is a tiny stdio MCP server that holds **one** persistent terminal
> (tmux-backed). You `ssh host` *inside* it once; every later command rides the
> same authenticated session. SSH, `docker exec`, and REPLs aren't separate
> tools — they're just text you send into the one PTY. Reads come back
> token-reduced (per-command reducers for git/grep/pytest), and there's a
> 4-layer completion detector so the AI knows when a command is actually done.
>
> Thirteen tools, no clone/build
> (`npx -y aiterm-mcp`), works on Linux/WSL2/macOS and native Windows (via a WSL
> tmux bridge). MIT.
>
> Repo: https://github.com/kitepon-rgb/aiterm-mcp
> Would love feedback on the completion-detection approach (quiescence vs prompt
> matching) — it's the hardest part.

### r/mcp and r/ClaudeAI

**Title:** I built an MCP server that gives the AI one *persistent* terminal — SSH authenticates once, not per command

> Body: same story as above, shorter. Lead with the fail2ban-lockout pain, show
> the `pty_open → ssh inside it → run → token-reduced read` flow, link the repo,
> ask what completion-detection edge cases people hit with terminal MCPs.

### X / Twitter thread

1. Letting an AI drive SSH one command at a time = re-auth every call, sessions
   piling up, and `fail2ban` locking you out of your own server. I got banned
   from my own box. So I built aiterm-mcp. 🧵
2. It holds ONE persistent terminal (tmux). You `ssh host` inside it once —
   every command after rides the same authenticated session. SSH, docker, REPLs
   are just text you send in, not separate tools.
3. Reads come back token-reduced (git/grep/pytest reducers), with a 4-layer
   "is the command done?" detector. `npx -y aiterm-mcp`, 13 tools, MIT,
   Linux/WSL2/macOS/Windows. [demo gif]
4. Repo + one-line Claude Code install 👇 https://github.com/kitepon-rgb/aiterm-mcp

(Attach the demo GIF to tweet 3. Reuse `.github/og.png` as the card image.)

### dev.to / blog article

**Title:** "fail2ban banned me from my own server — so I gave my AI one persistent terminal"

Outline: the pain (per-command SSH re-auth, session sprawl, self-lockout) → why
one-shot shell tools make it worse → the one-PTY design (nest instead of
new-tool-per-backend) → completion detection (quiescence) → token reduction →
install + a real captured session. Cross-link from the repo README once live.

---

## The remaining visual asset: animated demo GIF

The README now shows **real captured** text output, but an animated GIF of the
SSH-nesting flow is still the single highest-leverage visual. To record it on a
box with a real SSH target:

```bash
# install once
npm i -g svg-term-cli          # or: cargo install --git https://github.com/asciinema/agg
sudo apt install asciinema     # or pip install asciinema

# record the killer flow through your MCP client (or drive the tools directly):
#   pty_open → pty_send "ssh <host>" → pty_read until prompt
#   → pty_send "<a real command>" → pty_read (token-reduced)
asciinema rec docs/demo.cast
svg-term --in docs/demo.cast --out docs/demo.svg --window   # crisp, theme-aware
#   or: agg docs/demo.cast docs/demo.gif

# then embed at the top of the Demo section:
#   <p align="center"><img src="docs/demo.svg" alt="open a PTY, nest SSH, run a command, read token-reduced output" width="100%"></p>
```

Keep it under ~25s and pre-seed the host so no secrets appear on screen.

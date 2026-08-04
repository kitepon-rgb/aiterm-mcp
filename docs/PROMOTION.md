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

> **v0.23.0公開完了（2026-08-04）**: 4つのagent launcherへ任意の
> `throughline_source_session`を追加。Throughlineの読み取り専用handoff contextを元DBのsession所属を
> 変えずに新ミッションへ前置きし、別vendorのclean sessionへportable forkできる。

- ✅ final full regression 335/335、MCPB validate、Codex source→Claude targetの代表live smoke。
- ✅ release commit `7d92048e09b9afca6532c71769c3a3b36d527024`、main CI `30919026450`、
  tag CI `30919295270` success。
- ✅ npm provenance 0.23.0、GitHub Release＋MCPB、Registry workflow `30919622861` success。
- ✅ Official Registry 0.23.0 active/latest。global install 0.23.0とThroughline 0.9.0で、
  source marker、mission marker、DB ownership不変、clean launch、session残骸0を確認。

現行の完全公開済みchainはv0.23.0。設計は[portable fork plan](26-throughline-portable-fork-plan.md)、
公開receiptは[ADR 0027](adr/0027-release-0.23.0-acceptance.md)を正とする。

> **v0.22.0公開完了（2026-08-04）**: 4つのagent launcherを通常project／user環境の完全共有へ移行し、
> aiterm所有範囲を完了相関stateへ限定した。受入は[ADR 0026](adr/0026-release-0.22.0-acceptance.md)。

> **v0.21.3公開完了（2026-08-03）**: Codex完了正本をStop hookからroot rollout
> transcriptの`task_complete.turn_id`へ移し、hook `exit 127`で`aiterm-wait`とtranscript回収が
> 同時に永久待ちになる単一障害点を除去したpatch release。未使用のCodex hook実装も配布物から撤去し、
> clean buildで旧`dist`からの再混入を防ぐ。0.21.0の`write_scope`指定時だけstructured receiptから
> scope／enforcementが消える逆条件も修理した。0.21.0はnpmへ公開済みだがtag／GitHub
> Releaseがなく、server.json／MCPBが0.20.3に残った公開面分裂も、0.21.3で公開連鎖と4 manifestを再同期した。

Release gates:

- ✅ 根本原因を実障害sessionで再現し、root rolloutの`task_complete`がhook失敗より先に永続化されることを確認。
- ✅ 実障害session 2件の完了・最終回答を再送なしで回収。
- ✅ package／lock／server／MCPBを0.21.3へ同期し、日英README・設計・履歴・RAG・ADR・
  廃止hookのソース／配布物撤去を更新。
- ✅ Windows identity timeout修正後のfull regression 322/322、write_scope structured receipt実MCP回帰、
  release metadata 2/2、MCPB validate、npm pack 13 files、旧Codex hook非同梱、
  changed-doc local link check、diff hygiene。
- ⚠️ v0.21.1 tag CIはGrok fixtureが実CLIを暗黙利用してLinux/macOSで失敗し、publish jobはskip。
  tagは動かさず、偽binへ固定した。
- ⚠️ v0.21.2 tag CIはWindows 20のprocess identity用PowerShellが1秒上限を超えて失敗し、publish
  jobはskip。tagは動かさず、DACLと同じ5秒予算へ統一したv0.21.3で公開を完遂した。
- ✅ release commit `902379325c947030d5b6a8eb79e963e3f6f99c51`をmainへpush。main CI
  `30813089848`とtag CI `30813318513`は全必須job success。
- ✅ npm 0.21.3をSLSA provenance付きで公開。GitHub Release `v0.21.3 — Codex completion recovery`、
  Official Registry workflow `30813724499`、Registry active/latestを確認。
- ✅ npm由来の隔離installとこの端末のglobal installを0.21.3へ更新。3 bins、13 tools、stderr 0、
  Codexの5引数完全例、廃止Codex hook非同梱を実配布物で確認。

v0.21.3は直前の完全公開chain。v0.21.0はnpm-only、v0.21.1／v0.21.2はpublish前に
tag CIが停止した履歴として保持し、tag移動や後付け成功を捏造しない。公開receiptは
[ADR 0023](adr/0023-release-0.21.3-acceptance.md)へ固定した。

Previously verified public surfaces:

- ✅ **npm `0.22.0` is latest** — provenance、integrity／shasumを公開APIで確認済み。
- ✅ **Official MCP Registry** — `io.github.kitepon-rgb/aiterm-mcp` 0.22.0 is active and latest.
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

v0.21.3の設計は[`ADR 0022`](adr/0022-codex-rollout-completion.md)、公開receiptは
[`ADR 0023`](adr/0023-release-0.21.3-acceptance.md)、完了工程は
[`archived release plan 22`](archive/22_release-0.21.3-plan.md)を正とする。

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

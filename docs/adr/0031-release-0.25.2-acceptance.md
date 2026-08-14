# ADR 0031: v0.25.2 Grok設定変更follow-upの公開受入

- Status: Accepted
- Date: 2026-08-14

## Release identity

- release commit／tag target: `86a784d1e550c56f19dfc1cfcba1f8fd071d3881`
- tag／package: `v0.25.2`／`aiterm-mcp@0.25.2`
- canonical repository: `kitepon/aiterm-mcp`
- implementation Decision: [ADR 0029](0029-grok-composer-agent-parity-scope.md)
- prior public acceptance: [ADR 0030](0030-release-0.25.1-acceptance.md)

## Acceptance evidence

### Test and package gates

- Grok成功通知を出さず常駐footerだけを変更するfixtureは修正前0/1、修正後2/2で、Grokの
  同一session変更を含む関連試験159/159がgreen。
- local fullは348/348。npm packは13 files、MCPB validate／packもgreen。
- main CI [`31762948958`](https://github.com/kitepon/aiterm-mcp/actions/runs/31762948958)とtag CI／
  Trusted Publishing [`31763103594`](https://github.com/kitepon/aiterm-mcp/actions/runs/31763103594)は、
  macOS native・Linux native・Windows native・WSL2で同じfullを通過した。

### Public artifacts

- npm 0.25.2のintegrityは
  `sha512-4ObsIWdh3YI/GA6olxSgDrFieQGMd/DvRpu62N9ZLJdKy4holDryCBWdxc8ahMZ/d/x1Ba4h4uqUmxHnrT0GnQ==`、
  shasumは`0712f39f7b85387ed59bc584faa39a3a9a9555f1`。
- [GitHub Release](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.25.2)はdraft／prereleaseでなく、
  `aiterm-mcp.mcpb` 3,484,661 bytesを添付。SHA-256は
  `73aab4b95e6b446c72f3b40175dd42e184ae8a96dc388784e5317445bc65ff78`。
- Registry run [`31763295369`](https://github.com/kitepon/aiterm-mcp/actions/runs/31763295369)はsuccess。
  Official MCP Registryの`io.github.kitepon/aiterm-mcp` 0.25.2は`active`かつ`isLatest:true`。

### Registry-derived runtime smoke

- npm由来global installは0.25.2の非symlink packageで、release buildの`dist/index.js`とbyte一致。
- `aiterm-mcp`、`aiterm-runtime-errors`、`aiterm-wait`の3 binを公開し、MCP initialize後の
  `tools/list`は14 tools。`agent_configure`は`session_id`、`model`、`reasoning_effort`を公開し、stderrは0 bytes。
- 同じ製品コードをPeertableのGrok 4.6実席で確認し、同一sessionの4.6→4.5→4.6変更、room参加、
  DM起床がgreen。caller側のretry、再起動、失敗の成功丸めは追加していない。

## Decision

v0.25.2を公開受入する。Grok Build 1.0.3でtransientな成功通知が消えても、変更前には無かった
要求model／effortがvendor自身の常駐footerへ現れた場合を最終状態として確認する。明示エラーと成功通知を
第一の判定に保ち、変更前から同じfooterだった場合は成功へ丸めない。

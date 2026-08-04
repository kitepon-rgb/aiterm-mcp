# 0026. v0.22.0 shared agent environmentの公開受入

## Status

Accepted — 2026-08-04

## Release identity

- release commit / tag target: `90e2b1265ac5c9269e31ae9b65799c596df63ca2`
- tag / GitHub Release: `v0.22.0 — shared project agents with delegation lineage`
- package: `aiterm-mcp@0.22.0`
- design decision: [ADR 0025](0025-shared-agent-environment-and-lineage.md)

## Acceptance evidence

### Local and live gates

- final full regression: 329/329 pass、fail 0。
- 4vendor depth 1 live smoke: Claude／Codex／Grok／Composerがすべて`role=subagent`、`parent=host-root`、
  `depth=1`、`delegation=true`、vendor別lineageを返してdone。
- nested live smoke: Claude子がaitermの`claude_agent`を1回使い、孫が`parent=<親session>`、`depth=2`、
  `delegation=true`、`host-root>親>孫`lineageを返してdone。親子session残骸0。
- npm pack preflight: 13 files、118,521 bytes、unpacked 400,244 bytes。
- MCPB: manifest validate pass、0.22.0 archive pack pass。

### Main ancestry and CI

- `npm run verify:release-commit`: release commitが`origin/main`へ着地済みと確認。
- main CI `30880757338`: success。
- tag CI `30880912526`: 全必須jobとnpm provenance publishがsuccess。
- tagは移動せず、GitHub Releaseはdraft=false／prerelease=false、publishedAt=`2026-08-04T05:30:41Z`。

### Public package and Registry

- npm: version `0.22.0`、integrity
  `sha512-GtD9IJZsE/p7xiKPdcGR5GzjL+E2FnDMbEimL/WlDE9fn0hkRFpGRRVtAn3qG6S3+DM8xiPtmMTYvzAK2RojKg==`、
  shasum `c721cbbca2f1d6351b146858287156562e7334c8`。
- npm registry由来の隔離install: version/init 0.22.0、3 bins、13 tools、stderr 0 bytes。
  4 launcherのtool descriptionは通常`HOME`共有と`delegation_allowed=true`をすべて明示。
- この端末のglobal installをregistry版0.22.0へ更新。global installed coreから実Claudeを起動し、
  `AITERM_PUBLIC role=subagent parent=host-root depth=1 delegation=true`とlineageを回収してdone。
- Official MCP Registry workflow `30880912702`: success。公開APIで
  `io.github.kitepon-rgb/aiterm-mcp` 0.22.0は`active`かつ`isLatest:true`。

## Failure records retained

- 最初の実Grok smokeでは、共有MCP初期化中に入力欄だけをreadyと誤認してpromptが消失した。
  `mcp_init_completed` gateを追加し、focused回帰とGrok/Composer再smokeで修理済み。
- 最初の最終full regressionは公開語の訂正後も旧`managed Claude`文字列を期待した1件だけfail。
  実際の拒否挙動は正しく、期待値同期後のfocused 1/1とfull 329/329がgreen。

## Decision

v0.22.0を公開受入する。4 launcherは通常project/user環境を共有し、aitermは完了相関stateだけを分離する。
子の自己認識とlineageは再委譲能力を奪わず、permission/trustはvendorの通常境界を維持する。

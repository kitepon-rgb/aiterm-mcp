# ADR 0030: v0.25.1 Grok／Composer parityの公開受入

- Status: Accepted
- Date: 2026-08-14

## Release identity

- release commit／tag target: `1346066507f38e8d003208a1a2a3cd0220f263fa`
- tag／package: `v0.25.1`／`aiterm-mcp@0.25.1`
- canonical repository: `kitepon/aiterm-mcp`
- Official MCP Registry: `io.github.kitepon/aiterm-mcp`
- implementation Decision: [ADR 0029](0029-grok-composer-agent-parity-scope.md)
- release plan: [factory CI and repository transfer](../30-factory-ci-repository-transfer-release-plan.md)

## Acceptance evidence

### Factory CI and npm

- tag CI／Trusted Publishing [`31747150072`](https://github.com/kitepon/aiterm-mcp/actions/runs/31747150072)は
  macOS native・Linux native・Windows native・WSL2の同一`npm test`を各347/347通過し、publishもsuccess。
- 工場workflowが渡した`FACTORY_CI_JOBS`はmacOS 10、Linux 32、Windows 32、WSL2 24。
- npm 0.25.1はSLSA provenanceを持つ。integrityは
  `sha512-0JX+96X1/OWf7YCf0JRP3GHB0Zht1Ij/e1BDdthFKXiSuc5e/R/I4yIK64U7Oan9+5QH2Efz4XGwzGPbfkAdZw==`、
  shasumは`0022b2b6b94265ad8adb413d54c65fc6a13f0668`。

### GitHub Release and Official Registry

- [GitHub Release](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.25.1)はdraft／prereleaseでなく、
  `aiterm-mcp.mcpb` 3,484,366 bytesを添付。SHA-256は
  `e2889f8438390fce6ea482dd7f6adcce563752c07a6a387a0bc4a364ed2c4774`。
- release起点Registry run [`31747392229`](https://github.com/kitepon/aiterm-mcp/actions/runs/31747392229)は
  `server.json` descriptionの100文字制約超過をHTTP 422で明示した。OIDC認証とnpm存在確認は成功していた。
- description、issue導線、OIDC説明を正規ownerへ揃えたcommit
  `56d2df24b0454801ff4a60e742e4fb55a552472f`のmain CI
  [`31747557265`](https://github.com/kitepon/aiterm-mcp/actions/runs/31747557265)は4環境green。
- mainから再dispatchしたRegistry run
  [`31748407046`](https://github.com/kitepon/aiterm-mcp/actions/runs/31748407046)はsuccess。
  公開APIで0.25.1は`status: active`かつ`isLatest: true`。tagは移動していない。

### Registry-derived runtime smoke

- この端末のglobal installと隔離installはともにnpm `aiterm-mcp@0.25.1`。3 bin
  (`aiterm-mcp`、`aiterm-runtime-errors`、`aiterm-wait`)を解決し、両installの`dist`は一致した。
- global配布物のMCP initializeはversion 0.25.1、tools/listは14 tools。Claude／Codex／Grok／Composerの
  4 launcher schemaを確認し、stderrは0 bytes。
- byte-identicalな配布`dist`でGrok live smokeを実行し、`done`、`role=subagent`、親session、depth 1、
  `delegation=true`、lineageをtranscriptから回収した。smoke sessionはclose済み。
- Composer既定`grok-composer-2.5-fast`は現行catalogの`grok-4.6`／`grok-4.5`に無いため、
  PTY作成前にcode 2で明示失敗した。別modelへfallbackせず、`shared_composer_*` sessionは0。

## Decision

v0.25.1を公開受入する。Claude／Codexの共通launcher面はGrok／Composerへ届き、同一vendor／cross-vendorを
caller種別で制限しない。現行vendor catalogがComposer modelを提供しない環境では、利用可能と偽らず
session作成前に失敗する。製品CIは`kitepon/dotagents`の共通工場workflowだけを呼び、独自runner、
OS matrix、役割分散、capacity、fallbackをAiterm側へ実装しない。

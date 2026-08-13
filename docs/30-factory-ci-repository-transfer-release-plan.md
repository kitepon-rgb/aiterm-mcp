# Factory CI and repository transfer release plan

Status: Complete — v0.25.1公開受入済み（2026-08-14）

## 現行の正本

- GitHub repositoryは`kitepon/aiterm-mcp`だけを正規名とする。
- npm packageは`aiterm-mcp`、npm OIDC Trusted PublisherはGitHub Actionsの
  `kitepon/aiterm-mcp`／`.github/workflows/ci.yml`だけを正とする。
- Official MCP Registry名は`io.github.kitepon/aiterm-mcp`とする。移転前の
  `io.github.kitepon-rgb/aiterm-mcp`は過去版の公開履歴であり、現行設定例に使わない。
- archive、release acceptance ADR、evidenceは当時の事実を保持するため書き換えない。
  新しい利用者・contributor・公開手順はREADME、CONTRIBUTING、SECURITY、package／registry
  manifest、本書だけを読むことで移転後の正規面へ到達できなければならない。

## 最終CI契約

実装中の確認は変更に直結するfocused testをローカルで行う。関連targetがgreenになった後、
`npm test`をローカル最終確認として1回実行する。GitHub Actionsは原因調査や修正効果の確認に使わない。

GitHub Actionsの最終CIはself-hostedの次の4環境で同時に開始する。

- `macos-native`
- `linux-native`
- `windows-native`
- `wsl2`

4台はGitHub Organization `kitepon`のDefault runner groupに所属し、publicを含む全repositoryへ
共有する。`aiterm-mcp`をOrganization外へ置いた状態では共有runnerを使えず、4jobはqueueに残る。

4環境はすべて同じ`node --version && npm --version && npm ci && npm test`を実行する。
OS別の役割分散、縮小suite、GitHub-hosted runnerによる最終testの代用はしない。runnerに必要な
Node、npm、tmux／WSL bridgeは各OSの標準システム環境へ導入し、workflow内で補完しない。
Windows native runnerは初期化済みWSL distroを所有するWindows userのinteractive Scheduled Taskで
起動する。`NETWORK SERVICE`等のservice accountはuser所有WSL／tmuxを列挙できないため使用しない。

## 公開契約

`v*` tagのnpm publishは4環境fullがすべてgreenになった後だけ起動する。publish jobは
`git merge-base --is-ancestor "$GITHUB_SHA" origin/main`を必須gateとし、GitHub Actions OIDCで
`npm publish --provenance --access public`を実行する。npmに同一versionが既に存在する場合だけ
idempotent skipを許し、それ以外の失敗は表面化させる。

`v0.25.0`はrepo移転後もTrusted Publisherが旧ownerを参照したため、provenance署名後のnpm PUTが
E404になった。tagはcommit`b01caba21bc6dd76b830b8983c07912b4a56fd13`から動かさない。repository、
CI、Trusted Publisher、manifestを修理した配布物は`v0.25.1`として公開する。

完了条件は、4環境CI、npm provenance、GitHub Release＋MCPB、Official MCP Registry、registry由来
隔離install、この端末のglobal install、3 bin、14 tools、4 launcher schema、stderr 0、installed dist
一致、Grok live smoke、Composer model不在時のsession作成前fail-loudをすべて実測し、公開receiptへ固定すること。

## 公開receipt

- release対象commit／tag: `1346066507f38e8d003208a1a2a3cd0220f263fa`／`v0.25.1`。
- tag CI／Trusted Publishing: `31747150072` success。4環境は同じ`npm test`を実行し、各347/347 green。
- 論理CPU並列度: macOS 10、Linux 32、Windows 32、WSL2 24を`FACTORY_CI_JOBS`へ設定。
- npm: `aiterm-mcp@0.25.1`、SLSA provenance、integrity
  `sha512-0JX+96X1/OWf7YCf0JRP3GHB0Zht1Ij/e1BDdthFKXiSuc5e/R/I4yIK64U7Oan9+5QH2Efz4XGwzGPbfkAdZw==`。
- GitHub Release: `aiterm-mcp v0.25.1`。MCPBは3,484,366 bytes、SHA-256
  `e2889f8438390fce6ea482dd7f6adcce563752c07a6a387a0bc4a364ed2c4774`。
- release起点Registry run `31747392229`はdescriptionの100文字制約超過を422で明示失敗した。
  descriptionを短縮し、現行GitHub導線とOIDC説明を修理したcommit
  `56d2df24b0454801ff4a60e742e4fb55a552472f`のmain CI `31747557265`は4環境green。
- mainから再dispatchしたRegistry run `31748407046`はsuccess。公開APIで
  `io.github.kitepon/aiterm-mcp` 0.25.1は`active`かつ`isLatest:true`。
- npm由来のglobal／隔離installは0.25.1で一致。3 bin、MCP 14 tools、4 launcher schema、stderr 0、
  共通`dist`のバイト一致を確認した。
- Grok live smokeは`done`と`role=subagent`／親session／depth 1／lineageを回収した。
  Composer既定`grok-composer-2.5-fast`は現行catalogに無いためsession作成前にcode 2でfail-loudし、
  `shared_composer_*` sessionを残さなかった。

公開受入Decisionは[ADR 0030](adr/0030-release-0.25.1-acceptance.md)を正とする。

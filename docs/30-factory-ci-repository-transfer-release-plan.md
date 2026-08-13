# Factory CI and repository transfer release plan

Status: Active — v0.25.1公開工程

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

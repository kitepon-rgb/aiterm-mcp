# v0.24.3 launcher env_vars／Codex fast footer根治・公開計画

## Status

Completed — 2026-08-13

## 原因

aitermのPTYを所有するtmux serverはMCP processより長寿命である。agent launcherがshell／tmux serverの
通常環境だけに依存すると、server起動後に現在のMCP processへ割り当てられた席identityやworkflow変数が
起動agentへ届かない。tmux serverの再起動・環境更新で回避すると、既存sessionの持続性を壊し、呼出元が
所有する現在値ではなくserver側stateを更新する別責務になる。

同時にCodex v0.147は長寿命画面のreasoning effort直後へ`fast`を表示し、従来のfooter文法から外れた
`medium fast ·`を`agent_configure`がreadyでないと誤拒否した。実席はidleであり、再描画や再起動で
表示を古い形へ戻すのでなく、vendorが実際に持つfooter文法をfrontend判定へ反映する必要がある。

## Decision

1. 4つのlauncherは任意`env_vars`へ環境変数名だけを受ける。
2. 起動時に現在のaiterm MCP processから存在する値だけを読み、shell quoteしたprefixとしてその1回の
   vendor commandへ加える。先に起動したtmux serverの環境は値の正本にしない。
3. 未設定名は省略し、`^[A-Za-z_][A-Za-z0-9_]*$`に合わない名前はsession作成前に明示拒否する。
4. 全環境の暗黙copy、name/value map、tmux server環境の更新・再起動、retry、fallbackは追加しない。
5. 値はMCP tool引数には含めない。ただしPTY起動コマンドと`.lastcmd`を経由し、起動先vendorと同じOS userへ
   到達するためsecret transportではない。席identityやworkflow routingなど、開示可能な値だけを指定する。

通常`HOME`、vendor home、project/user/local設定、MCP、plugin、skill、permission、trust、memory、historyの
共有契約は不変である。`env_vars`はその通常環境を置き換えるsnapshotではなく、指定名だけの起動単位overlayである。

Codex frontendは`<model> <effort> [fast] · <cwd>`と入力欄の積で認識する。`fast`は任意であり、既存footer、
header、busy除外、入力欄単独／footer単独をreadyへ昇格させない契約は維持する。

## Acceptance

- [x] 4 launcherの公開schemaに`env_vars: string[]`がある。
- [x] 現在のMCP processより先にtmux serverを起動した条件で、指定した現在値がagentへ届く。
- [x] 不正名はsession作成前に失敗し、残骸を作らない。
- [x] Peertable実席9席で各actor値が起動agentから読める。
- [x] Codex v0.147の`fast`入りfooterがready／idle readyになり、実席soraを同一sessionのままLuna→Terra変更できる。
- [x] package／lock／server.json／MCPB manifestが0.24.3で一致する。
- [x] focused test、full regression、npm pack dry-run、MCPB validate／pack、staged MCP smokeがgreen。
- [x] release commitがorigin/mainの祖先で、main CIがgreen。
- [x] `v0.24.3` tag CIとnpm Trusted Publishingがgreen。
- [x] npm latest／integrity／provenance、GitHub Release＋MCPB、Official MCP Registry active/latestを確認する。
- [x] registry由来global installで0.24.3、3 bins、14 tools、4 launcher schema、stderr 0、installed dist一致、
  stale tmux server条件の現在値継承を確認する。

## Rollback

公開versionやtagを上書き・移動しない。問題があれば原因を根治した新しいpatch versionをmainから前進公開する。

## Release receipt

### Local gate

- env継承／不正名／公開schema／version focused 4/4、`fast` footer focused 2/2 green。
- 最初のfull regressionは既存raw PTY配送試験が一時的に空出力となり340/341。該当試験を単独で1/1 greenに
  切り分け、再full 341/341を確認。`fast` footer regression追加後の最終candidateは342/342 green。
- npm pack dry-runは13 files、124,939 bytes。MCPB validate／packはversion 0.24.3、2261 files、
  SHA-256 `c158aacf6016851d5ace5b24c76a3c0eb3633a8a28091c77d4610de2c00cec7e`でgreen。
- staged MCPはversion 0.24.3、14 tools、4 launcherの`env_vars` array schema、
  `aiterm.agent-configure-result.v1`、stderr 0を確認。

### Public result

- release commit `6ccb1a3add62e183d321e1ad97cd008da31026a2`は`origin/main`へpush済みで、
  main CI `31664655592`がLinux 18/20/22、macOS 18/20/22、Windows 20/22の全job green。
- `v0.24.3`はrelease commitへ固定。tag CI／Trusted Publishing `31664795704`は全matrixとpublishがgreen。
- npm latest 0.24.3。integrity
  `sha512-D8++YiQzAj6pASlUPc9X/T8IB98I2uW5BiLBzq5+zxvEI7Kev+PAke4gLiPCgcI1jjF+lfhaUEPGL2u90+1dUg==`、
  shasum `61ccd19668c40a9fa6a497e8427efd80b3709904`、SLSA provenanceあり。
- GitHub Release `v0.24.3 — selected launcher environment and Codex fast readiness`を公開。添付MCPBは
  3,482,565 bytes、SHA-256 `c158aacf6016851d5ace5b24c76a3c0eb3633a8a28091c77d4610de2c00cec7e`。
- Official MCP Registry workflow `31664974149`がgreen。公開APIで0.24.3は`active`かつ`isLatest:true`。
- npm registry由来global install 0.24.3は非symlink、3 bins、14 tools、4 launcherの`env_vars` schema、
  `aiterm.agent-configure-result.v1`、stderr 0、installed `dist/*.js`とrelease commit buildの全バイト一致を確認。
- installed root-fix smokeは、先にtmux serverへ旧actor値を持たせた後、現在MCP processの値で上書きされ、
  未設定名は省略されることを確認。`medium fast ·` footerもready／idle ready。初回検査はmacOSの長い
  test TMPDIRでtmux socket長上限に達しsession作成前に失敗したため、短い専用`/tmp`で同じ検査をgreenにした。

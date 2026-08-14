# Grok／Composer agent parity・公開計画

## Status

Complete — 2026-08-14（v0.25.1公開受入済み、v0.25.2 follow-up公開準備中）

進行状態と依存関係の正本はLattice plan `grok-composer-agent-parity/v1`とする。この文書は目的、判断、
非目標、受入条件、各Taskの作業仕様だけを所有する。完了済みの
`shared-agent-environment/v1`と`throughline-portable-fork/v1`は履歴証拠として残し、本計画の進行正本にはしない。

## Objective

ClaudeとCodexのlauncherが共通して提供する機能を、GrokとComposerにも同じ公開契約で提供する。
同一vendor／cross-vendorのどちらから呼ぶかは制限せず、Peertableを含むcallerが4 launcherを同じ方法で
選択・起動・設定変更・完了回収できる状態を公開製品へ届ける。

## Current finding

- Grok Build 1.0.3は対話TUIでも`--model`、`--reasoning-effort`、`--sandbox`を受理する。
- 同一sessionの`/model <name> [effort]`と`/effort <level>`が実在し、model／effortを変更できる。
- session `summary.json`は`current_model_id`、`reasoning_effort`、`sandbox_profile`を保持する。
- 2026-08-13時点の手元の`grok models`は`grok-4.6`と`grok-4.5`だけを公開し、
  `grok-composer-2.5-fast`を指定するとCLIはエラーにせずGrok既定モデルへ落とす。aitermはこれを
  Composer起動成功として返しており、requested modelと実効modelの不一致を隠している。
- 完了通知、transcript回収、通常HOME／vendor設定共有、`env_vars`、Throughline fork、lineage、再委譲は
  すでに4 launcher共通である。

## Decision

1. 共通同等機能の範囲は、起動model、起動effort、同一sessionのmodel／effort変更、read-only sandbox、
   完了通知、transcript、環境共有、`env_vars`、Throughline、lineage／再委譲とする。
2. Grok／Composer launcherは`reasoning_effort`をvendor CLIへ渡し、`write_scope=read-only`を
   `--sandbox read-only`へ落とす。path説明はCodexと同じく宣言として保持する。
3. `agent_configure`はGrok／Composerを受理し、vendor標準の`/model`と`/effort`だけで同一sessionを変更する。
4. explicit modelは起動前に`grok models`の現行catalogと照合する。catalog取得失敗、catalogにないmodel、
   Composerの既定model不在は明示エラーとし、sessionを作らない。Grokへのsilent fallbackは禁止する。
5. catalog照合は外部CLI境界の実在失敗を検出するために置く。retry、別modelへのfallback、cached catalog、
   aiterm独自model aliasは追加しない。
6. Claude固有の`claude_turn`／`claude_approval`はClaudeとCodexの共通機能ではないため複製しない。
   Grok Build独自機能をClaude/Codexへ逆移植することも本計画の対象外とする。

## Acceptance

- Grok／Composerの公開schemaと説明が、model、effort、read-only、`agent_configure`対応を正しく示す。
- Grok／Composer起動コマンドに要求したmodel／effort／sandboxが一回だけ渡る。
- catalogにないmodelはPTY作成前に失敗し、Grokへのsilent fallbackと残骸sessionがない。
- 同一Grok sessionでmodelとeffortの一括変更、effort単独変更を実測できる。
- Composer modelがcatalogにある環境では同じ経路を使い、ない環境ではComposer launcherが明示失敗する。
- completion、transcript、`env_vars`、Throughline、lineage／再委譲の既存契約を壊さない。
- focused test、full regression、package／MCPB／staged MCP smokeがgreenである。
- release commitが既定branchへ着地し、npm、GitHub Release、Official MCP Registry、registry由来global installで
  公開APIと実機挙動を確認する。

## Rollback

公開versionやtagは移動・上書きしない。問題があれば原因を特定し、mainから新しいpatch versionを前進公開する。

## Lattice task specification

### T1 — 現行契約と再現証拠を固定する

変更前full regression、Grok Build公式ソース、ローカルCLI、model catalog、TUI、session summaryを突き合わせ、
Claude/Codex共通面とGrok/Composer不足面を本文のDecisionへ固定する。Composer silent fallbackの再現を含む。

### T2 — target contractをred testへ落とす

launcher schema、起動引数、read-only enforcement、catalog不在時のpre-session failure、Grok/Composerの
`agent_configure` command／receiptをfocused testへ追加し、製品コード変更前に不足を赤として確認する。

### T3 — 最小の共通実装を行う

`src/core.ts`と`src/index.ts`を中心に、Grok/Composer effort、sandbox、catalog照合、同一session設定変更を実装する。
既存のcompletion、transcript、environment、Throughline、lineage経路は共有したまま変更を最小化する。

### T4 — 実機受入・回帰・知識還流を閉じる

focused test後にGrok実席、Composer不在の明示失敗、full regression、package/MCPB/staged MCPを確認する。
公開説明、設計正本、CHANGELOG、RAGへ現行xAI契約と実測結果を反映する。

### T5 — 公開とregistry由来smokeを完了する

versionを一意に上げ、commit／push／CI／tag／npm／GitHub Release／Official MCP Registryを順に通す。
registry由来global installで14 tools、4 launcher schema、Grok実席、Composer不在時の明示失敗を最終確認する。

## Public result

- release対象commit `1346066507f38e8d003208a1a2a3cd0220f263fa`を`v0.25.1`へ固定した。
- tag CI／Trusted Publishing `31747150072`はmacOS native・Linux native・Windows native・WSL2の
  同一`npm test`とnpm publishをすべて成功させた。
- npm `aiterm-mcp@0.25.1`、SLSA provenance、GitHub Release＋MCPB、Official MCP Registry
  `io.github.kitepon/aiterm-mcp` 0.25.1の`active`／`isLatest:true`を確認した。
- registry由来global／隔離install、3 bin、14 tools、4 launcher schema、stderr 0、配布`dist`一致を確認した。
- Grok実席は完了相関とlineageを返し、Composerは現行catalogに既定modelがないためPTY作成前にcode 2で
  明示停止し、残骸sessionを作らなかった。
- 完全な公開receiptと失敗記録は[ADR 0030](adr/0030-release-0.25.1-acceptance.md)を正とする。

## Peertable integration follow-up — 2026-08-14

PeertableのGrok 4.6実席で、`/model`は成功してfooterも要求modelへ変わった一方、成功通知が次の再描画で
消え、Aitermが設定変更を失敗として返す再現を得た。変更前には無かった要求model／effortが常駐footerへ
現れた場合もvendorの最終状態として受理する。caller側のretry、画面再描画、失敗の成功丸めは追加しない。
focused regressionと同一Grok実席の4.6→4.5→4.6変更で確認する。

### v0.25.2 follow-up release

この根治だけをpatch releaseとし、package／lock／MCP Registry manifest／MCPB manifestを`0.25.2`へ
同期する。main着地後にtag CIの4環境full、Trusted Publishing、GitHub Release、Official MCP Registryを
通し、registry由来global installで14 tools、`agent_configure` schema、Grok 4.6↔4.5の実席変更を確認する。

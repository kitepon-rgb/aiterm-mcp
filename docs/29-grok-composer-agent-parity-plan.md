# Grok／Composer agent parity・公開計画

## Status

Active — 2026-08-13

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
   `--sandbox read-only`へ落とす。path説明はClaude/Codexと同じく宣言として保持する。
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

# aiterm-mcp docs overview

現行挙動は、まず本索引の「現行正典」を読み、旧plan／旧ADRは各文書冒頭のstatusと追補に従って
歴史的経緯として読む。現在のMCP processから指定名だけをlauncherへ継承するv0.24.3契約は
[agent env vars release plan](28-agent-env-vars-release-plan.md)とADR 0025の追補を正とする。長寿命Codexの
ready判定はv0.24.2へ継承した追補を正とする。Grok／Composerのmodel・effort・read-only同等化と
live catalog fail-loud契約は[29-grok-composer-agent-parity-plan.md](29-grok-composer-agent-parity-plan.md)と
[ADR 0029](adr/0029-grok-composer-agent-parity-scope.md)を正とする。v0.23.0のportable fork／v0.22.0の環境境界と矛盾する
managed home、fake `HOME`、設定snapshotの記述は
[ADR 0025](adr/0025-shared-agent-environment-and-lineage.md)が置換する。標準`agent_launch`、harnessとmodelの分離、
Cursor Agent CLI契約は[ADR 0038](adr/0038-harness-launch-api-and-cursor-agent-cli.md)を正とする。archive、release受入、evidence、RAG rawは
当時の証拠なので現行文言へ書き換えない。

## 現行正典

- [../README.md](../README.md) / [../README.ja.md](../README.ja.md) - 公開APIと利用者向け現行契約。
- [../AGENTS.md](../AGENTS.md) - Codex作業者向けの現行入口と、共有環境／portable forkの変更規律。
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - contributor向け依存、コード所有、テスト、portable context境界。
- [../SECURITY.md](../SECURITY.md) - 最新0.xだけを支える公開方針と、PTY／launcher入力の運用境界。
- [01_design-plan.md](01_design-plan.md) - PTYモデルと現行設計。v0.22.0項より後ろのmanaged記述は明示された履歴。
- [adr/0014-agent-tui-ready-stabilization.md](adr/0014-agent-tui-ready-stabilization.md) - harness TUI readyの連続安定化と、長寿命Codexのheader／model・effort・任意`fast` footer識別契約。
- [27-agent-configure-release-plan.md](27-agent-configure-release-plan.md) - `agent_configure`のv0.24.0公開受入、v0.24.1停止記録、長寿命Codex ready／runtime queue根治版v0.24.2の公開工程。
- [28-agent-env-vars-release-plan.md](28-agent-env-vars-release-plan.md) - 現在のMCP processから指定名だけを互換launcherへ渡すv0.24.3の設計・公開受入。現行`agent_launch`も同じharness共通契約を継承する。
- [29-grok-composer-agent-parity-plan.md](29-grok-composer-agent-parity-plan.md) - Grok／Composerの起動時model・effort・read-only、同一session設定変更、live catalog fail-loudをClaude／Codex共通面へ揃えたv0.25.0 source／v0.25.1公開工程。
- [30-factory-ci-repository-transfer-release-plan.md](30-factory-ci-repository-transfer-release-plan.md) - 正規repo／registry名、self-hosted 4環境同一full CI、OIDC Trusted Publisher、v0.25.1公開修理の現行契約。
- [BUGHUB_RUNTIME_ERROR_STORE_PLAN.md](BUGHUB_RUNTIME_ERROR_STORE_PLAN.md) - runtime error storeのprivacy／bakery queue契約とv0.24.2のprogress-based deadline根治。
- [adr/0025-shared-agent-environment-and-lineage.md](adr/0025-shared-agent-environment-and-lineage.md) - 通常project／user環境共有、指定`env_vars`の起動単位overlay、sub-agent自己認識、委譲lineageの現行Decision。
- [adr/0029-grok-composer-agent-parity-scope.md](adr/0029-grok-composer-agent-parity-scope.md) - 4harness共通面の同等化範囲とGrok live catalog不在時のfail-loud Decision。
- [adr/0030-release-0.25.1-acceptance.md](adr/0030-release-0.25.1-acceptance.md) - Grok／Composer parity、Organization工場CI、npm／Release／Official Registry、registry由来実席のv0.25.1公開受入。
- [adr/0027-release-0.23.0-acceptance.md](adr/0027-release-0.23.0-acceptance.md) - v0.23.0 portable forkの公開・install・cross-harness live smoke受入記録。
- [adr/0026-release-0.22.0-acceptance.md](adr/0026-release-0.22.0-acceptance.md) - v0.22.0の公開・install・live smoke受入記録。
- [PROMOTION.md](PROMOTION.md) - 現行公開状態と配布運用。

## 履歴・実装記録

- [02_mcp-plan.md](02_mcp-plan.md) - Python MVP から stdio MCP サーバへ包むための計画/TODO の履歴文書。現状の正は [../CLAUDE.md](../CLAUDE.md) と [../README.md](../README.md)。
- [04_agent-done-plan.md](04_agent-done-plan.md) - `agent_done`実装の履歴。現行Codexは通常rollout、Grok/Composerは通常session event、Claudeは通常settingsへ加算したlaunch固有hookを使う。
- [09_codex-agent-prompt-ux-plan.md](09_codex-agent-prompt-ux-plan.md) - `codex_agent(prompt=...)` の長文/日本語 prompt、初回 `agent_done` 待ち、agent TUI 読み取り UX を hardening する計画と実装記録。
- [10_gpt56-model-alignment-plan.md](10_gpt56-model-alignment-plan.md) - GPT-5.6/Grok 4.5 世代へのモデル整合（v0.11.0 で消化済み）。
- [11_audit-2026-07-11.md](11_audit-2026-07-11.md) - v0.11.0 全域監査＋実動作確認の確定指摘（チェックボックス＝修正 TODO 兼用）・棄却台帳・残余検証点。
- [12_agent-transcript-read-plan.md](12_agent-transcript-read-plan.md) - `pty_read(agent_transcript:true)` で長い TUI 回答を回収する設計史。現行pathは通常harness homeを使う。
- [13_native-factory-diagnostics-plan.md](13_native-factory-diagnostics-plan.md) - factory 向け read-only diagnostics の公開契約・privacy 境界・検証 TODO。
- [15_claude-agent-plan.md](15_claude-agent-plan.md) - 永続PTY上の対話型`claude_agent`、operation相関、構造化`claude_turn`、権限確認用`claude_approval`の設計史。旧settings隔離はADR 0025で置換済み。
- [26-throughline-portable-fork-plan.md](26-throughline-portable-fork-plan.md) - Throughlineの読み取り専用handoff contextを4 launcherへ注入し、元DBのsession所属を変えずに別harnessへportable forkするv0.23.0の実装・受入計画。
- [23_managed-claude-user-mcp-plan.md](23_managed-claude-user-mcp-plan.md) - v0.21.4の歴史的工程。環境境界はADR 0025で全面置換済み。
- [24_shared-agent-environment-plan.md](24-shared-agent-environment-plan.md) - 4 launcherを通常CLIと同じ環境へ戻した完了済みLattice工程の判断正本。

## 決定記録

- [adr/0001-core-terminal-model.md](adr/0001-core-terminal-model.md) - このリポの根幹決定。
- [adr/0002-agent-launcher-tools.md](adr/0002-agent-launcher-tools.md) - 対話エージェント起動ツールを薄い別カテゴリとして足した決定。環境隔離部分はADR 0025で置換済み。
- [adr/0003-claude-agent-launcher-contract.md](adr/0003-claude-agent-launcher-contract.md) - Claudeを`-p`反復でなく永続対話PTYへ追加する契約。settings隔離部分はADR 0025で置換済み。
- [adr/0008-claude-operation-structured-caller-surface.md](adr/0008-claude-operation-structured-caller-surface.md) - durable caller向けにClaude operationのstatusとexact resultを構造化する契約。
- [adr/0009-claude-operation-structured-caller-gate-acceptance.md](adr/0009-claude-operation-structured-caller-gate-acceptance.md) - 構造化callerのfocused／related gateと親反証を固定する受入記録。
- [adr/0010-agent-launch-structured-receipt.md](adr/0010-agent-launch-structured-receipt.md) - durable callerが表示textを解析せずlauncher session handleを得る構造化receipt契約。
- [adr/0011-agent-launch-structured-receipt-acceptance.md](adr/0011-agent-launch-structured-receipt-acceptance.md) - launcher構造化receiptの実MCP fixtureと関連gateを固定する受入記録。
- [adr/0015-managed-claude-approval-relay.md](adr/0015-managed-claude-approval-relay.md) - 相関付きClaudeのactive turn中に、operationと画面digestへ結合して単発承認／拒否だけを中継する契約。環境前提はADR 0025で更新済み。
- [adr/0016-release-0.19.0-acceptance.md](adr/0016-release-0.19.0-acceptance.md) - v0.19.0のtag CI、npm provenance、GitHub Release、Official Registry、隔離／global installの不変受入記録。
- [adr/0017-non-blocking-dispatch-guidance.md](adr/0017-non-blocking-dispatch-guidance.md) - dispatch案内を「投げっぱなし」正典へ反転し、完了待ちの起動形を親ホスト別に名指しする決定。
- [adr/0018-agent-wait-running-outcome.md](adr/0018-agent-wait-running-outcome.md) - 待たない照会の未完了をrunningとして分離し、timeoutと1語に潰さない決定。
- [adr/0020-managed-claude-authentication-preflight.md](adr/0020-managed-claude-authentication-preflight.md) - Claude／Fableの通常共有認証をsession作成前に検証し、session内の認証変更を禁止する決定。認証契約は現行、managed環境前提は履歴。
- [adr/0021-release-0.20.3-acceptance.md](adr/0021-release-0.20.3-acceptance.md) - v0.20.3のtag CI、npm provenance、GitHub Release、Official Registry、global installの公開受入記録。
- [adr/0022-codex-rollout-completion.md](adr/0022-codex-rollout-completion.md) - Codex完了正本をStop hookから通常root rollout transcriptの`task_complete`へ移す不変Decision。
- [adr/0023-release-0.21.3-acceptance.md](adr/0023-release-0.21.3-acceptance.md) - v0.21.3のmain／tag CI、npm provenance、GitHub Release、Official Registry、隔離／global installを固定した公開受入記録。
- [adr/0024-managed-claude-user-mcp-inheritance.md](adr/0024-managed-claude-user-mcp-inheritance.md) - v0.21.4の歴史的Decision。ADR 0025で全面的にSuperseded。
- [25-shared-agent-environment-characterization.md](25-shared-agent-environment-characterization.md) - 3 CLIの通常環境、追加instruction、共有home上の完了相関を実測した実装前記録。
- [adr/0038-harness-launch-api-and-cursor-agent-cli.md](adr/0038-harness-launch-api-and-cursor-agent-cli.md) - 実行基盤（harness）とmodelを分離した単一`agent_launch`、Cursor Agent CLI adapter、旧4入口の互換alias化。
- [adr/0039-release-0.28.0-acceptance.md](adr/0039-release-0.28.0-acceptance.md) - harness標準起動APIとCursor Agent CLIの4環境CI、npm／Release／Official Registry、標準global install、公開版Cursor実席の受入記録。
- [adr/0040-release-0.28.1-acceptance.md](adr/0040-release-0.28.1-acceptance.md) - 現行正典の全同期、4環境CI、npm provenance、Release／Official Registry、標準global installの文書patch公開受入。
- [adr/0041-release-0.28.2-acceptance.md](adr/0041-release-0.28.2-acceptance.md) - harness用語統一（src/harnesses/改名・wire互換field据え置き）の挙動不変patch公開受入。

## 運用メモ

- [PROMOTION.md](PROMOTION.md) - 配布・告知・レジストリ登録の運用メモ。設計正典ではないため連番対象外。
- [benchmarks.md](benchmarks.md) - aiterm vs 組み込み Bash ツールの実測ログ（トークン削減・状態保持・所要時間）。README の「使い分け」節の裏付け。

## Archive

- [archive/](archive/) - 完了済みのリリース計画・チェックリスト。
- [archive/22_release-0.21.3-plan.md](archive/22_release-0.21.3-plan.md) - Codex rollout完了正本修理を0.21.3として全公開面とglobal installへ届けた完了工程。

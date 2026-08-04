# aiterm-mcp docs overview

現行挙動は、まず本索引の「現行正典」を読み、旧plan／旧ADRは各文書冒頭のstatusと追補に従って
歴史的経緯として読む。v0.23.0のportable fork／v0.22.0の環境境界と矛盾するmanaged home、fake `HOME`、設定snapshotの記述は
[ADR 0025](adr/0025-shared-agent-environment-and-lineage.md)が置換する。archive、release受入、evidence、RAG rawは
当時の証拠なので現行文言へ書き換えない。

## 現行正典

- [../README.md](../README.md) / [../README.ja.md](../README.ja.md) - 公開APIと利用者向け現行契約。
- [01_design-plan.md](01_design-plan.md) - PTYモデルと現行設計。v0.22.0項より後ろのmanaged記述は明示された履歴。
- [adr/0025-shared-agent-environment-and-lineage.md](adr/0025-shared-agent-environment-and-lineage.md) - 通常project／user環境共有、sub-agent自己認識、委譲lineageの現行Decision。
- [adr/0026-release-0.22.0-acceptance.md](adr/0026-release-0.22.0-acceptance.md) - v0.22.0の公開・install・live smoke受入記録。
- [PROMOTION.md](PROMOTION.md) - 現行公開状態と配布運用。

## 履歴・実装記録

- [02_mcp-plan.md](02_mcp-plan.md) - Python MVP から stdio MCP サーバへ包むための計画/TODO の履歴文書。現状の正は [../CLAUDE.md](../CLAUDE.md) と [../README.md](../README.md)。
- [04_agent-done-plan.md](04_agent-done-plan.md) - `agent_done`実装の履歴。現行Codexは通常rollout、Grok/Composerは通常session event、Claudeは通常settingsへ加算したlaunch固有hookを使う。
- [09_codex-agent-prompt-ux-plan.md](09_codex-agent-prompt-ux-plan.md) - `codex_agent(prompt=...)` の長文/日本語 prompt、初回 `agent_done` 待ち、agent TUI 読み取り UX を hardening する計画と実装記録。
- [10_gpt56-model-alignment-plan.md](10_gpt56-model-alignment-plan.md) - GPT-5.6/Grok 4.5 世代へのモデル整合（v0.11.0 で消化済み）。
- [11_audit-2026-07-11.md](11_audit-2026-07-11.md) - v0.11.0 全域監査＋実動作確認の確定指摘（チェックボックス＝修正 TODO 兼用）・棄却台帳・残余検証点。
- [12_agent-transcript-read-plan.md](12_agent-transcript-read-plan.md) - `pty_read(agent_transcript:true)` で長い TUI 回答を回収する設計史。現行pathは通常vendor homeを使う。
- [13_native-factory-diagnostics-plan.md](13_native-factory-diagnostics-plan.md) - factory 向け read-only diagnostics の公開契約・privacy 境界・検証 TODO。
- [15_claude-agent-plan.md](15_claude-agent-plan.md) - 永続PTY上の対話型`claude_agent`、operation相関、構造化`claude_turn`、権限確認用`claude_approval`の設計史。旧settings隔離はADR 0025で置換済み。
- [26-throughline-portable-fork-plan.md](26-throughline-portable-fork-plan.md) - Throughlineの読み取り専用handoff contextを4 launcherへ注入し、元DBのsession所属を変えずに別vendorへportable forkするv0.23.0の実装・受入計画。
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

## 運用メモ

- [PROMOTION.md](PROMOTION.md) - 配布・告知・レジストリ登録の運用メモ。設計正典ではないため連番対象外。
- [benchmarks.md](benchmarks.md) - aiterm vs 組み込み Bash ツールの実測ログ（トークン削減・状態保持・所要時間）。README の「使い分け」節の裏付け。

## Archive

- [archive/](archive/) - 完了済みのリリース計画・チェックリスト。
- [archive/22_release-0.21.3-plan.md](archive/22_release-0.21.3-plan.md) - Codex rollout完了正本修理を0.21.3として全公開面とglobal installへ届けた完了工程。

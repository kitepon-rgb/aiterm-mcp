# aiterm-mcp docs overview

このディレクトリの正典級文書は番号順に読む。

## 正典

- [01_design-plan.md](01_design-plan.md) - PTY 1個プリミティブ、tmux バックエンド、quiescence 完了検出などの設計判断と未決事項。
- [02_mcp-plan.md](02_mcp-plan.md) - Python MVP から stdio MCP サーバへ包むための計画/TODO の履歴文書。現状の正は [../CLAUDE.md](../CLAUDE.md) と [../README.md](../README.md)。
- [04_agent-done-plan.md](04_agent-done-plan.md) - `agent_done`実装の履歴。現行Codexはrollout transcriptの`task_complete`、Grok/Composerはvendor hookを完了正本に使う。Claude追加の正はADR 0003とplan 15。
- [09_codex-agent-prompt-ux-plan.md](09_codex-agent-prompt-ux-plan.md) - `codex_agent(prompt=...)` の長文/日本語 prompt、初回 `agent_done` 待ち、agent TUI 読み取り UX を hardening する計画と実装記録。
- [10_gpt56-model-alignment-plan.md](10_gpt56-model-alignment-plan.md) - GPT-5.6/Grok 4.5 世代へのモデル整合（v0.11.0 で消化済み）。
- [11_audit-2026-07-11.md](11_audit-2026-07-11.md) - v0.11.0 全域監査＋実動作確認の確定指摘（チェックボックス＝修正 TODO 兼用）・棄却台帳・残余検証点。
- [12_agent-transcript-read-plan.md](12_agent-transcript-read-plan.md) - `pty_read(agent_transcript:true)` で長い TUI 回答を vendor transcript から回収する設計（B5・実装済み）。
- [13_native-factory-diagnostics-plan.md](13_native-factory-diagnostics-plan.md) - factory 向け read-only diagnostics の公開契約・privacy 境界・検証 TODO。
- [15_claude-agent-plan.md](15_claude-agent-plan.md) - 永続PTY上の対話型`claude_agent`、managed Stop hook、operation相関、構造化`claude_turn`、権限確認用`claude_approval`の設計履歴。
- [23_managed-claude-user-mcp-plan.md](23_managed-claude-user-mcp-plan.md) - managed Claudeのhook隔離を維持しつつuser scope MCPを復元し、0.21.4として届ける工程。

## 決定記録

- [adr/0001-core-terminal-model.md](adr/0001-core-terminal-model.md) - このリポの根幹決定。
- [adr/0002-agent-launcher-tools.md](adr/0002-agent-launcher-tools.md) - 対話エージェント起動ツール（Codex/Grok/Composer、v0.7.0〜）を薄い別カテゴリとして足した決定。
- [adr/0003-claude-agent-launcher-contract.md](adr/0003-claude-agent-launcher-contract.md) - Claudeを`-p`反復でなく永続対話PTYへ追加する契約。
- [adr/0008-claude-operation-structured-caller-surface.md](adr/0008-claude-operation-structured-caller-surface.md) - durable caller向けにClaude operationのstatusとexact resultを構造化する契約。
- [adr/0009-claude-operation-structured-caller-gate-acceptance.md](adr/0009-claude-operation-structured-caller-gate-acceptance.md) - 構造化callerのfocused／related gateと親反証を固定する受入記録。
- [adr/0010-agent-launch-structured-receipt.md](adr/0010-agent-launch-structured-receipt.md) - durable callerが表示textを解析せずlauncher session handleを得る構造化receipt契約。
- [adr/0011-agent-launch-structured-receipt-acceptance.md](adr/0011-agent-launch-structured-receipt-acceptance.md) - launcher構造化receiptの実MCP fixtureと関連gateを固定する受入記録。
- [adr/0015-managed-claude-approval-relay.md](adr/0015-managed-claude-approval-relay.md) - managed Claudeのactive turn中に、operationと画面digestへ結合して単発承認／拒否だけを中継する契約。
- [adr/0016-release-0.19.0-acceptance.md](adr/0016-release-0.19.0-acceptance.md) - v0.19.0のtag CI、npm provenance、GitHub Release、Official Registry、隔離／global installの不変受入記録。
- [adr/0017-non-blocking-dispatch-guidance.md](adr/0017-non-blocking-dispatch-guidance.md) - dispatch案内を「投げっぱなし」正典へ反転し、完了待ちの起動形を親ホスト別に名指しする決定。
- [adr/0018-agent-wait-running-outcome.md](adr/0018-agent-wait-running-outcome.md) - 待たない照会の未完了をrunningとして分離し、timeoutと1語に潰さない決定。
- [adr/0020-managed-claude-authentication-preflight.md](adr/0020-managed-claude-authentication-preflight.md) - managed Claude／Fableの共有認証をsession作成前に検証し、session内の認証変更を禁止する決定。
- [adr/0021-release-0.20.3-acceptance.md](adr/0021-release-0.20.3-acceptance.md) - v0.20.3のtag CI、npm provenance、GitHub Release、Official Registry、global installの公開受入記録。
- [adr/0022-codex-rollout-completion.md](adr/0022-codex-rollout-completion.md) - Codex完了正本をStop hookからroot rollout transcriptの`task_complete`へ移す不変Decision。
- [adr/0023-release-0.21.3-acceptance.md](adr/0023-release-0.21.3-acceptance.md) - v0.21.3のmain／tag CI、npm provenance、GitHub Release、Official Registry、隔離／global installを固定した公開受入記録。
- [adr/0024-managed-claude-user-mcp-inheritance.md](adr/0024-managed-claude-user-mcp-inheritance.md) - managed Claudeが通常hookを隔離したまま、user scopeの`mcpServers`だけをlaunch snapshotで継承する決定。

## 運用メモ

- [PROMOTION.md](PROMOTION.md) - 配布・告知・レジストリ登録の運用メモ。設計正典ではないため連番対象外。
- [benchmarks.md](benchmarks.md) - aiterm vs 組み込み Bash ツールの実測ログ（トークン削減・状態保持・所要時間）。README の「使い分け」節の裏付け。

## Archive

- [archive/](archive/) - 完了済みのリリース計画・チェックリスト。
- [archive/22_release-0.21.3-plan.md](archive/22_release-0.21.3-plan.md) - Codex rollout完了正本修理を0.21.3として全公開面とglobal installへ届けた完了工程。

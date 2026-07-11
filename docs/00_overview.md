# aiterm-mcp docs overview

このディレクトリの正典級文書は番号順に読む。

## 正典

- [01_design-plan.md](01_design-plan.md) - PTY 1個プリミティブ、tmux バックエンド、quiescence 完了検出などの設計判断と未決事項。
- [02_mcp-plan.md](02_mcp-plan.md) - Python MVP から stdio MCP サーバへ包むための計画/TODO の履歴文書。現状の正は [../CLAUDE.md](../CLAUDE.md) と [../README.md](../README.md)。
- [04_agent-done-plan.md](04_agent-done-plan.md) - Codex / Grok / Composer の vendor hook を使い、`pty_send` から done境界時点の端末観測結果を返す `agent_done` の実装状況（v0.9.1 で公開済み）。
- [09_codex-agent-prompt-ux-plan.md](09_codex-agent-prompt-ux-plan.md) - `codex_agent(prompt=...)` の長文/日本語 prompt、初回 `agent_done` 待ち、agent TUI 読み取り UX を hardening する計画と実装記録。
- [10_gpt56-model-alignment-plan.md](10_gpt56-model-alignment-plan.md) - GPT-5.6/Grok 4.5 世代へのモデル整合（v0.11.0 で消化済み）。
- [11_audit-2026-07-11.md](11_audit-2026-07-11.md) - v0.11.0 全域監査＋実動作確認の確定指摘（チェックボックス＝修正 TODO 兼用）・棄却台帳・残余検証点。

## 決定記録

- [adr/0001-core-terminal-model.md](adr/0001-core-terminal-model.md) - このリポの根幹決定。
- [adr/0002-agent-launcher-tools.md](adr/0002-agent-launcher-tools.md) - 対話エージェント起動ツール（Codex/Grok/Composer、v0.7.0〜）を薄い別カテゴリとして足した決定。

## 運用メモ

- [PROMOTION.md](PROMOTION.md) - 配布・告知・レジストリ登録の運用メモ。設計正典ではないため連番対象外。
- [benchmarks.md](benchmarks.md) - aiterm vs 組み込み Bash ツールの実測ログ（トークン削減・状態保持・所要時間）。README の「使い分け」節の裏付け。

## Archive

- [archive/](archive/) - 完了済みのリリース計画・チェックリスト。

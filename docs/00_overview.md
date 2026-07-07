# aiterm-mcp docs overview

このディレクトリの正典級文書は番号順に読む。

## 正典

- [01_design-plan.md](01_design-plan.md) - PTY 1個プリミティブ、tmux バックエンド、quiescence 完了検出などの設計判断と未決事項。
- [02_mcp-plan.md](02_mcp-plan.md) - Python MVP から stdio MCP サーバへ包むための計画/TODO の履歴文書。現状の正は [../CLAUDE.md](../CLAUDE.md) と [../README.md](../README.md)。
- [04_agent-done-plan.md](04_agent-done-plan.md) - Codex / Grok / Composer の vendor hook を使い、`pty_send` から done境界時点の端末観測結果を返す計画と実装状況（Codex MVP は実装済み）。
- [05_release-0.9.0-plan.md](05_release-0.9.0-plan.md) - `agent_done` を含む v0.9.0 リリース準備のチェックリスト。

## 決定記録

- [adr/0001-core-terminal-model.md](adr/0001-core-terminal-model.md) - このリポの根幹決定。
- [adr/0002-agent-launcher-tools.md](adr/0002-agent-launcher-tools.md) - 対話エージェント起動ツール（Codex/Grok/Composer、v0.7.0〜）を薄い別カテゴリとして足した決定。

## 運用メモ

- [PROMOTION.md](PROMOTION.md) - 配布・告知・レジストリ登録の運用メモ。設計正典ではないため連番対象外。

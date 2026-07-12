# AGENTS.md

このファイルは Codex 用の入口です。`aiterm-mcp` はこれまで Claude Code で育ってきたプロジェクトなので、運用・設計の正本は既存の Claude 向け文書にあります。ここでは重複を増やさず、Codex が参照すべき順序と、このリポジトリで外してはいけない要点だけを定めます。

## 参照順

1. まず `~/.claude/CLAUDE.md`（存在すれば）を読む。全プロジェクト共通の作業規律、調査、フォールバック禁止、目的維持、git/シェル作法の正本です。
2. 次に、このリポジトリ直下の `CLAUDE.md` を読む。`aiterm-mcp` 固有の現状、設計判断、テスト、リリース、RAG 運用の正本です。
3. 設計や挙動に触る作業では `docs/00_overview.md` から辿り、特に `docs/01_design-plan.md` と関連 ADR を読む。

Claude Code 固有のツール名・人格・ワークフローは、Codex の実行環境と矛盾しない範囲で意図を読み替えてください。矛盾した場合は、上位のシステム/開発者指示を優先しつつ、ユーザーに影響する差分は明示します。

## プロジェクト要約

- `aiterm-mcp` は Node/TypeScript 製の stdio MCP サーバです。
- tmux をバックエンドに、AI がローカル/SSH/コンテナ/REPL を 1 つの永続 PTY として操作できるようにします。
- 公開ツールは PTY 6 種 (`pty_open` / `pty_send` / `pty_read` / `pty_key` / `pty_close` / `pty_list`)、対話エージェント起動 3 種 (`codex_agent` / `grok_agent` / `composer_agent`)、factory 向け read-only `diagnostics` の計 10 種です。
- セッション種別を増やす設計ではなく、SSH・docker・wsl・REPL は PTY 内へ送る通常テキストとして扱います。
- エージェント起動ツールは例外的なブートストラップ層です。CLI バイナリ、`cwd`、`reasoning_effort` などを session 作成前に検証し、失敗時に残骸セッションを残さないことが重要です。

## 作業時の注意

- 目的に直結しない改善、整理、調査を勝手に足さない。
- フォールバックで失敗を隠さない。必要なら発動条件、記録、ユーザーへの見え方を明示する。
- stdout は MCP の JSON-RPC 通信路なので、サーバ実装で不用意に出力しない。
- `prototype/python/` は旧実装で、移植元・検証基準として参照専用に扱う。
- `.claude/settings.local.json`、`.vscode/tasks.json`、WSL 由来の `Zone.Identifier` など端末固有/ノイズのファイルは、目的がない限り触らない。
- RAG や設計判断に関わる調査は `CLAUDE.md` の手順に従い、まず `rag/INDEX.md` を確認する。

## 主要コマンド

```bash
npm run build
npm test
```

`npm test` は `npm run build && node --test test/*.test.mjs` です。tmux に依存するテストがあります。テストしていない場合は、最終報告でテスト未実施と明示してください。

## 変更時の同期

- 公開挙動、設計判断、未決事項、テスト方針を変えたら、コードだけでなく `CLAUDE.md`、`docs/01_design-plan.md`、関連 ADR、README/CHANGELOG のどれを同期すべきか確認する。
- リリースや公開メタデータに触る場合は、`CLAUDE.md` と `docs/PROMOTION.md` を先に読む。

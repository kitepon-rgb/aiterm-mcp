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
- 公開ツールは PTY 6 種 (`pty_open` / `pty_send` / `pty_read` / `pty_key` / `pty_close` / `pty_list`)、対話エージェント起動 4 種 (`claude_agent` / `codex_agent` / `grok_agent` / `composer_agent`)、起動中agent設定変更 `agent_configure`、Claude向け構造化操作 2 種 (`claude_turn` / `claude_approval`)、factory 向け read-only `diagnostics` の計 14 種です。
- セッション種別を増やす設計ではなく、SSH・docker・wsl・REPL は PTY 内へ送る通常テキストとして扱います。
- エージェント起動ツールは例外的なブートストラップ層です。CLI バイナリ、`cwd`、`reasoning_effort` などを session 作成前に検証し、失敗時に残骸セッションを残さないことが重要です。
- Codexのready判定は、起動直後の`OpenAI Codex` headerまたは長寿命画面に常駐するmodel／effort footerと入力欄をfrontend根拠にします。caller側の再描画・再試行・再起動で補いません。
- Runtime error storeのbakery queueは、総待ち時間でなく同じ先頭ownerの無進捗時間だけを期限にします。通常pollで外部process-start照合を反復せず、stall時にだけPID再利用を照合します。
- 4つのlauncherは直接CLI起動と同じ通常`HOME`、vendor home、project／user／local設定、MCP、plugin、skill、permission、trust、memory、historyを使います。aitermがlaunchごとに所有するのは完了相関stateだけで、子へ`role=subagent`、親session、delegation depth／lineage、`delegation_allowed=true`を加算します。孫以降の委譲は禁止しません。環境境界の正本はADR 0025です。
- 4つのlauncherは任意の`throughline_source_session`を共有します。指定時だけローカルの`throughline >= 0.9.0`からread-only handoff contextをPTY作成前に取得し、必須の新ミッションへ前置きします。Throughline DBのsession所属は変更せず、失敗時はclean launchへfallbackしません。省略時の通常clean launchは不変です。正本は`docs/26-throughline-portable-fork-plan.md`とADR 0027です。

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

# Native Factory Diagnostics 計画

## 目的

外部の factory が `aiterm-mcp` の稼働前提を安全に判定できる、公開・read-only の MCP 診断入口を追加する。応答は機械可読 JSON に限定し、端末内容や認証情報を露出しない。

## 契約

- 新規 MCP tool `diagnostics` は JSON 文字列を返す。
- JSON は `diagnostic_schema`、パッケージ `version`、`overall`、`mcp`、`pty_list`、`vendor_dependencies` を必須とする。
- `mcp.initialize` と tool call 到達性は、MCP tool が呼ばれた時点で `ready` と表す。
- PTY 一覧は tmux へ read-only に照会しても、セッション名・前面コマンド・PTY 出力を返さない。返すのは能力状態と件数だけにする。
- vendor launcher は optional dependency として扱う。通常ファイルかつ実行可能なバイナリの探索結果だけを返し、絶対パス、環境変数、認証状態、トークン、実行出力を返さない。
- 必須依存tmuxはserver/socket不在時にも副作用のないversion probeで能力を確認する。tmux不可を`not_applicable`や`overall=ready`へ丸めない。
- 通常の未設定は `not_applicable`、安全に判定できない事実は `unverified` とする。runtime error store と telemetry は追加しない。

## TODO

- [x] 既存規約・MCP 初期化・`pty_list`・依存 lockfile・公開 version 入口を確認する。
- [x] `package.json`とlockfile root packageのversionを一致させる。
- [x] nested exact schemaとtmux不在の実MCP負系を固定する。
- [x] 変更前の `npm test` を green で取得する（205/205）。
- [x] privacy/schema の characterization fixture と MCP 配線テストを先行追加する。
- [x] read-only 診断集約を実装し、公開 tool に配線する。
- [x] schema・README/変更履歴への同期要否を確認し、必要最小限を更新する。
- [x] `npm test` と `git diff --check` を green で通し、差分を再読する。

## 非目標

- PTY、Claude/Codex/Grok/Composer、または新規プロセスを起動して診断しない。
- 既存の 9 ツールの入力・出力・エラー契約は変更しない。
- runtime error store、telemetry、vendor 認証検証を導入しない。

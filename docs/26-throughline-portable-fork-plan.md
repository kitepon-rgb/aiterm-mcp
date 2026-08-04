# Throughline portable fork

## 目的

既存の `claude_agent` / `codex_agent` / `grok_agent` / `composer_agent` に、Throughline が保持する
指定セッションの継続コンテキストを初回 prompt へ加える任意経路を追加する。launcher は新しい clean な
vendor session を作り、Throughline の DB 所有権や通常 handoff を変更しない。

実行 ToDo、依存、状態、完了証拠の正本は Lattice plan `throughline-portable-fork` とする。

## 契約

- `throughline_source_session` を省略した launcher は現行の clean 起動を完全に維持する。
- 指定時は `prompt` を必須のミッションとし、`throughline handoff-context --session <id> --json` を
  PTY 作成前に一度だけ呼ぶ。
- Throughline の versioned JSON から `context` を取り出し、固定区切りの後ろへミッションを置く。
- Throughline CLI の不在、非 0 終了、不正 schema、空 context は明示失敗とし、context なし起動へ
  fallback しない。
- 4 launcher 共通入口で一度だけ合成し、Claude/Codex の TUI 後送と Grok/Composer の argv 経路は
  既存実装をそのまま使う。

## 非目標

- AIterm から Throughline SQLite を直接読むこと。
- DB copy、merge、branch lineage、latest session 推測、project/cwd 照合。
- native vendor fork、network・複数端末転送、cache、retry、独自 timeout、version probe。
- context の agent metadata 保存、follow-up turn への再注入、新しい MCP tool。
- 4 vendor 全組合せの live smoke。共通実装の unit test と代表 cross-vendor 1 経路で受け入れる。

## 受入条件

- 4 launcher に同じ任意入力が公開され、既存 output receipt は不変。
- field 省略時は Throughline を呼ばず、既存 prompt も不変。
- context はミッションより前に一度だけ現れ、TUI 系と argv 系の両経路で届く。
- Throughline 境界の失敗では PTY session を作らない。
- focused test、全回帰、代表 cross-vendor smoke、公開後 install smoke が成功する。

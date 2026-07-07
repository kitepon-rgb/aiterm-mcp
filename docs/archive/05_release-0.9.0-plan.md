# v0.9.0 release plan

更新日: 2026-07-07  
対象: `agent_done:true` / `pty_send(wait:"agent_done")` を含むリリース準備

## 目的

`agent_done` 実装を、npm / Official MCP Registry / GitHub Release に出せる状態へ同期する。
公開 API は後方互換の機能追加なので、リリース版は `0.9.0` とする。

## 非目的

- この計画では `git tag` / `git push` / npm publish を直接実行しない。
- native Windows の `agent_done` 対応を追加しない。core PTY と agent launcher は従来どおり、`agent_done` は POSIX / WSL2 / macOS 対応として出す。
- SSH / docker / REPL の done hook 化はしない。

## TODO

- [x] 現在の差分、リリース手順、CI publish 条件を確認する。
- [x] `package.json` / `package-lock.json` / `server.json` を `0.9.0` に同期する。
- [x] `CHANGELOG.md` に `0.9.0 - 2026-07-07` を追加し、比較リンクを更新する。
- [x] `CLAUDE.md` / README / docs の未リリース表現をリリース候補表現へ同期する。
- [x] hook source / hook test / docs / RAG の新規ファイルがリリース対象差分に含まれることを確認する。
- [x] `npm test` を通す。
- [x] `npm pack --dry-run --json` で配布物に `dist/codex-stop-hook.js` / `dist/grok-stop-hook.js` が入ることを確認する。
- [x] `npm publish --dry-run --access public` で publish 時の build と tarball 作成を確認する。
- [x] MCP `tools/call` 経由の `agent_done` 実 smoke と普通 PTY smoke を再確認する。
- [x] `git diff --check` と release status を確認する。
- [x] 不可逆操作として残す `git tag v0.9.0` / `git push origin main --tags` / GitHub Release 作成を明示する。

## リリース判定

ローカル完了条件:

- テスト: `npm test` が全件 pass。
- package: `npm pack --dry-run --json` が成功し、hook wrapper の dist が tarball に含まれる。
- smoke: stdio MCP サーバを実起動し、`codex_agent` / `grok_agent` / `composer_agent` の `pty_send(wait:"agent_done")` と普通PTYが通る。
- git: version / changelog / manifest / source / test / docs / RAG の差分が見えており、未追跡 source を取りこぼしていない。

2026-07-07 確認:

- `npm view aiterm-mcp version` は `0.8.0`。
- `npm view aiterm-mcp@0.9.0 version` は E404。`0.9.0` は未公開で、次の publish 対象として空いている。
- MCP `tools/call` smoke は通過。起動直後に送ると vendor TUI が入力を受ける前に落とすことがあるケースを再現したため、`pty_send(wait:"agent_done")` 側に送信前 TUI ready gate を実装し、未 ready なら文字列を送らないよう修正した。ready gate 実装後は、明示的な `pty_read` ready 待ちなしの起動直後即送信でも Codex/Grok/Composer と普通PTY Python REPL が通過した。
- `AGENTS.md` は未追跡だが、個人/運用指示を含む可能性があるため release commit の pathspec からは明示的に外す。

公開手順:

```bash
git add CHANGELOG.md CLAUDE.md README.ja.md README.md \
  docs/00_overview.md docs/01_design-plan.md docs/04_agent-done-plan.md docs/05_release-0.9.0-plan.md docs/adr/0002-agent-launcher-tools.md \
  package.json package-lock.json server.json \
  src/core.ts src/index.ts src/codex-stop-hook.ts src/grok-stop-hook.ts \
  test/core-agent.test.mjs test/core-pure.test.mjs test/smoke.test.mjs test/codex-stop-hook.test.mjs \
  rag/INDEX.md rag/manifest.json rag/briefs/agent-cli-done-detection.md \
  rag/sources/completion-detection/agent-cli-done-phase0-smoke-2026-07-07.md \
  rag/sources/completion-detection/agent-done-codex-mvp-2026-07-07.md \
  rag/sources/completion-detection/codex-cli-stop-hook.md \
  rag/sources/completion-detection/codex-exec-json-turn-completed.md \
  rag/sources/completion-detection/grok-agent-done-implementation-probe-2026-07-07.md \
  rag/sources/completion-detection/grok-agent-stdio-acp.md \
  rag/sources/completion-detection/grok-cli-stop-hook.md \
  rag/sources/completion-detection/grok-headless-streaming-json-end.md
git commit -F <message-file>
git tag v0.9.0
git push origin main --tags
```

tag push 後、CI の `publish` job が npm publish を行い、GitHub Release 公開後に `registry.yml` が Official MCP Registry を再登録する。

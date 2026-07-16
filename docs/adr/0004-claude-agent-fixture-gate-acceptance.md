# 0004. Claude対話launcher fixture gate受入

## Decision

2026-07-16、`claude_agent`のfixture実装をqueue 19c3の公開前候補として受け入れる。
この受入は実Claude model requestの成功を意味しない。初回／follow-upのlive smokeは明示承認を要する
H gateとして未完了のまま保持し、その証拠なしにpublish／promotionしない。

受入対象は、Claude Codeを`claude -p`ではなくAiterm所有の利用者可視な永続PTYへ起動し、同じ
sessionへの初回／follow-up、Stop完了相関、owner-only result回収、timeout後の無送信回収、
`pty_key(C-c)`、`pty_close`を公開する契約である。Observer／Throughline／Mailboxの判断ロジックは
Aitermへ含めない。

## Gate evidence

- focused negative: 空または欠落`vendor_session_id`を持つClaude完了eventが、修正前に
  `is_complete=True`へ誤帰属することを1件の失敗で再現した。
- focused fix: 同じtestが1 passed、0 failed、0 skipped。
- related: `npm run build && node --test test/codex-stop-hook.test.mjs test/core-pure.test.mjs
  test/core-agent.test.mjs test/smoke.test.mjs`は109 passed、0 failed、0 skipped。
- full: `npm test`は249 passed、0 failed、0 skipped。
- static: 最終文書同期後の`git diff --check`はgreen。

## Independent refutation

独立refuterは2点を指摘した。

1. 未bind時のClaude eventが空／欠落`vendor_session_id`でも完了扱いされ得た。parserでClaudeだけ
   非空IDを必須にし、negative testでtimeout・malformed診断・metadata未bindを固定した。
2. ADR 0003がtimeout後の無送信回収と新規follow-up送信を混同していた。無送信回収は
   `pty_read(agent_transcript:true)`、新規follow-upだけが`pty_send(wait:"agent_done")`であると訂正した。

同じTODOへの独立監査は反復しない。

## Remaining H gate

実Claude CLIの認証状態、TUI ready marker、managed Stop hook、初回／follow-up各1 turn、結果回収、
session closeは未検証である。実行時は目的・model requestの影響・session closeによるrollbackを説明し、
オーナーの明示承認を得る。

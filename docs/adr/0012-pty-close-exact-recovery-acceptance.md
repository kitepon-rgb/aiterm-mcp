# 0012. `pty_close` exact recovery receiptの受入

## Status

Accepted — 2026-07-16

## Decision

`pty_close`の既存text contentとidempotent cleanupを維持したまま、
`aiterm.pty-close-result.v1`のstructured receiptを公開する。receiptは検証済み`session_id`と、
呼出開始時にtmux sessionが存在した`closed`、既に存在しなかった`already_closed`の固定語彙だけを持つ。
MCP response loss後のdurable callerは同じsession IDで再試行し、`already_closed`によってclose完了を
文字列解析なしで確定できる。このmachine契約を含む未公開sourceは`0.14.0`とする。

## Evidence

- focused: build＋実stdio MCP fake Claude launch／close／同一ID retry＋tools/list schema、
  4 passed・0 failed・0 skipped。
- related: closeを消費するagent／read／space-path／tmux core、structured launcher、release metadata、
  stdio smoke、174 passed・0 failed・0 skipped。
- full regression: 同じClaude transport Phaseで262 passed済み。小さな公開契約補正のため再実行しない。
- 実Claude model request、release／publish、端末更新: H承認前のため未実施。

## Parent refutation

1. `already_closed`がcleanup未完了を成功扱いしないか。
   - 存在確認後も必ず従来の`closeSessionInternal`を実行し、tmux killと全owned state cleanupを再試行するため棄却。
2. MCP response loss後にpromptやclose以外の操作を再送する必要がないか。
   - 同じ`pty_close(session_id)`だけが冪等に収束し、model turnやObserver意味論を一切持たないため棄却。
3. 人間向けtextをmachine protocolとして残していないか。
   - textは`closed <session>`の互換表示だけを維持し、output schemaとstructuredContentをexact比較したため棄却。
4. 新しい公開契約を既公開0.12.3や未公開0.13.0へ混在させていないか。
   - package／lock／server manifestを`0.14.0`へ同期し、release metadata gateで固定したため棄却。

Phaseの独立重監査はoperation相関受入時に一度完了しているため、この補正TODOでは反復していない。

## Rollback

本commitをrevertし、`pty_close` output schema、structured receipt、0.14.0 metadata、fixture、ADR／README同期を
除去する。既存`closeSession`、Claude session、`claude_turn` operation契約は維持する。

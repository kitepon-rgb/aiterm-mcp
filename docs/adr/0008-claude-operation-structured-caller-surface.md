# 0008. Claude operationの構造化caller surface

## Status

Accepted for implementation — 2026-07-16

2026-08-04追補: `claude_turn`の構造化statusとrecovery契約は現行。本文の旧wait surfaceとmanaged環境は
実装史で、現行の非ブロックdispatchと通常環境共有はADR 0017／
[ADR 0025](0025-shared-agent-environment-and-lineage.md)を正とする。

## Context

`pty_send(wait:"agent_done", operation_id:...)`と`pty_read(agent_transcript:true, operation_id:...)`は、
人間と対話agentが使うtext surfaceとしてcompletion／recoveryを提供する。しかしMCP結果は成功本文、または
`isError`と人間向け文字列であり、durable callerは「まだpending」と「marker破損／result不一致」を
文字列解析なしで区別できない。全errorをpendingへ丸めると失敗を隠し、全errorをterminalへ丸めると
timeout後回収が成立しない。

## Decision

1. `claude_turn`をdurable machine caller専用toolとして追加する。Aitermはtransportだけを所有し、
   Observer／Throughline／Mailboxの意味論を持たない。
2. 入力は`action: issue | recover`、managed Claude `session_id`、
   `operation_id: sha256:<64 lowercase hex>`を必須とする。`issue`だけがbounded `text`とtimeoutを受ける。
3. 出力schemaは`aiterm.claude-operation-result.v1`。statusは次に限定する。
   - `issue`: `accepted | completed | unknown`
   - `recover`: `pending | completed | unknown`
   - `completed`だけがexact `raw_output`を持つ。
   - `unknown`のreasonは`operation_not_found | result_unknown`に限定する。
4. active markerと同じoperationは`pending`、matching Stop event／resultはdigest／bytes／session／operationを
   完全検証して`completed`、dispatch receiptが無ければ`operation_not_found`、receiptはあるがactive markerも
   matching completionも無ければ`result_unknown`とする。
5. 別operationのactive marker、unsafe／malformed state、event／result不一致、送信失敗はtool errorのままにする。
   `unknown`や`pending`へfallbackしない。
6. `issue`は既存one-shot receipt／active marker／managed Stop hookをそのまま使う。同一IDを再送せず、
   tool call自体が状態不明で終わったcallerは`recover`だけを行う。
7. 既存`pty_send`／`pty_read`／`pty_key(C-c)`／`pty_close`は人間向け互換面として維持する。

## Acceptance

- timeoutしたissueが`accepted`、同じoperationのrecoverが`pending`となり、promptを再送しない。
- matching Stop後のrecoverだけがexact `raw_output`を返す。
- 未dispatch IDは`unknown/operation_not_found`、receiptだけ残り結果帰属不能なら
  `unknown/result_unknown`となる。
- malformed／unsafe／mismatchはstructured successに降格せずtool errorになる。
- MCP tools/listがoutput schemaを公開し、既存対話toolの回帰を壊さない。

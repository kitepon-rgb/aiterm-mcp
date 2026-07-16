# 0011. Agent launcher構造化session receiptの受入

## Status

Accepted — 2026-07-16

## Decision

[ADR 0010](0010-agent-launch-structured-receipt.md)の`aiterm.agent-launch-result.v1`を受け入れる。
4 launcherは既存text contentを維持しながら、provider固定、検証済みsession ID、managed completionの
実効booleanだけをstructured receiptへ返す。durable callerは表示textを解析しない。

## Evidence

- focused: build＋実stdio MCP fake Claude launch／close＋tools/list schema、4 passed・0 failed・0 skipped。
- related: build＋agent core＋stdio smoke＋structured launcher fixture、94 passed・0 failed・0 skipped。
- full regression: 同じClaude transport Phaseで262 passed済み。細粒度補正のため再実行しない。
- 実Claude model request、release／publish、端末更新: H承認前のため未実施。

## Parent refutation

1. text表示をmachine protocolとして残していないか。
   - 実MCP responseの`structuredContent`をexact比較し、textは互換確認だけに限定したため棄却。
2. tool名とreceipt providerが食い違いうるか。
   - 各launcherのoutput schemaをprovider literalにし、4 toolすべてをtools/listで固定したため棄却。
3. session生成receiptをTUI ready／turn成功と誤認していないか。
   - receipt fieldをsession IDとmanaged flagだけに限定し、ready／model outputを含めないため棄却。
4. fixtureが永続sessionを残すか。
   - 同じMCP processから`pty_close`成功を確認してから隔離rootを除去するため棄却。

Phaseの独立重監査はoperation相関受入時に一度完了しているため、この補正TODOでは反復していない。

## Rollback

本commitをrevertし、launcher output schema、structuredContent、専用fixture、ADR／README同期だけを除去する。
既存launcher text content、`claude_agent` session、`claude_turn` operation契約は維持する。

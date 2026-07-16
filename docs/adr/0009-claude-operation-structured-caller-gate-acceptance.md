# 0009. Claude operation構造化caller gateの受入

## Status

Accepted — 2026-07-16

## Decision

[ADR 0008](0008-claude-operation-structured-caller-surface.md)の`claude_turn`公開契約を受け入れる。
managed Claudeの同一永続PTY sessionに対し、`issue`は一度だけ送信し、`recover`は再送しない。
構造化statusは`accepted`／`pending`／`completed`／`unknown`に限定し、検証済み完了だけがexact
`raw_output`を持つ。別operation、破損、identity／digest／bytes不一致はtool errorのままであり、
pending／unknownへ降格しない。

## Evidence

- focused: build＋`runClaudeOperation`／公開version／MCP schema、5 passed・0 failed・0 skipped。
- related: build＋Claude Stop hook／pure completion／agent fixture／MCP smoke、126 passed・0 failed・0 skipped。
- MCP `tools/list`: PTY 6＋launcher 4＋`diagnostics`＋`claude_turn`＝12 tools、input／output schemaを確認。
- full regression: この訂正前の同Phase最終gateで262 passed。細粒度変更ごとに反復しない規約に従い再実行しない。
- live Claude model request、release／publish、端末更新: H承認前のため未実施。

## Parent refutation

最初の関連gate green後、親が次の反対仮説を確認した。

1. 加工済みtranscriptをexact resultと誤称していないか。
   - Stop resultのraw textをdigest／byte数／session／operation一致後に直接返すため棄却。
2. receipt不在と、receipt後に帰属可能な結果が消えた状態を混同していないか。
   - `operation_not_found`と`result_unknown`を別reasonに固定したため棄却。
3. malformed marker／event、別active operationをpendingへ丸めていないか。
   - いずれも明示errorでfixture固定したため棄却。
4. `recover`が送信引数を黙って無視していないか。
   - input schemaの`timeout`既定注入を発見したため、issue専用optionalへ変更し、recoverでtext／timeoutを
     明示拒否した。修正後にfocused 5/5と関連126/126を最終HEADで再確認した。

Phaseの独立重監査はoperation相関受入時に一度完了しているため、この補正TODOでは反復していない。

## Rollback

本commitをrevertし、`claude_turn`登録、core issue／recover facade、専用fixture、ADR／README同期だけを
除去する。既存`claude_agent`、`pty_send`／`pty_read`、Stop hook、operation receipt／marker／result契約は維持する。

# 0010. Agent launcherの構造化session receipt

## Status

Accepted for implementation — 2026-07-16

## Context

`claude_agent`を含むlauncherは永続PTY sessionを作成するが、成功結果は`session_id: ...`を含む
人間向けtextだけである。durable machine callerがsession handleを得るために表示文字列を解析すると、
文言変更を公開protocolとして誤用し、handle欠損や誤帰属を安全に区別できない。

## Decision

1. 既存4 launcherへ同じ`aiterm.agent-launch-result.v1` output schemaを追加する。
2. structured receiptは`schema`、toolに固定された`provider`、検証済み`session_id`、
   `managed_completion`だけを持つ。prompt本文、cwd、model、credential、PTY出力は含めない。
3. `managed_completion`は起動入力`agent_done`の実効booleanと一致させる。ObserverはClaude routeで
   `true`だけを受け入れる。
4. 既存text contentは人間向け互換面として維持する。machine callerは`structuredContent`だけを使い、
   text parsingへfallbackしない。
5. session readinessやmodel turn成功はreceiptから主張しない。初回issueは`claude_turn`自身のready gateと
   operation相関で受け入れる。

## Acceptance

- MCP `tools/list`で4 launcherがprovider固定の同じoutput schemaを公開する。
- fake Claude CLIの実`tools/call`がtext互換とstructured receiptを同時に返す。
- `managed_completion`と`session_id`が実起動入力／生成sessionに一致する。
- 実Claude model request、publish、端末更新は行わない。

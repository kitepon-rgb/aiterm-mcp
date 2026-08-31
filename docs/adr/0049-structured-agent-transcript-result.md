# ADR 0049: Agent transcriptは回答本文を構造化して返す

- Status: Accepted
- Date: 2026-08-31
- Decision owner: product owner

## Context

`pty_read(agent_transcript:true)`は確定回答と診断メタデータを一つのtext contentへ連結していた。
機械呼出し側が回答だけを扱うにはAiterm固有の末尾書式を解析する必要があり、診断行を会話本文として
保存する実障害がBellTeamで発生した。Grok／Composerでは最後の実user行以後のassistant行をすべて
連結していたため、tool利用前の前置きも最終回答へ混入した。

## Decision

1. `pty_read`は`aiterm.pty-read-result.v1`を`structuredContent`へ返す。
2. `agent_transcript` modeの`text`は診断suffixを含まない回答本文とし、vendor、turn ID、harness、
   raw文字数を別fieldへ置く。既存の人間向けtext contentは互換のため維持する。
3. Grok／Composerは最後の実user行以後にある最後の空でないassistantメッセージだけを確定回答とする。
   tool利用前の前置きと途中報告は返さない。
4. 通常terminal readも同じschemaの`terminal` modeを返し、既存text contentをそのまま`text`へ置く。

## Verification

- `npm run build`
- `node --test --test-name-pattern='readAgentTranscript: Grok' test/core-agent.test.mjs`
- `node --test test/smoke.test.mjs`
- `npm test`
- 公開packageでGrokのtool利用ターンをdispatchし、structured textが最後の回答だけであることを確認する。

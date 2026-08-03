# ADR 0022: Codex完了正本をroot rollout transcriptへ置く

- 日付: 2026-08-03
- 状態: Accepted

## Context

managed Codex sessionの完了は、aitermが生成したStop hookのeventを`aiterm-wait`が読むことで判定していた。
実運用では長寿命MCP serverの`process.execPath`がHomebrew Cellarの版付きNode実体
`/opt/homebrew/Cellar/node/<version>/bin/node`を`hooks.json`へ固定した。Node更新で旧実体が消えると
Stop hookは`exit 127`になり、Codex本体が4分52秒で完了してもcompletion eventは一度も生成されず、
600秒のwait timeoutが反復した。`agent_transcript`も同じevent帰属に依存していたため回収不能になった。

同じ失敗sessionのmanaged `CODEX_HOME`を確認すると、Codex自身のroot rollout transcriptには
final assistant messageの直後に、同じ`turn_id`を持つ`event_msg.payload.type="task_complete"`が
hook失敗より先に永続化されていた。1つのroot TUI sessionで複数turnを実行した記録も存在し、
単なる最新完了の検索ではfollow-upを誤帰属することが分かった。

## Decision

Codexの完了正本は、managed `CODEX_HOME`のroot rollout transcriptにある
`task_complete.turn_id`だけとする。

- Codex managed homeへ完了検出用Stop hookを生成しない。
- 完了経路から外れた`src/codex-stop-hook.ts`は配布対象から撤去する。buildは既存`dist/*.js`を
  先に削除し、dirty workspaceでも廃止済みhookをnpm tarballやMCPBへ混入させない。
- Codex起動時に`--dangerously-bypass-hook-trust`を渡さない。
- root TUI rolloutを`session_meta.payload.id`でbindし、後発sub-agent rolloutをrootへ採用しない。
- 初回promptと各follow-upはTUI idle gate後、送信直前のroot transcript byte offsetを既存
  `event_cursor`として返す。waiterはその境界以後の完結JSONL行だけを読む。
- `aiterm-wait`のdone判定と`pty_read(agent_transcript:true)`の最終回答帰属は同じturn記録を使う。
- partial lineは次回観測へ保持し、malformed完結行は診断へ数え、turn増分上限超過やtruncationは明示エラーにする。
- 既存の旧metadataは回答回収と次回dispatchでtranscript routeへ移行できる。古いhook eventを
  transcript完了へ合成して成功扱いしない。

Claude/Grokのmanaged Stop hook routeは変更しない。ただし同じ版付きNode固定を避けるため、残るhookは
server起動時の`process.execPath`ではなく、hook実行時に継承PATHから`node`を解決する。

## Consequences

- Codex完了はhook executable、hook trust、Node Cellar実体の寿命から独立する。
- npm tarballとMCPBにCodex Stop hook executableは存在しない。
- byte cursorによりwaiterの起動順序とfollow-up回数に依存せず、古い`task_complete`を再利用しない。
- Codex rollout JSONLの構造化契約へ依存するため、形式変更は明示エラーと回帰テストで検出する。
- 画面静止、spinner、最終回答文字列は補助観測であり完了根拠へ昇格しない。
- `event_cursor`の公開schemaは変えず、vendor別に指す完了正本だけが異なる。

## Verification

回帰は、送信前の古い完了除外、送信直後の完了、複数follow-upのbyte境界、後発sub-agent rollout除外、
partial／malformed／oversized JSONL、transcriptからの最終回答回収、Claude/Grok hook commandのPATH解決、
clean build後のpackにCodex hookが存在しないことを固定する。
実障害session 2件からはroot rolloutの完了と最終回答を再送なしで回収できた。

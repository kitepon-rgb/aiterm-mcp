# 0015. managed Claude approval relay

## Status

Accepted for implementation — 2026-07-19

## Context

managed Claudeはaiterm所有のStop hookだけを含むlaunch-local settingsで起動する。通常のuser／project
permissionsを継承しないため、別worktreeへの`cd`など正規の操作でもClaude Codeが
`Do you want to proceed?`を表示することがある。

active operation中の通常`pty_send`はturn境界を壊すため拒否し、`pty_key`も`C-c`以外を拒否する。
従来READMEが手動介入escapeとして案内した`force:true`もこの境界を越えない。結果として承認UIへ
`1 Enter`／`2 Enter`を送れず、Stop hookが発火しないままwaiterがtimeoutするデッドロックがあった。

## Decision

1. MCP tool `claude_approval`を追加し、`inspect | respond`の二段階だけを公開する。
2. `inspect`はmanaged Claudeのactive markerを要求し、指定された`operation_id`（匿名turnはnull）と
   完全一致させる。現在画面に`Do you want to proceed?`と単発`Yes`／`No`がある場合だけ、
   正規化した画面全体のSHA-256 digestと選択肢を返す。
3. `respond`は同じactive operationと同じ画面digestをsend lock内で再検証し、
   `approve_once | deny`に対応する数字とEnterだけを一回のtmux操作で送る。
4. 任意文字列、恒久許可、未知／重複選択肢、画面変更後の入力は拒否する。検出不能時にキーを推測しない。
5. approval入力はoperation markerを変更しない。承認後の同じStop eventが元operationへ帰属する。
6. 最終decision、operation ID、画面digest、時刻、選択肢だけをowner-only receiptへ原子的に保存する。
   prompt／command本文は保存しない。session close時に他のmanaged stateと一緒に削除する。
7. `pty_send(force:true)`はmanaged Claude active turnのescapeではないことをREADMEとtool descriptionへ明記する。

## Acceptance

- 別operation、active markerなし、非Claude sessionを入力前に拒否する。
- inspect後の画面digest不一致を入力前に拒否する。
- 単発Yes／Noだけを分類し、恒久許可しかない画面を拒否する。
- respond後もactive markerを保持し、owner-only receiptを残す。
- MCP schemaが13番目のtoolとstructured resultを公開する。
- fixture gateとは別に、公開前のreal-model smokeで別worktree読取のapproval表示、relay、同じStopへの帰属を確認する。

## Consequences

Claude Codeの表示契約が変わり安全に解釈できなくなった場合、approval relayは明示エラーになる。
これは任意キー送信へfallbackするより安全で、CLI差分を検知可能にする。複数rootの事前許可は摩擦を減らす
別機能であり、本relayの代替にはしない。

## Rollback

`claude_approval`登録、coreの検出・入力・receipt、関連testとdocsを同じ変更単位でrevertする。
既存operation marker、Stop hook、`claude_turn`の相関契約は変更しない。

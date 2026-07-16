# 0005. Claude完了結果をcaller operationへ相関する

## Status

Accepted — 2026-07-16

## Context

ADR 0004で受け入れたfixture契約は、同一PTY sessionの直近Claude Stop結果を正確に回収できる。
しかし`pty_send(wait:"agent_done")`のcaller operationと、Stop event／result／後続の
`pty_read(agent_transcript:true)`を結ぶ不変IDを持たない。

このままでは、以前の完了結果R1が残っている状態で新しいoperation O2をdispatchし、Supervisorが
送信境界で停止した場合、回収側はR1がO2の結果かを判定できない。R1を採用すれば誤帰属、O2を再送すれば
重複実行になり得る。Claude本文のechoやPTY screenはoperation identityの証拠にしない。

## Decision

1. `pty_send(wait:"agent_done")`は任意の`operation_id`を受け取る。値はObserverのdurable IDと同じ
   `sha256:<64 lowercase hex>`だけを受理する。通常の対話利用では省略できる。
2. Claude agentへ送信する直前に、Aitermのowner-only secure stateへsession／launch／turnを結ぶactive markerを
   必ず保存する。durable operationではone-shot dispatch receiptを先に保存し、markerへoperation IDを入れる。
   IDなしturnも`operation_id:null`の匿名active markerを持つ。同じsession／launchで同一IDは再送せず、active
   markerが残る間はIDの有無を問わず別turnを送らない。送信前検証に失敗した場合はreceipt／marker／promptを残さない。
3. managed Claude Stop hookはmarkerをowner／mode／nofollow／inodeまで安全検証し、result v2とagent_done eventへ
   同じ`operation_id`を記録してから、読んだ同一inodeのmarkerだけを消費する。
4. `pty_send`の完了suffixと`pty_read(agent_transcript:true, operation_id:...)`は一致したIDだけを成功とする。
   期待IDと直近event／resultが一致しなければ、古い結果を返さず明示的なpending／mismatch errorにする。
5. timeout後の回収は同じ`operation_id`で`pty_read`する。AitermもObserverもpromptを自動再送しない。
   marker保存後・PTY送信確定前のprocess停止は状態不明として表面化させる。これはdelivery成功を捏造しない
   at-most-once recoveryであり、送信そのもののexactly-onceを主張しない。
6. Aitermはactive markerでClaude turnをprocess再起動越しに直列化する。Observer Supervisorも一つのturnを
   apply／cleanupするまで次をdispatchしない。Aitermは後続operationを永続queueとして保持しない。
7. `agent_done:true`のmanaged Claude sessionでは、turn送信を`pty_send(wait:"agent_done")`へ一本化し、
   `wait:"none"`の通常送信を拒否する。active中の`pty_key`は`C-c`だけを許可してmarkerを保持する。遅延Stopが
   markerを消費するまで次turnを送らず、Stopが来ない中断は`pty_close`でsessionごと終了する。
8. transcript回収もactive markerがある間はpendingを返す。古いresultが残っていても、現在turnのStopと
   marker消費が完了するまで公開しない。

## Consequences

- AitermはObserverのoperation内容やMailbox判断を知らず、opaqueな相関IDだけをtransportする。
- Throughline L2はObserver cognitionの代替にならず、SupervisorもAIにはならない。
- ADR 0004の「fixture gateをObserver統合前候補として受け入れる」という結論だけを撤回し、本ADRの
  focused／related／full gateがgreenになるまでqueue 19c3を再開する。Claude永続PTYとStop resultの
  基本契約、live Hが未完了という記録は維持する。
- live Claude model request、login、publish、pushは本決定に含めない。

## Acceptance

- 前turnのresult R1が残る状態でO2を期待して回収してもR1を返さない。
- O2のStop event／resultだけがO2回収を成功させ、suffixにもO2が出る。
- timeout後に同じO2を再送せず回収できる。
- timeout後の同一O2再送と、未解決O2がある間のO3送信をPTYへ流す前に拒否する。
- 未完了の匿名turn N1がある間もO2を拒否し、古いR1をN1/O2の結果として返さない。
- `C-c`はactive markerを消さず、遅延Stopを元turnへ相関する。Stop不在時はcloseだけが解除手段になる。
- malformed／unsafe／stale markerはoperation帰属を作らない。
- `agent_done:false`の通常対話契約と、managed Claudeの同一PTY永続sessionを維持する。

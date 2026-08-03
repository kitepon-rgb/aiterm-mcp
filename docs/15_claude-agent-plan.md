# Claude対話エージェント追加計画

> **現行API追補（2026-08-03）**: 本文の`pty_send(wait:"agent_done")`はv0.15以前の実装史。
> v0.16以降のagent sendは非ブロックdispatchで`event_cursor`を返し、完了通知は別processの
> `aiterm-wait --cursor`、回答回収は`pty_read(agent_transcript:true)`または`claude_turn recover`が担う。
> Claudeのmanaged Stop hook／bounded result／operation相関自体は現行のまま。

## 目的

Claude CodeをAiterm所有の永続PTYへ起動する`claude_agent`を追加し、Codex／Grok／Composerと同じ
対話操作、turn完了待ち、timeout後回収、明示中断を提供する。Observerが同providerの永続Claude
sessionを持つための公開transport契約を完成させる。

契約の正は[ADR 0003](adr/0003-claude-agent-launcher-contract.md)。`claude -p`の反復、Claude private
protocol／transcript読取、Observer／Throughline／Mailboxロジックの内包は非目標とする。

## 実行順TODO

- [x] Claudeはfresh request列ではなく、一つの利用者可視・永続対話sessionで文脈を維持する契約を
  ADR 0003へ固定する。
- [x] Claude CLI path、model／effort、cwdをsession作成前に検証し、失敗時にPTY残骸を残さない。
- [x] launch専用managed Claude settingsとStop hookを実装し、通常settings／hookを継承しない。
- [x] Stop payloadをsession／launchへ厳密相関し、本文なしeventとowner-only bounded resultへ分離する。
- [x] `claude_agent`を公開し、promptなし起動、初回prompt、follow-up `pty_send(wait:"agent_done")`、
  timeout後の同一session回収、interrupt／closeを既存PTYモデルへ接続する。
- [x] `pty_read(agent_transcript:true)`をClaudeのhook-captured resultへ接続し、private transcriptを読まない。
- [x] diagnostics、tool schema、README、CLAUDE、overview、ADR 0002の現行tool countを同期する。
- [x] focused testでpreflight、managed settings、hook security／相関、result回収、ready gate、timeout recoveryを
  一度通す。
- [x] TODO完了候補で関連agent testとstatic gateを一度通す（109 passed、0 failed、0 skipped）。
- [x] Phase完了候補でfull regression（249 passed、0 failed、0 skipped）と独立反証を一度だけ行い、
  指摘2点を[ADR 0004](adr/0004-claude-agent-fixture-gate-acceptance.md)どおり閉じる。
- [x] [ADR 0005](adr/0005-claude-operation-correlated-recovery.md)どおりcaller `operation_id`を
  `pty_send`→one-shot dispatch receipt／active marker→Claude Stop event／result→
  `pty_read(agent_transcript:true)`へ通し、古い完了結果を新operationへ誤帰属せず、timeout後に再送なしで
  同じoperationだけを回収する。IDなしturnも匿名active markerで直列化し、managed Claudeの通常sendを
  `wait:"agent_done"`へ一本化する。
- [x] operation相関のfocused fix（1 passed）、関連agent gate（122 passed）、Phase full regression
  （262 passed）、独立反証（P0/P1/P2残存なし）を各一度通す。受入証拠は
  [ADR 0006](adr/0006-claude-operation-correlation-gate-acceptance.md)へ固定し、独立commitでqueue 19c3を再受入する。
- [x] 既公開`0.12.3`をoperation相関対応版と誤認しないよう、公開minorを`0.13.0`へ上げ、
  `package.json`／lock／`server.json`／MCP initialize／diagnosticsのversion一致をfocused smokeで固定する。
  build＋focused smokeは3 passed、0 failed、0 skipped。受入証拠は
  [ADR 0007](adr/0007-claude-operation-public-version-boundary.md)。release／publish／端末更新は別H承認まで行わない。
- [x] [ADR 0008](adr/0008-claude-operation-structured-caller-surface.md)どおり、durable callerが
  pendingと破損／identity不一致を人間向けerror文字列の解析なしで区別できる構造化`claude_turn` toolを追加する。
  既存`pty_send`／`pty_read`の対話契約は維持し、Observer固有ロジックは入れない。
- [x] `claude_turn`のissue／recover／unknown／exact result、tool output schema、既存対話回帰をfocused 5 passed、
  related 126 passedで閉じる。親反証でrecoverへの暗黙timeout注入を棄却し、最終HEADで両gateを再確認した。
  受入証拠は[ADR 0009](adr/0009-claude-operation-structured-caller-gate-acceptance.md)。live Claude、publish、端末更新は行わない。
- [x] [ADR 0010](adr/0010-agent-launch-structured-receipt.md)どおり、Observerが人間向けtextを解析せず
  永続session handleを取得できる`aiterm.agent-launch-result.v1` structured receiptをlauncherへ追加する。
  既存text contentは互換維持し、Claude fixtureの実MCP call、tool output schema、既存launcher回帰をfocused／related
  gateで閉じた（focused 4 passed、related 94 passed）。受入証拠は
  [ADR 0011](adr/0011-agent-launch-structured-receipt-acceptance.md)。
- [x] **Observer queue 19d-d割込 — `pty_close` exact recovery:** Observerのgeneration rollback／rebind統合で、
  現行`pty_close`が人間向けtextだけを返し、MCP response loss後に「close済み／未実行」をmachine callerが
  exact回収できないことを再現した。既存のidempotent cleanupを維持したまま、`closed | already_closed`を持つ
  structured receiptとtool output schemaを追加し、同じsession IDへのretryだけでterminalを確定可能にする。
  公開machine契約追加は`0.14.0`へ分離し、focused／related gate、独立commitで閉じる。Observer／Throughline／
  Mailbox意味論は入れず、publish／端末更新／live Claudeは行わない。実装・受入証拠は
  [ADR 0012](adr/0012-pty-close-exact-recovery-acceptance.md)。
- [x] **Observer queue 19d-d割込 — `claude_agent` exact launch replay:** Observerのlaunch response loss回収が、
  session存在証拠ではない`claude_turn(recover)`の`operation_not_found`をspawn証拠へ誤用していた。
  promptless managed Claude launchへcallerの`launch_operation_id`を追加し、session名・provider・相関ID・
  launch引数digestが完全一致する同一要求だけを冪等replayとして同じstructured receiptへ回収する。
  session不在なら一度だけ新規起動し、既存sessionのidentity／引数不一致は明示エラーにする。
  `claude_turn`のturn意味論をlaunch recoveryへ流用せず、focused／related gate、独立commitで閉じる。
  公開前の`0.14.0`候補内補正とし、focused 6/6、related 96/96、full 269/269を各一度通した。
  publish／端末更新／live Claudeは行わない。設計・受入証拠は
  [ADR 0013](adr/0013-claude-agent-exact-launch-replay.md)を正とする。
- [x] **Observer queue 19e実機欠陥 — Claude ready stabilization:** 実Claude parentとmanaged Observerの
  両方で、`Claude Code`＋入力欄が一瞬描画された直後の初回promptが消失し、transcript／Stop eventなしで
  ready画面へ戻ることを再現した。別processから同じ公開`pty_send`で送ったEnterなしprobeは表示／消去でき、
  10秒連続ready後のparent promptは自然Stopまで成立したため、PTY送信やhookでなく単発ready判定が原因である。
  初回prompt前だけvendor readyを複数poll連続で確認し、途中で非readyへ戻ればstreakをリセットする。
  timeoutまで安定しなければ文字列を送らず明示失敗する。Claudeだけのprivate回避にせず既存4 vendor共通gateを
  hardeningした。pure 21/21、focused agent 4/4、related 113/113、build、新規ADR lint、diff checkはgreen。
  実managed Claude再Hは次項のlive Hとして独立に判定する
  既存plan 04／15の全体lintは今回外のMD013 baselineで赤のためgreenへ数えない
  （[ADR 0014](adr/0014-agent-tui-ready-stabilization.md)）。
- [x] **managed Claude approval relay:** isolated settingsにより正規の権限確認UIが出た時、
  active operation中の`pty_send(force:true)`と`pty_key`が双方拒否されるデッドロックを解消する。
  `claude_approval`のinspect／respondをoperation IDと画面digestへ結合し、単発Yes／No以外は送らず、
  markerを保持したままowner-only receiptへ記録する。契約は
  [ADR 0015](adr/0015-managed-claude-approval-relay.md)を正とする。
- [x] 実Claude model requestを使うlive H smokeは、目的・影響・rollbackの承認を得て初回／follow-up各一turnと
  別worktreeへのread-only commandでapproval UIを発生させ、inspect→approve_once→同じStop eventへの相関、
  結果回収、session closeを確認する。

fixture gateの旧受入記録は[ADR 0004](adr/0004-claude-agent-fixture-gate-acceptance.md)、Observer統合前に必要な
operation相関の設計は[ADR 0005](adr/0005-claude-operation-correlated-recovery.md)、その受入証拠は
[ADR 0006](adr/0006-claude-operation-correlation-gate-acceptance.md)を正とする。

## Rollback

公開前は本waveの独立commitをrevertし、`claude_agent`登録、managed settings、Stop hook、Claude専用test／
docsだけを除去する。他vendorのlauncher、通常Claude settings、credential、sessionを変更しない。

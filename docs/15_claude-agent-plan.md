# Claude対話エージェント追加計画

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
- [ ] 実Claude model requestを使うlive H smokeは、operation相関gateの完了後、目的・影響・rollbackの承認を得て
  初回／follow-up各一turnで
  実施し、認証再要求、Stop、結果回収、session closeを確認する。

fixture gateの旧受入記録は[ADR 0004](adr/0004-claude-agent-fixture-gate-acceptance.md)、Observer統合前に必要な
operation相関の設計は[ADR 0005](adr/0005-claude-operation-correlated-recovery.md)、その受入証拠は
[ADR 0006](adr/0006-claude-operation-correlation-gate-acceptance.md)を正とする。

## Rollback

公開前は本waveの独立commitをrevertし、`claude_agent`登録、managed settings、Stop hook、Claude専用test／
docsだけを除去する。他vendorのlauncher、通常Claude settings、credential、sessionを変更しない。

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
- [ ] 実Claude model requestを使うlive H smokeは、目的・影響・rollbackの承認後に初回／follow-up各一turnで
  実施し、認証再要求、Stop、結果回収、session closeを確認する。

fixture gateの受入とlive Hの非昇格は[ADR 0004](adr/0004-claude-agent-fixture-gate-acceptance.md)を正とする。

## Rollback

公開前は本waveの独立commitをrevertし、`claude_agent`登録、managed settings、Stop hook、Claude専用test／
docsだけを除去する。他vendorのlauncher、通常Claude settings、credential、sessionを変更しない。

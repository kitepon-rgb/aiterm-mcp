# ADR 0044: release 0.29.0（ready gate明示エラー化）の公開受入

- Status: Accepted
- Date: 2026-08-25
- Release: 0.29.0

## 文脈

実被弾（2026-08-25）: prompt付き`codex_agent`起動で、Codexの起動前ダイアログ（update確認）が
表示されている間はTUIがheader/footerを描かず`codexTuiReady`が恒久falseになる。ready gateが
30秒でtimeoutした後、promptが未送信のまま成功形receipt（`wait_command: null`）が返り、
呼び出し側は40分停滞に気づけなかった。ready失敗を成功形で返す挙動は「静かなフォールバック」で
あり、工場憲法のフォールバック禁止・自己保身の禁止に反する。

## 決定

1. `sendInitialAgentPrompt`のready gate失敗は`AitermError`（code 2）で即時報告する。
   sessionは従来どおり調査/復旧用に残し、エラーメッセージにsession_id・
   `initial_prompt=not_sent`・復旧手順（pty_read(screen:true)→pty_keyでダイアログ応答→
   pty_sendでprompt再送）を含める。全harness共通の契約変更（minor bump）。
2. `codexLaunchBlockingDialog(screen)`を新設し、起動前modalの種別（update確認／
   directory trust確認／「Press enter to continue」型の種別未特定）を実機capture逐語で
   特定してエラーに明示する。ダイアログを自動応答することはしない（updateの選択と
   directory trustは利用者の判断であり、aitermが代行しない）。

## 受入証跡

- macOS full 358 pass / 0 fail（新規: ready失敗の明示エラー契約・ダイアログ検知の実機fixture）。
- end-to-end再現: 未trustディレクトリ＋update確認ダイアログでの起動が、修正前は
  40分沈黙（samples=60でtimeout・成功形receipt）、修正後は約30秒で
  「update確認ダイアログが入力を塞いでいます」の明示エラーを返すことを実測。
- release commit `d7ec7de`、main CI（4環境）`32795532630` success、
  tag CI／npm publish `32795769494` success、Registry workflow `32796078246` success。
- npm 0.29.0、GitHub Release v0.29.0＋MCPB添付、global install後のMCP initialize smokeで
  serverInfo 0.29.0。

# ADR 0050: Aiterm 0.29.25の受入

## 決定

Aiterm 0.29.25を、BellTeamの停止中Bot再配送に必要な正式版として受け入れる。

## 根拠

- Claude Codeの初回起動で連続するBypass Permissions確認とworkspace trust確認を自動処理した。
- Cursorの長文送信後に入力欄へ本文が残る場合を未送信として検出した。
- Codexの起動時更新確認を無効化し、無人起動を妨げないことを確認した。
- Aitermの試験379件は370件成功、OS限定9件skip、失敗0件だった。
- macOS、Linux、WindowsのCIが成功した。
- npm、GitHub Release、公式MCP Registryへの公開が成功した。
- 本番BellTeamで、停止中のClaude、Codex、Cursor、Grokへそれぞれ配送し、全4種の受信と応答を確認した。

## 対象

- source commit: `be5d9627a7964d9dc8b99ecb3d8b080df16f7bcf`
- release: `v0.29.25`
- GitHub Actions: `33595655429`、`33596119522`、`33596175931`

## 未完了

なし。

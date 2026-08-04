# 0013. Claude agentの相関済みexact launch replay

## Status

Accepted — 2026-07-16

2026-08-04追補: exact launch replayと後方互換field `managed_completion`は現行。後者は環境隔離ではなく
「aitermの完了相関あり」を意味する。通常project／user環境を使う境界は
[ADR 0025](0025-shared-agent-environment-and-lineage.md)を正とする。

## Context

`claude_agent`は構造化session receiptを返すが、MCP応答が失われた時に同じlaunchが実行済みかを
machine callerが判定できない。Observerは未dispatch turnへの`claude_turn(recover)`が返す
`operation_not_found`をsession存在証拠へ流用していたが、この結果はturn dispatch receiptの欠落しか示さず、
launch要求がAitermへ到達しなかった場合にも同じ値になる。

session一覧の表示文字列解析や、存在照会後に別のlaunch要求を送る二段階処理は、identity欠落または
TOCTOUを残す。launch自身が同一要求のreplayをexactに処理する必要がある。

## Decision

1. `claude_agent`へ任意の`launch_operation_id`を追加する。形式は既存operationと同じ
   `sha256:<64 lowercase hex>`とし、指定時は`session_name`、`agent_done:true`、promptなし、`wait:"none"`
   を必須にする。対話利用の既存呼出しは変更しない。
2. Aitermはprovider、session名、model、effort、cwd、managed completionをcanonical化したlaunch引数digestと、
   `launch_operation_id`をowner-only agent metadataへ固定する。prompt本文、credential、PTY出力は保存しない。
3. 相関済みlaunchでsessionが既に存在する場合、managed Claude metadata、相関ID、launch引数digestが完全一致する
   時だけCLIを再送せず、同じ`aiterm.agent-launch-result.v1` receiptを返す。不一致、unmanaged session、
   metadata破損は明示エラーにし、表示文字列解析や別routeへfallbackしない。
4. sessionが存在しない場合だけ新規sessionを作る。同時要求でsession作成競合が起きた場合も、勝者のmetadataが
   完全一致した時だけreplay成功として回収し、それ以外は失敗する。
5. launch receiptは従来どおりAiterm session handleの生成だけを証明する。Claude TUI readyとmodel turn成功は
   `claude_turn(issue)`のready／Stop相関が担う。turnの`operation_not_found`をlaunch証拠には使わない。

## Acceptance

- fake Claudeで同じ相関済みlaunchを二度呼び、同じreceiptを返し、CLI起動が一度だけである。
- 同じsession名でも相関IDまたはlaunch引数が違う要求は明示拒否される。
- 相関ID指定時の不足条件と、競合後のidentity不一致をfocused fixtureで固定する。
- 既存の相関IDなしlauncher、`claude_turn`、`pty_close`回帰をrelated gateで維持する。
- 実Claude model request、publish、端末更新は行わない。

## Evidence

- focused: core exact replay／負系 2、tool schema／version smoke 3、実stdio fake Claude replay 1、
  合計6 passed・0 failed・0 skipped。
- related: build後、agent core、実stdio launcher、tool schema／version smokeを96 passed・0 failed・0 skipped。
- full regression: 公開前P1補正後のAiterm全体を269 passed・0 failed・0 skipped。
- 実Claude model request、publish、端末更新: H承認前のため未実施。

## Parent refutation

1. 同じoperation IDでlaunch引数だけ変えれば既存sessionを誤採用できないか。
   - provider、session、model、effort、cwd、managed completionのcanonical digestも完全一致で要求し、
     model差分fixtureを明示拒否したため棄却。
2. replayがClaude CLIへ起動commandを二度送らないか。
   - 初回後のPTY logを固定し、core replay後にbyte不変、実stdio MCPでも同じstructured receiptを確認したため棄却。
3. 既存の相関なし対話launcherや他providerへ契約を波及させないか。
   - 新入力はClaudeだけの任意fieldで、指定時だけpromptless managed条件を発火し、full 269/269で既存回帰を維持した。
4. launch receiptをTUI ready／model成功へ昇格していないか。
   - receipt fieldはv1のまま変更せず、ready／turn成功は既存`claude_turn(issue)`へ残したため棄却。

## Rollback

本waveの独立commitをrevertし、`launch_operation_id`入力、metadata相関、冪等replay fixture、本ADRを除去する。
既存launcher structured receipt、Claude turn相関、close receiptは維持する。

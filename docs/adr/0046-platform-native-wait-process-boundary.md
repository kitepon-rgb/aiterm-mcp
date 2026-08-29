# ADR 0046: platform-native waiter process境界

## Status

Accepted — 2026-08-29

## Context

`agent_launch`とagent `pty_send`は完了相関cursorと人間向け`wait_command`を返す。npmのbinはplatform別shimであり、Windowsの`aiterm-wait`はPowerShell scriptである。callerがコマンド名をprocess APIのexecutableへ解決するとscript pathが返り、Windowsは実行形式として拒否する。callerが拡張子を判定してPowerShell 7 wrapperを組む対処は、製品前提と起動順を利用AIへ漏らす。

## Decision

1. agent launch／dispatch receiptへnullableな`wait_process`を追加する。
2. `wait_process.executable`は現在の`process.execPath`、`args`の先頭は同梱`aiterm-wait-cli.js`とする。後続へsession、cursorを分離して置く。
3. true argv APIはexecutableとargsをそのまま使う。PowerShell 7の`Start-Process`は`-ArgumentList`配列を空白結合するため、製品がWindows quoting済みの`windows_start_process_argument_list`を単一文字列として追加する。callerはshell解析、npm shim探索、拡張子分岐、再quoteを行わない。
4. `wait_command`は互換表示として維持し、process境界へ使わない。
5. WindowsのPTY backendはpsmux 3.3.8以上、対話shellはPowerShell 7だけとする既存契約を変えない。waiterはPTY backendでも対話shellでもなく、完了stateの純リーダーである。
6. `aiterm-wait`のoutcome、exit code、cursor、state所有境界を変えない。

## Acceptance

- pure testがNode executable、同梱CLI、引数分離、Windows quotingを固定する。
- MCP schemaが`agent_launch`と`pty_send`の両方へ`wait_process`を公開する。
- Windows実席で空白入りCLI配置を作り、executableと`windows_start_process_argument_list`を`Start-Process`へ直接渡してargv完全一致を確認する。さらにFable sessionを`outcome=done`、exit 0、stderr 0で回収する。
- npm／MCPB／Official Registry由来installでも同じsmokeを行う。

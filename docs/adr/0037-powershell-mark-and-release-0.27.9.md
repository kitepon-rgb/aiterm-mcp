# ADR 0037: PowerShell mark と release 0.27.9

- Status: Accepted（2026-08-23・公開受入は未完）
- 対象: `pty_send(mark:true)` の PowerShell 完了証拠

## Decision

1. 前面commandが`powershell`または`pwsh`なら、PowerShell構文で完了sentinelを実行時生成する。
   PowerShellの`$?`は真偽なので、成功は`<<<AITERM_DONE rc=0>>>`、失敗は
   `<<<AITERM_DONE rc=1>>>`とする。POSIX shellの任意終了コード契約は変更しない。
2. command echoには完成済みの数字sentinelを含めない。書式文字列`rc={0}`を実行時にformatし、
   `MARK_DONE_RE`の数字アンカーがコマンド本体の出力前に発火する経路を作らない。
3. fish/csh/tcshはPOSIX／PowerShellのどちらの状態取得構文にも従わないため、従来どおり送信前に
   明示拒否する。未知の前面commandはssh/docker越しのPOSIX shell利用を維持するためPOSIX形式を使う。
4. v0.27.9はpatch releaseとし、self-hosted macOS／Linux／Windows／WSL2の同一full suiteが
   greenになったcommitだけをtagする。npm provenance、GitHub Release＋MCPB、Official Registry、
   registry由来global installとPowerShell live smokeまで成立して公開完了とする。

## 根拠

- Windows nativeの実再現では、PowerShell内の本体commandは成功したが、後続のPOSIX `printf`が
  `CommandNotFoundException`となりsentinel未生成のままtimeoutした。
- 修正後のWindows focused regressionは、600ms遅延成功が実出力後に`rc=0`で完了し、
  `Write-Error`は`rc=1`で完了した。既存POSIXの通常markと遅延markも同時にgreenだった。
- 最終実装ではPowerShell固有の集合・構文を`src/tmux-runtime.ts`だけに置き、`src/core.ts`は
  前面commandを渡す共通呼出しだけにした。runtime純粋testはPOSIX既存byte列とWindowsの
  powershell／pwsh分岐の2件がgreen。最終full regressionは4環境CIで確定する。

## 公開受入

公開後に、tag、4環境CI、npm／GitHub／Registry、global install、live smokeの実測値を追記する。

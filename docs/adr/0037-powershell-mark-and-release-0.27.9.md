# ADR 0037: PowerShell mark と release 0.27.9

- Status: Accepted（2026-08-23・公開物は完了、registry由来live smokeだけ未完）
- 対象: `pty_send(mark:true)` の PowerShell 完了証拠
- release commit／tag: `ee1f0692631f07f2700eafa1972a5cd05fe4dadd`／`v0.27.9`

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

- main CI [`32617127573`](https://github.com/kitepon/aiterm-mcp/actions/runs/32617127573) は
  macOS native／Linux native／Windows native／WSL2 の同一full suiteがgreen。Windows checkoutは
  runnerの`getaddrinfo() thread failed to start`で2回失敗したが、既知の工場障害として冷却後に再実行し、
  checkout以降を含む製品fullがgreenになった。製品workflowへretryや回避策は加えていない。
- tag CI [`32617554934`](https://github.com/kitepon/aiterm-mcp/actions/runs/32617554934) も4環境full＋npm
  publishがgreen。Windowsログで`send mark + read wait: PowerShell で sentinel を実行時生成する`が
  2,770msでpassし、全350 test中 pass 305／fail 0／skip 45。
- npm `aiterm-mcp@0.27.9`をprovenance付きで公開。integrityは
  `sha512-l/90G2XGSsvNuXTfdlgZLncT3X47yn7KKBajHqcLY04EEZkJ2nosomAdBDYo5S+1DJ74132IisvHwM50EFYRiw==`、
  shasumは`fc43a3df50168dc64195f38c7b00f23509cdaa6d`。
- [GitHub Release v0.27.9](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.27.9)へ
  `aiterm-mcp.mcpb` 3,486,973 bytesを添付。SHA-256は
  `4dfb1712f3b5a7064a620edffa33133664c9ebc11418f15823ea7db007f2217c`。
- Official Registry workflow
  [`32617776592`](https://github.com/kitepon/aiterm-mcp/actions/runs/32617776592)はsuccess。
- このWindows端末のglobal installを0.27.9へ更新。公開MCPのinitialize=0.27.9、tools/list=14、
  installed runtime JSはrelease buildと17/17ファイルでSHA-256一致した。
- registry由来global processでのPowerShell live smokeは**未完**。initialize／tools/list後の`pty_open`で、
  psmux 3.3.8が新しいsession processを生成したにもかかわらずclientへ登録できず、
  `psmux: failed to create session`となった。隔離namespaceと通常namespaceの独立2経路で再現したため、
  mark処理へ到達していない。失敗smokeが生成した`release0279-*` processだけを終了し、既存sessionは
  触れていない。tag CIのclean Windows namespaceでは同じPowerShell live regressionがpassしており、
  配布JSもbyte一致しているため0.27.9の修理を否定する観測ではないが、ローカル公開後smokeの代替成功には
  数えない。psmux runtimeが新sessionを再び登録できる状態で、registry由来global processの
  `PUB0279_PS_OK`／`rc=0`／`via mark`を取り直す。

# ADR 0039: release 0.28.0 公開受入

- Status: Accepted（2026-08-24・公開完了）
- 対象: harness標準起動API、Cursor Agent CLI adapter、MCPB runtime同梱
- release commit／tag: `26ac8cbc76927ee327bf2e76ca62f68b928f86b6`／`v0.28.0`
- 設計Decision: [ADR 0038](0038-harness-launch-api-and-cursor-agent-cli.md)

## Source acceptance

- 正規入口を15番目のtool `agent_launch({harness, model?, ...})`として追加し、旧4 launcherは
  deprecated thin aliasとして同じ共通実装へ流した。起動・dispatch・wait・configure・listのreceiptは
  `harness`を正本とし、旧vendor/provider/agent fieldは互換用に維持した。
- Cursor公式installerでCursor Agent CLI `2026.08.11-e8db854`を導入し、通常Cursor home／transcript、
  `cursor-agent status`、live model catalog、`--mode ask`、標準model pickerだけを使った。独自tarball、
  launch plugin、別CLI／別modelへのfallbackは追加していない。
- source実席で`gpt-5.4-nano / low`起動から`aiterm-wait`、同一sessionの
  `gpt-5.6-luna / high`変更、follow-up、`cursor:2` transcript回収、closeまで通過した。
- local focused／related gateと最終`npm test`はfail 0。MCPB smokeで既存stagingが
  `dist/vendors/*.js`を欠く起動不能archiveを検出したため、runtime JavaScriptの再帰copyへ根治し、
  staged MCPのversion 0.28.0、15 tools、`cursor-cli` schema、stderr 0と同梱集合をfocused testで固定した。

## Factory CI

- 最初のmain CI
  [`32664476416`](https://github.com/kitepon/aiterm-mcp/actions/runs/32664476416)は3環境green、Windowsだけ
  Cursor resolver testの期待値がPOSIX公式配置`~/.local/bin/cursor-agent`に固定されて失敗した。
  製品resolverは正しくWindows公式配置
  `%LOCALAPPDATA%\cursor-agent\cursor-agent.cmd`を選んでいたため、製品を変更せずtestをOS別公式配置へ直した。
- 修正版main CI
  [`32664712823`](https://github.com/kitepon/aiterm-mcp/actions/runs/32664712823)はself-hosted macOS native／
  Linux native／Windows native／WSL2の同一full suiteがgreen。
- tag CI／Trusted Publishing
  [`32664978268`](https://github.com/kitepon/aiterm-mcp/actions/runs/32664978268)も4環境すべて358 test・fail 0。
  pass／skipはmacOS 355／3、Linux 354／4、WSL2 354／4、Windows 313／45。publish jobもsuccess。

## Public artifacts

- npm `aiterm-mcp@0.28.0`をSLSA provenance付きで公開。integrityは
  `sha512-LYDb0/MwNbBExO5+aW1u94UGv5bnKedqkYy0Tkd9L2vgq2xb6ZEReGhNsDJ/PESCJJ5Gv5jLOfBkzOlywO2f4w==`、
  shasumは`e555efae040f39603328190e86690076746b9075`。
- [GitHub Release v0.28.0](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.28.0)へ
  `aiterm-mcp.mcpb` 3,511,466 bytesを添付。SHA-256は
  `ca7ef046c8edbf821f2ac0c40833cafbd52998d8d6136480e98f0d6e514ba54a`。
- Official Registry workflow
  [`32664978093`](https://github.com/kitepon/aiterm-mcp/actions/runs/32664978093)はsuccess。公開APIで
  `io.github.kitepon/aiterm-mcp` 0.28.0は`status: active`かつ`isLatest: true`。

## 公開後smoke（npm由来standard global install）

- `npm install -g aiterm-mcp@0.28.0`で更新。3 bins、initialize 0.28.0、15 tools、
  `agent_launch.harness`の4値、stderr 0を確認した。installed runtime JavaScriptはrelease buildと
  18/18ファイルでSHA-256一致した。
- global MCPから`harness:"cursor-cli"`、`gpt-5.4-nano / low`、read-onlyで実Cursorを起動。
  初回promptはCLI引数なので`submit_residue:null`、cursor 0から`cursor:1`完了を受信し、
  `PUB0280_CURSOR_FIRST_OK`を通常transcriptから逐語回収した。
- 同じsessionを`gpt-5.6-luna / high`へ変更後、follow-up dispatchはcursor 1・
  `submit_residue:false`、`cursor:2`完了となり、`PUB0280_CURSOR_CONFIGURED_OK`を逐語回収した。
  close後の`pty_list`に`pub0280_cursor_*`残骸なし、server stderr 0。

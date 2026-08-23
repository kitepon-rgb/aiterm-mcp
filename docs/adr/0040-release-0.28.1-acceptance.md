# ADR 0040: release 0.28.1 公開受入

- Status: Accepted（2026-08-24・公開完了）
- 対象: v0.28現行正典の全同期とnpm-visible README
- release commit／tag: `987dfd637ee92ae4cba531ee214b3b18a0b144d4`／`v0.28.1`
- runtime Decision: [ADR 0038](0038-harness-launch-api-and-cursor-agent-cli.md)（0.28.0から不変）

## Source acceptance

- CONTRIBUTING、SECURITY、英日README、AGENTS、design plan、docs索引を現行実装へ同期した。
  Windows nativeは廃止済みWSL bridgeでなくpsmux 3.3.8以上＋Git for Windowsを直接使う契約へ直し、
  公開面15 tools、標準`agent_launch`、旧4 alias、Cursor通常transcript完了、harness／OS別コード所有を揃えた。
- CHANGELOGの全58 release見出しに比較linkを揃えた。archive、過去版ADR、RAG rawは当時の証跡なので
  書き換えていない。
- ランタイムコードと15-tool APIは0.28.0から不変。npmへ入るREADMEを更新して届けるため、再公開不能な
  0.28.0を動かさず0.28.1へpatch bumpした。local focused gateは12 test・fail 0、JSON 4/4、
  CHANGELOG link 58/58、diff check green。

## Factory CI

- main CI [`32671378001`](https://github.com/kitepon/aiterm-mcp/actions/runs/32671378001)はself-hosted
  macOS native／Linux native／Windows native／WSL2の同一full suiteがgreen。
- tag CI／Trusted Publishing
  [`32671592943`](https://github.com/kitepon/aiterm-mcp/actions/runs/32671592943)も4環境すべて358 test・fail 0。
  pass／skipはmacOS 355／3、Linux 354／4、WSL2 354／4、Windows 313／45。publish jobもsuccess。

## Public artifacts

- npm `aiterm-mcp@0.28.1`をSLSA provenance付きで公開。integrityは
  `sha512-8dA++ghzhC8/+ehbtEAn2UumHgpoHW1sWNHY6gx2H+4Q97/Uj/b2TJR5F057cWK7XgqqWpvxjXM7Vy1P1lmoow==`、
  shasumは`f392a19f9c530bfc25d6f23637ab6a5605db1fb1`。
- [GitHub Release v0.28.1](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.28.1)へ
  `aiterm-mcp.mcpb` 3,511,489 bytesを添付。SHA-256は
  `de695a7dfecac4e8f5aede41e16681088d60e562b4ad072d0f833609db57b937`。
- Official Registry workflow
  [`32671592614`](https://github.com/kitepon/aiterm-mcp/actions/runs/32671592614)はsuccess。公開APIで
  `io.github.kitepon/aiterm-mcp` 0.28.1は`status: active`かつ`isLatest: true`。

## 公開後smoke（npm由来standard global install）

- `npm install -g aiterm-mcp@0.28.1`で更新。3 bins、initialize 0.28.1、15 tools、
  `agent_launch.harness`の4値、stderr 0を確認した。installed runtime JavaScriptはrelease buildと
  18/18ファイルでbyte一致した。
- npm同梱READMEでWindows nativeのpsmux 3.3.8以上、15 tools、Cursorの
  `turn_ended(status:"success")`完了記述がすべて含まれることを確認した。
- 実Cursor E2Eは再実行していない。0.28.1はランタイム不変で、installed runtime 18/18 byte一致により
  0.28.0の公開版Cursor実席受入（ADR 0039）をそのまま継承するためである。

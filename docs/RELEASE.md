# Release

Aitermのreleaseはこのrepositoryが所有する。`.github/workflows/product-full-ci.yml`が変更影響選択、runnerと
製品gateの正本であり、dotagentsの工場CIは横断受入のconsumerであってreleaseを制御しない。

## CIの範囲

- push／pull request: `linux-workstation` 1環境。変更した実装の依存graphから試験を選び、依存を確定できない変更は
  Linuxの全テストへ広げる。Windows固有ファイル（`src/windows-powershell.ts`、`src/psmux-send-worker.ts`、
  `test/windows-*.test.mjs`）を触った変更だけ`windows-native`を加える。
- 週1回の定期実行（月曜 03:00 JST）と手動実行だけが、`macos-native`、`linux-workstation`、`windows-native`の
  3環境で全テストを回す。
- tag push: 所有確認と、tagged commitが`origin/main`の祖先であることの確認だけを行い、npmへprovenance付きで
  publishする。同じcommitのmain CIの結果は待たない。

実測（2026-09-02）: Linux 2分、macOS 2分、Windows 6分。全環境展開ではWindowsが常にcritical pathになる。

## Release手順

1. 変更に直結するfocused testを手元で通す。full regressionは手元で回さず、CIに任せる。
2. `CHANGELOG.md`の`## [Unreleased]`へ内容を書き、mainへcommitしてpushする。
3. 一回で公開する。

   ```bash
   npm run release -- <version>
   ```

   scriptはversion同期（`package.json`、`package-lock.json`、`server.json`、`mcpb/manifest.json`、`README.md`、
   `README.ja.md`）、CHANGELOG見出しと比較link、metadata検査、release commit、main push、`v<version>` tag push、
   MCPB build、GitHub Release作成までを行う。tag pushがnpm publish、Release作成がOfficial MCP Registry登録を起動する。
   scriptはその完了を待たない。

4. 後で確認する: `npm view aiterm-mcp@<version> version`、Official Registryの`io.github.kitepon/aiterm-mcp`。

同じversionのtagやnpm packageを移動・上書きしない。失敗版はそのまま残し、修正版を次のversionで出す。

## 公開後smoke

公式npm packageを隔離またはglobal installし、変更に触れたharnessの起動、non-blocking dispatch、wait outcome、
transcript回収、`pty_close`後の残骸ゼロを確認する。

## 利用者の更新と巻き戻し

global installはnpmの公開packageだけで完結する。

```bash
npm install -g aiterm-mcp@latest
npm install -g "aiterm-mcp@<known-good-version>"
```

`npx`をMCP設定から使う場合は、package引数を`aiterm-mcp@latest`へ変えると更新でき、
`aiterm-mcp@<known-good-version>`へ変えると固定・巻き戻しできる。変更後はMCP clientを再起動する。
dotagentsの導入・更新は不要である。

## 公開物の巻き戻し

利用環境は直前の正常npm versionを明示installして戻す。公開済みtagは動かさず、npm packageは上書きしない。
state schemaやmigrationを変更するreleaseでは、旧versionへ戻せる条件をCHANGELOGへ明記してから公開する。

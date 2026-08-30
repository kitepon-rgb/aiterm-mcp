# Release

Aitermのreleaseはこのrepositoryが所有する。`.github/workflows/product-full-ci.yml`が4環境runnerと
製品gateの正本であり、dotagentsの工場CIは横断受入のconsumerであってreleaseを制御しない。

## Version同期

新versionでは次を同じ値へ更新する。

- `package.json`と`package-lock.json`
- `server.json`
- `mcpb/manifest.json`
- `README.md`と`README.ja.md`の現行公開版
- `CHANGELOG.md`の新version見出し、`Unreleased`比較先、新version比較link

同じversionのtagやnpm packageを移動・上書きしない。失敗版はそのまま残し、修正版を次のversionで出す。

## Local gate

変更に直結するfocused testを通した後、最終確認を一度だけ行う。

```bash
npm ci
npm test
npm pack --dry-run
npm run mcpb:build
```

MCPBのstaged serverでversion、15 tools、stderr 0、必要なruntime JavaScriptの同梱を確認する。

## Mainと公開

1. release commitを`main`へpushし、macOS native、Linux native、Windows native、WSL2の同一fullをgreenにする。
2. `npm run verify:release-commit`で対象commitが`origin/main`の祖先かつworktree cleanであることを確認する。
3. 同じcommitへ`v<version>` tagを付けてpushする。tag CIが4環境green後にnpmへprovenance付きでpublishする。
4. build済みMCPBを添付したGitHub Releaseを公開する。release eventがOfficial MCP Registry登録を起動する。
5. npm、GitHub Release、Official Registryが同じversionを返すまで確認する。

CI callerは同じrepositoryの`./.github/workflows/product-full-ci.yml`だけを呼ぶ。製品側の`npm test`、
4環境runner、release gateを外部repositoryへ移さず、dotagentsの変更や停止からAitermの受入を独立させる。

## 公開後smoke

公式npm packageを隔離またはglobal installし、次を確認する。

- `aiterm-mcp`、`aiterm-wait`、`aiterm-runtime-errors`の3 bins。
- MCP initializeのversion、15 tools、stderr 0。
- POSIXはtmux、Windows nativeはpsmux 3.3.8以上とPowerShell 7。
- 変更に触れたharnessの起動、non-blocking dispatch、wait outcome、transcript回収、`pty_close`後の残骸ゼロ。
- Official Registryが`io.github.kitepon/aiterm-mcp`の同じversionをactive／latestとして返す。

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

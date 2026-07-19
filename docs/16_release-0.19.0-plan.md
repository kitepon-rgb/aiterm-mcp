# v0.19.0 approval relay release plan

## 目的

managed Claude approval relayを含む`aiterm-mcp@0.19.0`を、現行ドキュメント・npm・GitHub Release・
Official MCP Registry・この端末のglobal installまで同じ成果物として公開し、各段階のreceiptを確認する。

## F / A / H

- F: 公開契約、版整合、tag／npm／Registryの順序、公開後の証跡裁定は親が直接扱う。
- A: なし。単一repoの同じ文書群とrelease stateを直列に扱うため、worker委譲・並列writerは使わない。
- H: commit、push、tag push、GitHub Release、npm本番公開、global install。2026-07-19のオーナー指示
  「全ドキュメント更新　コミット　プッシュ　Npmリリース　npmインストール」で明示承認済み。

## 成功条件

- [x] 現行仕様として読まれる全Markdown／manifestのtool count、version、approval契約を同期し、
  過去時点のADR／受入記録は履歴として保持する。
- [x] `CHANGELOG.md`へ0.19.0を追加し、package／lock／server manifestを0.19.0で一致させる。
- [x] full regression、release metadata、diff hygieneがgreen（300/300、metadata 1/1、pack 14 files）。
- [x] 対象pathだけをrelease commit `96d461c`へcommitし、`main`をpushする。
- [x] `v0.19.0` tagをpushし、必須GitHub Actions全jobのgreenとnpm provenance publishを確認する（run `29682309390`）。
- [x] GitHub Releaseを公開し、Official MCP Registry workflowのgreenを確認する（run `29682448833`）。
- [x] npm registry由来の隔離installでversion・bin・13 tools・approval schemaを確認する。
- [x] この端末へ`aiterm-mcp@0.19.0`をglobal installし、installed distと公開tarball／source distの一致を確認する。
- [ ] 公開証跡を`CLAUDE.md`／`docs/PROMOTION.md`／不変ADRへ還流し、planをarchiveしてdocs commitをpushする。

## 非目標

- Claude Codeのpermissions自体を緩和しない。
- user／project settings全体をmanaged Claudeへ継承しない。
- npmの既存versionを上書きしない。公開後の修正は新しいpatch versionで行う。
- unrelatedなREADME刷新、外部告知、別repo変更は行わない。

## 既知の罠

- npm publishはtag CIのOIDC Trusted Publishingが正規経路。local `npm publish`へ切り替えない。
- GitHub Release起点のRegistry workflowはnpm版の出現を待つ。npm確認前のRelease並走を成功扱いしない。
- tagはrelease commitへ固定する。公開証跡の追記commitでtagを動かさない。
- 稼働中MCP processはglobal install後も旧版のまま。次回MCP再接続で新versionが有効になる。
- rollbackはpush前なら追加修正、push／publish後は履歴改変せず新patch release。

## 検証

```bash
npm test
node --test test/release-metadata.test.mjs
git diff --check
npm view aiterm-mcp@0.19.0 version dist.integrity dist.shasum --json
gh run list --workflow ci.yml
gh run list --workflow registry.yml
```

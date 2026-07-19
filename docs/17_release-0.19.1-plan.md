# v0.19.1 atomic multiline release plan

## 目的

通常PTYの複数行を途中のpager／REPLへ誤帰属させない修理を`aiterm-mcp@0.19.1`として、
npm・GitHub Release・Official MCP Registry・この端末のglobal installまで同じ成果物で公開する。

## F / A / H

- F: 複数行shell入力の公開契約、版整合、公開順序、公開後の同一成果物判定は親が直接扱う。
- A: なし。単一repo・同一release stateを直列処理するためworker委譲しない。
- H: commit、push、tag／GitHub Release、npm本番公開、global install。2026-07-19のオーナー指示
  「コミット　プッシュ npmリリース　npmインストール」で明示承認済み。

## 成功条件

- [x] 修理前の入力誤帰属を再現し、修理後のfocused／PTY関連gateをgreenにする（2/2、66/66）。
- [x] README日英、CHANGELOG、CLAUDE、design plan、ADR 0001へ公開契約を同期する。
- [x] package／lock／server manifestを0.19.1で一致させる。
- [x] full regression、release metadata、pack dry-run、diff hygieneをgreenにする（301/301、1/1）。
- [ ] 対象pathだけをcommitし、`main`をpushする。
- [ ] `v0.19.1` GitHub Releaseを作成し、tag CIの全必須jobとnpm provenance publishを確認する。
- [ ] npm registry由来の隔離installでversion・3 bins・13 tools・修理済みdistを確認する。
- [ ] Official MCP Registry workflowのgreenを確認する。
- [ ] この端末へregistry版`aiterm-mcp@0.19.1`をglobal installし、symlinkでなくregistry実体かつdist一致を確認する。
- [ ] 公開receiptを不変ADR、CLAUDE、PROMOTIONへ還流し、planをarchiveして証拠commitをpushする。

## 非目標

- `raw:true`または非shell前面の直接PTY paste契約を変更しない。
- unrelatedな機能追加、外部告知、別repo変更を行わない。
- npm既存versionや公開済みtagを上書きしない。

## 既知の罠

- npm公開はtag CIのOIDC Trusted Publishingが正規経路。local `npm publish`へ切り替えない。
- 現在のglobal `0.19.1-local.0`はrepoへのsymlink。最終受入ではregistry installで必ず置換する。
- npm版の出現前にregistry installやOfficial Registry成功を主張しない。
- 稼働中MCP processはglobal install後も旧版。次回MCP再接続から0.19.1が有効になる。
- 公開後のrollbackは履歴改変でなく新patch releaseとする。

## 検証

```bash
npm test
node --test test/release-metadata.test.mjs
npm pack --dry-run --json
git diff --check
npm view aiterm-mcp@0.19.1 version dist.integrity dist.shasum --json
gh run list --workflow ci.yml
gh run list --workflow registry.yml
```

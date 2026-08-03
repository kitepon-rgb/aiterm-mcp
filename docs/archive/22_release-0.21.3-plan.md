# v0.21.3 Codex rollout completion release plan

## 目的

Codexの完了通知をStop hookからroot rollout transcriptの`task_complete.turn_id`へ移した修理を、
`aiterm-mcp@0.21.3`として全現行文書・4 manifest・npm・GitHub Release・Official MCP Registry・
この端末のglobal installまで同じrelease commitから届ける。npmだけが0.21.0、server／MCPB／GitHubが
0.20.3に残った公開面分裂と、0.21.0の`write_scope`指定時だけstructured launch receiptから
scope／enforcementが消える逆条件も本releaseで解消する。

## F / A / H

- F: 完了正本、turn帰属、公開version、release commit／tag／npm／Registryの順序と同一性は親が直接裁定する。
- A: writerはなし。公開前の独立read-only反証だけをrefuterへ委譲し、指摘修正後に再反証で閉じる。
- H: commit、push、tag push、GitHub Release、npm本番公開、Official Registry、global install。
  2026-08-03のオーナー指示「全ドキュメント更新　コミット　プッシュ　NPMリリース　NPMインストール」で明示承認済み。

## 成功条件

- [x] 日英README、CHANGELOG、CLAUDE、overview、design、agent-done／prompt UX履歴、RAG brief、
  PROMOTION、release plan、ADRが現行仕様と履歴の境界を同じ言葉で示す。
- [x] package.json、package-lock.json、server.json、mcpb/manifest.jsonが0.21.3で一致する。
- [x] full regression 322/322、release metadata 2/2、MCPB build／validate、npm pack 13 files、
  changed-doc local link check、diff hygieneがWindows identity timeout修正後の0.21.3 stateでgreen。
- [x] npm tarballとMCPBに廃止済み`codex-stop-hook.js`がなく、dirtyな既存`dist`からも再混入しない。
- [x] Codex/Grok/Composerの`write_scope`指定時にscope／enforcementをstructured receiptへ返し、
  省略時は既存shapeへfieldを足さないことを実MCP境界で固定する。
- [x] release commitをmainへpushし、main CI全matrixのgreenを確認してから`v0.21.3` tagをpushする。
- [x] tag CIの全必須jobとnpm provenance publish、GitHub Release、Official Registry workflowがgreen。
- [x] npm公開APIで0.21.3のlatest／integrity／shasum／provenanceを確認する。
- [x] registry由来の隔離installでversion、3 bins、13 tools、stderr 0、Codex completion説明を確認する。
- [x] この端末へ`aiterm-mcp@0.21.3`をglobal installし、registry実体と公開tarballの同一性を確認する。
- [x] 公開receiptをCLAUDE、PROMOTION、不変release ADRへ還流し、planをarchiveしてdocs commitをpushする。

## 完了receipt

- release commit: `902379325c947030d5b6a8eb79e963e3f6f99c51`
- main CI: `30813089848` success
- tag CI／npm publish: `30813318513` success
- GitHub Release: `v0.21.3 — Codex completion recovery`
- Official Registry: workflow `30813724499` success、0.21.3 active/latest
- npm／install受入: [ADR 0023](../adr/0023-release-0.21.3-acceptance.md)

## 非目標

- 公開済み0.21.0を上書き・unpublish・履歴改変しない。
- raw調査資料に記録された当時のStop hook実測を現行仕様へ書き換えない。現行結論の追補だけを加える。
- Claude/Grokの完了正本をCodexと同じtranscript routeへ変更しない。
- 委譲guardの所有repoやdotagentsを変更しない。
- 別機能、外部告知、Smithery再公開を混ぜない。

## 既知の罠

- npm公開は`v*` tag CIのOIDC Trusted Publishingが正規経路。local `npm publish`へ切り替えない。
- publish対象commitは先にorigin/mainへ着地させる。tagはrelease commitへ固定し、receipt追記commitへ動かさない。
- GitHub Release起点のRegistry workflowはnpm版の出現を待つ。npm確認前のRegistry成功を主張しない。
- 0.21.0はnpmに存在するがtag／GitHub Release／Registryがない。0.21.3のgreen chainで修復し、
  過去版へ後付けtagを作ってgreenを捏造しない。
- v0.21.1 tag CIは非hermetic Grok fixtureで失敗し、publish jobはskipされた。tagを移動・削除せず、
  fixtureを偽binへ固定した。
- v0.21.2 tag CIはWindows 20のprocess start identity用PowerShellが1秒上限を超えて失敗し、publish
  jobはskipされた。tagを移動・削除せず、DACLと同じ5秒予算へ統一した新commitをv0.21.3とする。
- 稼働中MCP processはglobal install後も旧版のまま。次回MCP再接続から0.21.3が有効になる。
- 公開後の修正は履歴改変でなく新しいpatch releaseで行う。

## 並列化裁定

文書・manifest・version・公開receiptが同一release stateへ密結合しているため、writerは親1本で直列化する。
公開前のread-only反証だけは独立実行できるが、publish・installは親が順序を固定して行う。

## 検証

```bash
npm test
node --test test/release-metadata.test.mjs
npm run mcpb:build
npm pack --dry-run --json
git diff --check
npm view aiterm-mcp@0.21.3 version dist.integrity dist.shasum --json
gh run list --workflow ci.yml
gh run list --workflow registry.yml
```

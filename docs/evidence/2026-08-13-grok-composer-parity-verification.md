# Grok／Composer agent parity — verification evidence

## Focused and live acceptance

- `test/core-agent.test.mjs`: 117/117 pass。
- `test/smoke.test.mjs`: 3/3 pass。
- Grok Build 1.0.3 live:
  - `grok-4.6`／`high`／`read-only`で起動。
  - 同一sessionで`grok-4.5 medium`へ変更後、effortだけ`high`へ変更。
  - 画面で`Grok 4.5 (high)`と`sandbox:read-only`を確認。
  - 現行catalogにないComposer既定はPTY作成前に拒否し、残骸sessionなし。

## Full regression

最初の`npm test`は344/345。失敗は`test/launcher-structured.test.mjs`の偽Grokが新しい
`grok models`外部境界を実装せず、`/bin/echo`をcatalog commandにも使っていたfixture不整合1件だった。
製品コードは変更せずfixtureへcatalog出力を追加し、該当focused testを1/1 greenに切り分けた。

最終`npm test`:

- 345/345 pass
- exit 0
- stdout SHA-256: `dc44fc2774ba113cad272302d0465f1f4eeed5dd26f812f16c4afdb75ecc8278`
- stderr SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Distribution candidate

### npm pack dry-run

- package: `aiterm-mcp@0.25.0`
- entry count: 13
- packed size: 126,379 bytes
- unpacked size: 428,775 bytes
- stdout SHA-256: `b1d39509a8b325e42469b58033ba94e93be678461ca881b14f6d8cfa0a37bfeb`

### MCPB

- manifest validate: pass
- version: `0.25.0`
- files: 2,261
- package size: 3.3 MB
- archive SHA-256: `995908420caab03003937387cacad4a2bdb827c295173bd186dfb1ab04e4d4a8`
- build stdout SHA-256: `88dc4e7af5d333cfc6a8d556b575ec64127fcec9aab778486012c1d69f38bf26`

### Staged MCP

`dist/mcpb-stage/server/dist/index.js`を実起動してinitialize／tools/listを行った。

```json
{"schema":"aiterm.staged-mcp-smoke.v1","version":"0.25.0","tools":14,"providers":4,"stderr_bytes":0}
```

`grok_agent`／`composer_agent`の`reasoning_effort`と`write_scope` input schema、
`agent_configure` output provider enum `claude, codex, grok, composer`を確認した。

## Knowledge return

- 日英README、CLAUDE.md、設計正本、docs索引、CHANGELOG、MCPB manifestを現行契約へ同期。
- Grok Build公式source 4件をcommit固定URLでRAGへ取り込み、`rag/INDEX.md`／manifestを再生成。
- 旧計画2件は完了履歴として保持し、本計画だけをactive正本にした。
- 変更Markdown 17 filesのlocal link 184件を検査し、missing 0。`git diff --check`もexit 0。

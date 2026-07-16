# 0007. Claude operation相関の公開version境界

## Decision

2026-07-16、operation相関を含むAiterm公開面を`0.13.0`とする。既に公開済みの`0.12.3`は
`operation_id`、dispatch receipt、active marker、result v2を含まないため、同じversionのsource差分として
扱わない。Observer production callerはMCP initializeとdiagnosticsで`0.13.0`を完全一致検証してから使う。

`package.json`、`package-lock.json`のroot、`server.json`のserver／npm package、MCP initialize、
diagnosticsは同じversionを返す。package／server descriptionもClaude launcherを公開面に含める。

## Gate evidence

- `npm run build && node --test test/smoke.test.mjs`
- 3 passed、0 failed、0 skipped。
- package／lock／server manifestの`0.13.0`一致、MCP initialize／diagnosticsとpackage versionの一致、
  operation相関を持つ11 tool schemaを確認した。

## Non-goals

release tag、npm／MCP Registry publish、global install更新、実Claude model requestは行っていない。
これらは目的・影響・rollbackを示した別H承認を要する。

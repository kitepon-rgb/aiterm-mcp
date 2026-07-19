# ADR 0016: v0.19.0公開受入記録

- 日付: 2026-07-19
- 状態: Accepted
- 対象: `aiterm-mcp@0.19.0`

## 裁定

ADR 0015のmanaged Claude approval relayを含むrelease commit
`96d461c03d58f7098ab70ecac8d32b05cadc6bca`を`v0.19.0`として公開し、npm、GitHub Release、
Official MCP Registry、この端末のglobal installが同じ成果物を指すことを受け入れる。

## 公開receipt

- local full regression: 300 passed / 0 failed / 0 skipped。
- release metadata: 1 passed。package／lock／server manifestは0.19.0で一致。
- pack dry-run: `aiterm-mcp-0.19.0.tgz`、14 files、110,551 bytes。
- tag CI: run `29682309390` success。Ubuntu Node 18/20/22、macOS Node 18/20/22、
  Windows純粋層 Node 20/22、publish jobがすべてgreen。
- npm: latest `0.19.0`。integrity
  `sha512-SEycVHXfcCsDQOAUAbumGY8YP5A9T9JBMzD1psJ+SCvRkALBIbtmFXZFXYsgu5UUnBLzJnx3ineRSRuXjZdlWQ==`、
  shasum `24dc203a2e87fd0735b89759b4d3b81cea58f516`。
- GitHub Release: `v0.19.0 — managed Claude approval relay`、draft／prereleaseではない。
- Official MCP Registry: workflow `29682448833` success。npm版の出現待ち、GitHub OIDC認証、
  `server.json` publishをすべて通過。
- 隔離install: `/tmp/aiterm-019-isolated.lUtri6`へregistryからinstallし、version 0.19.0、
  3 bins、13 tools、`aiterm.claude-approval-result.v1` schema、local `dist/`との差分ゼロを確認。
- global install: `/opt/homebrew/lib/node_modules/aiterm-mcp@0.19.0`。3 binは
  `/opt/homebrew/bin/aiterm-mcp`、`aiterm-wait`、`aiterm-runtime-errors`。同じschemaとdist一致を確認。

## 留保

実Claude model requestで別worktreeのapproval UIを発生させるlive smokeは未実施。fixtureの正系、
恒久許可拒否、画面／operation相関、receipt permission、および公開MCP schemaは回帰化済みだが、
real-model完遂をfixtureから主張しない。稼働中MCP processは接続時の旧版を保持するため、0.19.0の
tool surfaceは次回MCP再接続から有効になる。

## Rollback

npm公開後の履歴・tagは改変しない。不具合が判明した場合は新しいpatch versionで訂正し、npm、GitHub Release、
Official MCP Registry、installを同じ順序で再受入する。

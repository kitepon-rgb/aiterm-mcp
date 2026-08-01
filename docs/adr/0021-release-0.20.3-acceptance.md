# ADR 0021: v0.20.3 managed Claude共有認証修理の公開受入

日付: 2026-08-01

## Status

Accepted。`aiterm-mcp@0.20.3`はnpm、GitHub Release、Official MCP Registryへ公開し、
registry由来のglobal installとMCP initialize／tools-list smokeまで完了した。

## Decision

[ADR 0020](0020-managed-claude-authentication-preflight.md)で確定したmanaged Claude／Fableの
共有認証preflight、session内の認証変更拒否、Stop完了回収race修理をpatch version 0.20.3として公開する。
公開履歴はrelease commit `97f2c3a8a7b04c1d654342048336927d67549ef0`とtag `v0.20.3`を正本とする。

## Acceptance evidence

- release full regression: 317 passed / 0 failed / 0 skipped。
- related tests: 99 passed / 0 failed。
- 実Claude Code v2.1.220／Fable 5 low effort: 独立Node/MCP相当process 3本×2波、計6 processを
  追加loginなしで同時・反復起動し、全件done、exact result回収、close。
- npm pack dry-run: `aiterm-mcp@0.20.3`、14 files。MCPBはversion 0.20.3、13 tools、
  schema／archive validation成功。
- main CI: run `30680332796` success。
- tag CI: run `30680336472` success。Ubuntu Node 18/20/22、macOS Node 18/20/22、
  Windows純粋層 Node 20/22、Trusted Publishingのpublish jobがすべてgreen。
- npm: latest `0.20.3`、14 files、unpacked 387,955 bytes、SLSA provenance v1。
  integrity `sha512-mPZ3RtuLG8eMdxvZ/ofdKYKsOSIKt8xxKuH1ye6Y+fa+j1EkNqJv+2219yYerBBR1I7toVNQ2aB/g38UHwPaZA==`、
  shasum `c7f271d8c2f9e619a12b21593a14aee48bd9ad7c`。
- GitHub Release: `v0.20.3 — managed Claude/Fable shared-auth stability`。
  draft／prereleaseではなく、tagはrelease commitを指す。
- Official MCP Registry: workflow `30680345129` success。
  `io.github.kitepon-rgb/aiterm-mcp` 0.20.3は`active`かつ`isLatest: true`。
- この端末のglobal installを0.20.2から0.20.3へ更新。registry由来packageで3 bins、
  initialize version 0.20.3、13 tools、stderr 0 bytesを確認。

## Rollback

npm公開済みversion、tag、GitHub Release、Registry履歴は改変しない。不具合が判明した場合は
新しいpatch versionで訂正し、公開面とglobal installを同じ版へ進める。

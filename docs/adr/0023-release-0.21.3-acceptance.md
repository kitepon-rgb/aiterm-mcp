# ADR 0023: v0.21.3 Codex rollout完了正本修理の公開受入

日付: 2026-08-03

## Status

Accepted。`aiterm-mcp@0.21.3`はnpm、GitHub Release、Official MCP Registryへ公開し、
npm由来の隔離installとこの端末のglobal install、MCP initialize／tools-list smokeまで完了した。

## Decision

[ADR 0022](0022-codex-rollout-completion.md)で確定したCodex rollout transcriptの
`task_complete.turn_id`を完了・帰属正本とする修理、Codex Stop hook廃止、Claude／Grok hookの
PATH基準`node`解決をpatch version 0.21.3として公開する。同時に0.21.0で逆転していた
`write_scope` structured receipt条件、dirty buildからの廃止artifact再混入、非hermetic Grok fixture、
Windows process identity用PowerShellの実行予算を修理した。

公開履歴はrelease commit `902379325c947030d5b6a8eb79e963e3f6f99c51`とtag `v0.21.3`を正本とする。

## Acceptance evidence

- release full regression: 322 passed / 0 failed / 0 skipped。
- release metadata: 2 passed / 0 failed。MCPB build／validate、changed-doc local link check、
  `git diff --check`がgreen。
- npm pack dry-run: `aiterm-mcp@0.21.3`、13 files。npm tarballとMCPBの双方に
  `codex-stop-hook.js`はなく、Claude／Grok hookだけを含む。
- main CI: run [`30813089848`](https://github.com/kitepon-rgb/aiterm-mcp/actions/runs/30813089848) success。
  Ubuntu Node 18/20/22、macOS Node 18/20/22、Windows Node 20/22の全matrixがgreen。
- tag CI: run [`30813318513`](https://github.com/kitepon-rgb/aiterm-mcp/actions/runs/30813318513) success。
  全必須testとTrusted Publishingのnpm publish jobがgreen。
- npm: latest `0.21.3`、13 files、unpacked 397,706 bytes、SLSA provenance v1。
  integrity `sha512-Dwxpa4nk1kRxsspxVpw1cUQA7yztdx1WIxEkyzI6SLcMiZ66xatKQn8nxETN8d/3sD0yqpkjsHoBJHRj5U6KRw==`、
  shasum `680933ff48285834fe05c565671770c2a9ab4714`。
- [GitHub Release](https://github.com/kitepon-rgb/aiterm-mcp/releases/tag/v0.21.3):
  `v0.21.3 — Codex completion recovery`。draft／prereleaseではなく、tagはrelease commitを指す。
- Official MCP Registry: workflow
  [`30813724499`](https://github.com/kitepon-rgb/aiterm-mcp/actions/runs/30813724499) success。
  `io.github.kitepon-rgb/aiterm-mcp` 0.21.3は`active`かつ`isLatest: true`。
- npm由来の隔離install: version 0.21.3、3 bins、13 tools、stderr 0 bytes。Codex launcherの
  `prompt`／`model`／`reasoning_effort`／`cwd`／`write_scope`完全例とstructured receipt fieldsを確認し、
  廃止Codex hookが存在しないことを確認。
- この端末のglobal installを0.21.0から0.21.3へ更新。`/opt/homebrew/bin`の3 commandが
  0.21.3 package内の各binを指し、実起動でinitialize応答、13 tools、stderr 0 bytesを確認。

## Failed release attempts retained

- `v0.21.1`: tag CI `30811641682`はGrok fixtureが実CLIを暗黙利用してLinux／macOSで失敗。
  publish jobはskipされ、npm／GitHub Release／Registryへは公開していない。tagは移動・削除していない。
- `v0.21.2`: tag CI `30812324526`はWindows Node 20でprocess identity用PowerShellの1秒上限を超過。
  publish jobはskipされ、npm／GitHub Release／Registryへは公開していない。tagは移動・削除していない。

両失敗は公開前gateが欠陥を止めた記録であり、成功へ書き換えない。fixtureを偽binへ隔離し、Windowsの
実行予算を既存DACL処理と同じ5秒へ統一した別commitを0.21.3としてmain CIから再検証した。

## Runtime activation

global installはディスク上の配布物を更新するが、既に接続中のMCP processは旧実体のまま動き続ける。
0.21.3は次回MCP再接続から有効になる。

## Rollback

npm公開済みversion、tag、GitHub Release、Registry履歴は改変しない。不具合が判明した場合は
新しいpatch versionで訂正し、公開面とglobal installを同じ版へ進める。

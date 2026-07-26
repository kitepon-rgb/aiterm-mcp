# ADR 0019: v0.20.2 公開面・作者帰属の受入記録

- 日付: 2026-07-26
- 状態: Accepted
- 対象: `aiterm-mcp@0.20.2`

## 裁定

release commit `3715c7a5f40c618f819adea812b73c13aa976fee`を、npmでの発見性、
Claude Code × Codex CLIの差別化、Quo / クオへの作者帰属を確定する公開版として受け入れる。
runtimeの挙動は0.20.0から変更せず、npm、GitHub Release、Official MCP Registry、
registry由来の隔離installが同じ0.20.2を指すことを受入条件とする。

## 公開面

- npm descriptionは203文字で途中切れせず、Claude CodeからCodex CLIの対話TUI、
  slash command、`$imagegen`を操作できる点を先頭で示す。
- npm authorは`Quo / クオ at kitepon.dev`、author URLは
  `https://x.com/QLyun35332`。npm registryの公開JSONで一致を確認した。
- npm keywordsへ`codex-cli`、`terminal-mcp`、`persistent-terminal`、
  `interactive-cli`を追加した。
- npm READMEは差別化lead、npm版・週間download badge、`npx -y aiterm-mcp`、
  Claude Code / Claude Desktop / Cursor設定、QuoのX帰属を含む。
- npm tarballは実行に必要な`dist/*.js`へ限定し、Smithery向けMCPBと展開済み依存を除外する。
  公開値は14 files、unpacked 382,455 bytes。

## v0.20.1からの訂正

v0.20.1はauthor nameを`Quo / クオ (kitepon.dev)`として公開したが、npmのlegacy author parserが
丸括弧をURL記法として再解釈し、明示したX URLを`kitepon.dev`へ置換した。v0.20.2では
括弧を使わない`Quo / クオ at kitepon.dev`へ変更し、作者名・ブランド・X URLを同時に保持した。
0.20.1のruntime、README、description、keywords、tarball内容に不具合はない。

## 公開receipt

- v0.20.1 local full regression: 311 passed / 0 failed / 0 skipped。
- v0.20.2 focused release/server smoke: 4 passed / 0 failed。
- MCPB: build、manifest schema、icon、archive validation success。version 0.20.2。
- npm pack dry-run: `aiterm-mcp@0.20.2`、14 files、package 114,013 bytes、
  unpacked 382,455 bytes。
- tag CI: run `30203465207` success。Ubuntu Node 18/20/22、macOS Node 18/20/22、
  Windows純粋層 Node 20/22、publish jobがすべてgreen。
- npm: latest `0.20.2`、SLSA provenance v1。
  integrity `sha512-IOlBjlrII8tbUWy0axSXjLw5T/HKUrPcIR90UVKga8qy1dQIK0u/Qn/Ygy3guVsnMUWN9pNhmacUAJ1abLCX+w==`、
  shasum `6f8ab3b0cced25a83747a32cb0055901090a86f7`。
- GitHub Release: `v0.20.2 — preserve Quo’s X attribution on npm`。
  draft／prereleaseではなく、対象commitは`3715c7a5f40c618f819adea812b73c13aa976fee`。
- Official MCP Registry: workflow `30203465282` success。
  `io.github.kitepon-rgb/aiterm-mcp` 0.20.2はactiveかつlatest。
- registry由来隔離install: version 0.20.2、3 bins、13 tools。
  initialize → tools/listが成功し、stderrは0 bytes。

## Rollback

npm公開済みversion、tag、GitHub Releaseの履歴は改変しない。公開面またはruntimeに不具合が
判明した場合は新しいpatch versionで訂正し、npm、GitHub Release、Official MCP Registry、
registry由来の隔離installを同じ順序で再受入する。

# managed Claude user MCP継承・0.21.4公開計画

> **Status: Superseded / historical.** 本計画はv0.21.4の受入記録として保持する。v0.22.0では
> user MCPだけをsnapshotする方式、`--setting-sources ""`、通常hook／plugin／permissionの隔離を廃止し、
> Claudeを含む4 launcherが通常project／user環境を直接使う。現行Decisionは
> [ADR 0025](../adr/0025-shared-agent-environment-and-lineage.md)、公開受入は
> [ADR 0026](../adr/0026-release-0.22.0-acceptance.md)。

## 目的

Aitermのfresh managed Claude sessionが、通常Claude Codeへuser scopeで登録済みのMCP serverを
発見できない欠陥を修理する。hook隔離は維持し、`~/.claude.json`のtop-level `mcpServers`だけを
launch単位のowner-only configへsnapshotしてClaude CLIの`--mcp-config`へ明示する。

## 事実と裁定

- 2026-08-04のfresh Claude smokeではAIShell toolが0件だった。同じ端末の通常Claudeは
  `aishell-mcp`をuser scopeでConnectedと報告する。
- managed起動は`--setting-sources ""`とStop hook専用`--settings`を使い、user／project／local
  settings hookを隔離している。この境界は維持する。
- Claude Code 2.1.221は`--mcp-config <configs...>`を公開し、user scope MCPの正本は
  `~/.claude.json`の`mcpServers`である。
- F: config抽出境界、owner-only保存、metadata path検証、cleanup、公開commit／version。
- A: なし。単一repo・同一責務を親が直列実装する。
- H: npm／GitHub／MCP Registry公開とglobal install。オーナーの本依頼で明示承認済み。

## 非目標

- 通常settingsのhook、plugin、skill、permission設定をmanaged sessionへ戻さない。
- project／local scopeのMCPや`.mcp.json`を暗黙承認しない。
- credentialを別形式へ移送、表示、ログ出力しない。
- MCP起動失敗をshellや別providerへfallbackしない。

## 受入条件

- [x] `mcpServers`だけを0600のlaunch専用JSONへsnapshotし、managed settingsとは分離する。
- [x] config欠落はMCP 0件で正常、破損／型不正はsession作成前にfail loudする。
- [x] metadata読取はmanaged MCP pathをsecure state rootへ再束縛し、close／killAllで削除する。
- [x] focused testでsnapshot内容、argv、mode、欠落、破損、cleanupを固定する。
- [x] 関連test 130/130とfull regression 324/324を各一度greenにする。
- [x] ADR、README、CLAUDE、CHANGELOG、release metadataを0.21.4へ同期する。
- [ ] mainへcommit／push後、tag CI、npm、GitHub Release、Registry、global installを確認する。
- [ ] registry版から起動したfresh managed ClaudeがAIShellを直接発見し、`runtime_status`と
  cursor／ranking省略`search_context`を成功させる。

## Rollback

公開前は本変更の独立commitをrevertする。公開後は0.21.3をglobal installして旧launcherへ戻せるが、
user MCPを失う旧挙動へ戻るため、通常の解決は修正版を前進公開する。

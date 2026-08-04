# 0024. managed Claudeはuser scope MCPだけを明示継承する

## Status

Superseded by [ADR 0025](0025-shared-agent-environment-and-lineage.md) — 2026-08-04。
本文はv0.21.4の歴史的Decisionとして保持する。現行Claude launcherはuser MCPだけをsnapshotせず、通常
`HOME`と`user,project,local` settings、MCP、plugin、skill、permission、trustを直接使い、完了相関用
Stop hook settingsだけを加算する。

## Context

ADR 0003は`--setting-sources ""`とlaunch専用`--settings`により、通常の
user／project／local settings hookをmanaged Claudeから隔離した。しかしClaude Codeでは
user scope MCPの正本が`settings.json`ではなく`~/.claude.json`のtop-level `mcpServers`にある。
2026-08-04のfresh session smokeで、隔離起動したClaudeが通常環境でConnectedなAIShellを
一つも発見できないことを確認した。

## Decision

- managed Claude起動時に、`~/.claude.json`のtop-level `mcpServers`だけをlaunch単位でsnapshotする。
- snapshotはAiterm secure state rootへ0600のJSONとして保存し、Claude CLIの公開
  `--mcp-config <path>`へ渡す。定義やcredentialをargv、metadata、logへ展開しない。
- user config欠落、`mcpServers`欠落、空objectはMCP 0件として正常起動する。JSON破損または
  `mcpServers`の型不正はsession作成前にfail loudし、残骸を残さない。
- 通常settingsのhook／plugin／skill／permissionと、project／local scopeのMCPは継承しない。
  `.mcp.json`を暗黙承認することもしない。
- metadataはsnapshot pathを現在のsecure state rootへ再束縛し、close／killAllで削除する。
  exact launch replayは同じlaunch snapshotを使い、途中でuser configを再読しない。

## Consequences

- managed Claudeは、利用者がuser scopeで既に承認したAIShell等のMCPを通常Claudeと同じ名前で使える。
- hook隔離とMCP可用性を別の境界として扱うため、通常hookの混入防止は維持される。
- user MCP登録を変更した後は、新しいmanaged Claude sessionでsnapshotを作り直す必要がある。
- rollbackは本Decisionのcommitをrevertする。公開後に0.21.3へ戻すこともできるが、managed Claudeが
  user MCPを失う既知欠陥も戻る。

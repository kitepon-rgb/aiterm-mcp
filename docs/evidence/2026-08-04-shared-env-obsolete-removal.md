# Obsolete isolation removal evidence

- cleanup commit: `a9e8d27`
- 新規起動とmetadata loadから`managed_claude_settings`、`managed_codex_home`、`managed_grok_home`を削除。
- managed Codex home、config/agent snapshot、Claude MCP snapshot、fake HOME、managed Grok homeの生成関数を削除。
- launcher command/envから`CODEX_HOME`、`HOME`、`GROK_HOME`の置換とcompat無効化envを削除。
- `aiterm-wait` fixtureを共有Claude相関へ移行し、既知vendor session以外のeventを非該当として扱う契約へ更新。
- cleanup時の旧suffix削除だけは、過去版が残したaiterm所有残骸を回収する移行衛生として維持。旧routeの起動・load・fallbackには使わない。

検証:

- `npm run build`: pass
- `node --test test/core-agent.test.mjs`: 103/103 pass
- `node --test test/aiterm-wait.test.mjs`: 26/26 pass
- `rg`でproduction sourceの旧hook route、旧metadata field、旧home path helper、旧生成関数が0件。
- `git diff --check`: pass

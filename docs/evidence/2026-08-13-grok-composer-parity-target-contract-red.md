# Grok／Composer parity target contract — red

## Focused results before product-code change

1. `node --test --test-name-pattern='target contract: (Grok/Composer|catalog)' test/core-agent.test.mjs`
   - exit 1
   - stdout SHA-256: `f4d6c04a030891f7c2285d1a06258d75fe376feb8f0f15c646d229b24b70da49`
   - 最初の失敗: 現行製品がGrokの`reasoning_effort`を古いheadless専用前提で拒否した。
2. `node --test test/smoke.test.mjs`
   - exit 1
   - stdout SHA-256: `cf51186493eec92c6e31d61a72d785d136cfdbd104995a189af8aeea8da1f5a3`
   - 失敗: `agent_configure` provider enumが`claude, codex`だけで、`grok, composer`がない。

## Fixed target

- Grok／Composerの対話TUI起動へ`--reasoning-effort`を渡す。
- explicit modelとComposer既定modelを起動前にlive catalogへ照合し、不在modelを明示拒否する。
- Grok／Composerの`write_scope=read-only`を`--sandbox read-only`へ落とす。
- `agent_configure`がGrok／Composerへ`/model <name> [effort]`と`/effort <level>`を送る。
- 公開output schemaのprovider enumを4 vendorへ広げる。

このredは既存失敗ではなく、変更前342/342 greenの上へ追加したtarget contractだけが失敗した結果である。

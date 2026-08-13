# Grok／Composer parity discovery

## Source

- Local Grok Build: `grok 1.0.3 (1a29d5bc12d4) [stable]`
- Official source: `xai-org/grok-build` commit `e5fd4816d43260c15ba785f103990c1ed6cea230`
- CLI reference: <https://docs.x.ai/build/cli/reference>
- Product changelog: <https://x.ai/build/changelog>
- Composer 2.5 announcement: <https://x.ai/news/composer-2-5>

公式sourceの`xai-grok-pager/src/app/cli.rs`はTUI起動引数として`--reasoning-effort`とalias `--effort`を受理する。
`slash/commands/model.rs`は`/model <name> [effort]`、`slash/commands/effort.rs`は`/effort <level>`を実装する。
`models.rs`は`grok models`の`Default model:`と`Available models:`の固定出力を所有する。

## Local reproduction

- `grok --model grok-4.6 --reasoning-effort high --sandbox read-only --no-alt-screen`は
  header `sandbox:read-only`、footer `Grok 4.6 (high)`で起動した。
- 同一sessionで`/model Grok 4.5 medium`は`Switched to Grok 4.5 (medium effort)`、
  `/effort high`は`Switched to Grok 4.5 (high effort)`となった。
- `summary.json`に`current_model_id`、`reasoning_effort`、`sandbox_profile`が保存された。
- `grok models`の現行catalogは`grok-4.6`と`grok-4.5`だけで、defaultは`grok-4.5`。
- `grok-composer-2.5-fast`を起動引数へ指定してもCLIはexitせずGrok 4.6で起動した。
  同一sessionの`/model grok-composer-2.5-fast`は`Unknown model`を返した。

## Root cause

aitermのGrok／Composer分岐は過去のCLI前提からeffortを起動前拒否し、sandboxを渡さず、
`agent_configure`をClaude／Codexだけへ制限している。またexplicit modelをvendor catalogと照合しないため、
vendorのsilent fallbackをComposer成功として公開する。

根治点は`openAgent`の外部catalog preflight、`buildAgentCmd`のeffort／sandbox、`configureAgent`の
Grok標準slash command、`src/index.ts`の公開schema／説明である。completion、transcript、環境、Throughline、
lineageはすでに共通実装であり、作り直さない。

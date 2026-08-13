# Grok／Composer agent parity — implementation evidence

## 実装結果

4 vendorに共通する次のagent制御をGrok／Composerへ揃えた。

| 能力 | Grok／Composer実装 | fail-loud境界 |
| --- | --- | --- |
| 起動model | `--model` | explicit modelとComposer既定を`grok models`へ事前照合 |
| 起動effort | `--reasoning-effort` | 値集合はvendor／modelへ委ね、起動前の古い固定enum拒否を撤去 |
| read-only | `--sandbox read-only` | path説明だけは同等allowlist引数不在のためdeclaration-only |
| 同一session model変更 | `/model <model> [effort]` | modelをlive catalogへ事前照合し、vendor成功／エラー行を画面差分で確認 |
| 同一session effort変更 | `/effort <effort>` | vendor成功／エラー行を画面差分で確認 |

Composer既定`grok-composer-2.5-fast`は、2026-08-13時点のlive catalogに存在しない。
この場合はGrok 4.6等へ黙ってfallbackせず、PTY作成前に利用不可を明示する。

## 一次根拠

- Grok Build `1.0.3 (1a29d5bc12d4) [stable]`
- 公式source: `xai-org/grok-build` commit `e5fd4816d43260c15ba785f103990c1ed6cea230`
- RAGへcommit固定で保存:
  - `grok-build-cli-agent-parity-e5fd481`
  - `grok-build-model-catalog-e5fd481`
  - `grok-build-model-command-e5fd481`
  - `grok-build-effort-command-e5fd481`

## Focused verification

1. `npm run build`
   - exit 0
   - stdout SHA-256: `223a4f7e415ca020e9d53076444d8a8c8c204696624707ba6debfa578ac86caf`
2. `node --test --test-name-pattern='target contract: (Grok/Composer|catalog|Composer既定|Grok model catalog)' test/core-agent.test.mjs`
   - exit 0
   - stdout SHA-256: `825f11388ea569cd6f8edb091ba92ecbafd2a310b9d9c8db1d0f2baa2f9117af`
3. `node --test test/smoke.test.mjs`
   - 3/3 pass
   - stdout SHA-256: `a954fc7d618d7b666b1aa01ba7bae49e98fd9ab8f5726aea42d58ebeb5873618`
4. `node --test test/core-agent.test.mjs`
   - 117/117 pass
   - stdout SHA-256: `1813910d2927219ecc250c768aa22297f3042e5506631b61893379544fe7a689`

## Live verification

実Grok Buildをpromptなしで`grok-4.6`／`high`／`read-only`起動し、同じsessionのまま
`grok-4.5 medium`へ変更後、effortだけ`high`へ変更した。画面で`Grok 4.5 (high)`と
`sandbox:read-only`を確認し、sessionを閉じた。

```json
{"schema":"aiterm.grok-composer-parity-live-smoke.v1","grok":{"launch":"passed","model_change":"passed","effort_change":"passed","read_only":"passed"},"composer_default":"rejected_before_session_model_unavailable"}
```

Composer既定のlive smokeは、同じ実環境の`grok models`に既定modelが無いため、session残骸ゼロで
起動前拒否された。vendor側に存在しないComposer席を別Grok modelで成功扱いしていない。

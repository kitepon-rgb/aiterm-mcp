# 10 — GPT-5.6 / Grok 4.5 世代へのモデル整合プラン（dotagents 再配線からの改修依頼）

<!-- 前提: Codex 0.144+（GPT-5.6 Sol/Terra/Luna）・grok CLI 0.2.87（grok-4.5 / grok-composer-2.5-fast）時点。
     依頼元: dotagents/docs/plan_gpt56-rewiring.md（2026-07-11）。モデル×エフォートの正典は dotagents/docs/02_models.md -->

dotagents 側の GPT-5.6 世代再配線（オーケストレーション決定表の整備）で、aiterm の対話エージェント起動ツールに実態とズレた箇所が4件見つかった。いずれも installed 版 `aiterm-mcp/dist/core.js`（2026-07-11 時点の npm グローバル）を実読して確認したもの。行番号は dist 上の観測値なので、着手時に src/ 側で再特定すること。

## 依頼（チェックボックス＝消化管理）

- [ ] **1. `codex_agent` に `model` 引数を追加**
  現状はツールごとにモデルがハードコードされ（`buildAgentCmd`、dist/core.js L1871-1893 付近）、`codex_agent` の起動モデルを呼び出し側から指定する手段がない。dotagents の決定表は「入口ごとにモデル×エフォートを明示」を規範にしたため、引数で上書きできるようにしたい（省略時は現状どおりで可）。

- [ ] **2. codex の managed home が端末 `~/.codex/config.toml` を丸ごとコピーする挙動の明示化／上書き手段**
  `createManagedCodexHome`（dist/core.js L1067-1085 付近、`copyFileSync` L1084）が config を丸ごと継承するため、端末側の model/effort ピン（例: Sol×ultra。ultra は自動マルチエージェント委譲 ON）が対話子にそのまま波及する。少なくとも引数で model/effort を渡した時は managed home 側 config を上書きしてほしい。参考: codex-sidecar は model/model_provider/model_reasoning_effort の3キーだけを最小継承する方式（caveat 登録済み: `codex-sidecar-home-config-toml-…`）。

- [ ] **3. `grok_agent` のハードコード `--model grok-build` を現行モデルへ**
  `grok-build` はライブカタログ（`~/.grok/models_cache.json`）に存在しない stale 名（現行は `grok-4.5` / `grok-composer-2.5-fast` の2つ）。`--model grok-build` が現行サーバでどう解決されるかは未確定（alias か、default へのフォールバックか、エラーか）。`grok-4.5` への更新＋できれば引数化を依頼。

- [ ] **4. `reasoning_effort` enum と実態の整合**
  現状の enum は `{low, medium, high, xhigh, max}`（dist/core.js L1933/1939-1940 付近）だが実態は:
  - grok-4.5 = low/medium/high の3段のみ（xhigh/max 不在）
  - composer-2.5-fast = effort 非対応
  - codex (GPT-5.6) = low/medium/high/xhigh/max/**ultra**（ただし ultra=max 推論＋proactive 自動委譲 ON なので、既定で渡せない方が安全）
  さらに **grok の `--effort` は headless（`-p`）専用で、対話 TUI では警告の上無視される**（`~/.grok/README.md` 明記・caveat 登録済み: `grok-cli-effort-headless-…`）＝現状 grok/composer への effort 指定は実質 no-op。ツール別 enum に分離するか、grok 系では受けた値の扱い（無視される旨の返却など）を明示してほしい。

## 検証の目安

- `codex_agent` に model 引数を渡して起動 → セッション内 `/status` が指定モデルを示す（端末 config のピンと無関係に）
- `grok_agent` 起動 → `/status`（相当）が現行カタログ上のモデルを示す
- grok/composer に effort を渡した場合の挙動がツール応答から判別できる（黙って no-op にしない）

## 出典

- 実測・調査の詳細: dotagents `rag/models/xai-grok45-composer25.md`・`rag/models/gpt-5.6-family.md`（出典・取得日・確度付き）
- 関連 caveat（own DB）: `codex-cli-reasoning-effort-ultra-max-proactive-on` / `grok-cli-effort-headless-p-tui-effort-…` / `codex-sidecar-home-config-toml-…`

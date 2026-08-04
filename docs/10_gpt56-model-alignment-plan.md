# 10 — GPT-5.6 / Grok 4.5 世代へのモデル整合プラン（dotagents 再配線からの改修依頼）

> **Status: Historical / completed.** 本文のmanaged `CODEX_HOME`、config snapshot、通常設定からの
> 選択継承はv0.11.0時点の実装史であり、v0.22.0の環境境界ではない。現行4 launcherは通常homeと
> project／user設定を直接使い、model／effortの明示引数だけをCLIへ加算する。正本は
> [ADR 0025](adr/0025-shared-agent-environment-and-lineage.md)。

<!-- 前提: Codex 0.144+（GPT-5.6 Sol/Terra/Luna）・grok CLI 0.2.87（grok-4.5 / grok-composer-2.5-fast）時点。
     依頼元: dotagents/docs/plan_gpt56-rewiring.md（2026-07-11）。モデル×エフォートの正典は dotagents/docs/02_models.md -->

dotagents 側の GPT-5.6 世代再配線（オーケストレーション決定表の整備）で、aiterm の対話エージェント起動ツールに実態とズレた箇所が4件見つかった。いずれも installed 版 `aiterm-mcp/dist/core.js`（2026-07-11 時点の npm グローバル）を実読して確認したもの。行番号は dist 上の観測値なので、着手時に src/ 側で再特定すること。

## 依頼（チェックボックス＝消化管理）

- [x] **1. `codex_agent` に `model` 引数を追加**
  現状はツールごとにモデルがハードコードされ（`buildAgentCmd`、dist/core.js L1871-1893 付近）、`codex_agent` の起動モデルを呼び出し側から指定する手段がない。dotagents の決定表は「入口ごとにモデル×エフォートを明示」を規範にしたため、引数で上書きできるようにしたい（省略時は現状どおりで可）。

- [x] **2. codex の managed home が端末 `~/.codex/config.toml` を丸ごとコピーする挙動の明示化／上書き手段**
  `createManagedCodexHome`（dist/core.js L1067-1085 付近、`copyFileSync` L1084）が config を丸ごと継承するため、端末側の model/effort ピン（例: Sol×ultra。ultra は自動マルチエージェント委譲 ON）が対話子にそのまま波及する。少なくとも引数で model/effort を渡した時は managed home 側 config を上書きしてほしい。参考: codex-sidecar は model/model_provider/model_reasoning_effort の3キーだけを最小継承する方式（caveat 登録済み: `codex-sidecar-home-config-toml-…`）。

- [x] **3. `grok_agent` のハードコード `--model grok-build` を現行モデルへ**
  `grok-build` はライブカタログ（`~/.grok/models_cache.json`）に存在しない stale 名（現行は `grok-4.5` / `grok-composer-2.5-fast` の2つ）。`--model grok-build` が現行サーバでどう解決されるかは未確定（alias か、default へのフォールバックか、エラーか）。`grok-4.5` への更新＋できれば引数化を依頼。

- [x] **4. `reasoning_effort` enum と実態の整合**
  現状の enum は `{low, medium, high, xhigh, max}`（dist/core.js L1933/1939-1940 付近）だが実態は:
  - grok-4.5 = low/medium/high の3段のみ（xhigh/max 不在）
  - composer-2.5-fast = effort 非対応
  - codex (GPT-5.6) = low/medium/high/xhigh/max/**ultra**（ただし ultra=max 推論＋proactive 自動委譲 ON なので、既定で渡せない方が安全）
  さらに **grok の `--effort` は headless（`-p`）専用で、対話 TUI では警告の上無視される**（`~/.grok/README.md` 明記・caveat 登録済み: `grok-cli-effort-headless-…`）＝現状 grok/composer への effort 指定は実質 no-op。ツール別 enum に分離するか、grok 系では受けた値の扱い（無視される旨の返却など）を明示してほしい。

## 実装決定（2026-07-11・着手時）

前提の再検証: 端末実測で `~/.grok/models_cache.json` に `grok-build` 不在（`grok-4.5`=high/medium/low・`grok-composer-2.5-fast`=`supports_reasoning_effort:false`）、`~/.codex/config.toml` に `model="gpt-5.6-sol"` ピン実在、codex CLI `-m/--model` あり、を確認。src/ 側の該当は `createManagedCodexHome`（src/core.ts）・`buildAgentCmd`（src/core.ts）・agent ツール schema（src/index.ts）で dist 観測と一致。

- **依頼1**: 3ツール共通で `model` 引数を追加（codex は `-m`、grok/composer は `--model` 上書き。省略時は現状どおり）。モデル名はカタログ検証しない（世代交代で腐るピンを作らない）。空文字/空白のみは起動前エラー。
- **依頼2**: `-m`/`-c model_reasoning_effort=` の CLI 引数明示（config より優先）に加え、引数で渡された時は managed home 側 config.toml の top-level `model`/`model_reasoning_effort` 行を上書き（TOML の top-level キーはテーブルヘッダより前のみ＝先頭領域だけ書換え）。さらに「明示化」として、codex 起動応答に実効 model/effort とその出所（引数／端末config継承／CLI既定）を常に報告し、実効 effort=ultra の時は proactive 自動委譲 ON の警告を付す。
- **依頼3**: 既定を `grok-4.5` へ更新＋`model` 引数化（composer 既定は `grok-composer-2.5-fast` のまま）。
- **依頼4**: grok/composer への `reasoning_effort` 指定は**起動前に明示エラーで拒否**（黙って no-op の `--effort` を TUI に渡す現状を廃止。grok は headless `grok -p --effort` への誘導文つき・composer は effort 非対応の旨）。codex は従来どおり値集合を縛らず（CLI 版差）、schema 説明に ultra=max 推論＋proactive 自動委譲 ON の警告を明記。ultra は「引数で明示した時だけ渡る」＝既定で渡らない設計は現状維持。
- 着手ゲート: F=src（公開 MCP スキーマ＋managed config 書換え）は統括直轄／A=テスト・README 更新 →（Codex 中位 `gpt-5.6-terra`, medium, `codex exec`）。

## 検証の目安

- `codex_agent` に model 引数を渡して起動 → セッション内 `/status` が指定モデルを示す（端末 config のピンと無関係に）
- `grok_agent` 起動 → `/status`（相当）が現行カタログ上のモデルを示す
- grok/composer に effort を渡した場合の挙動がツール応答から判別できる（黙って no-op にしない）

## 検証結果（2026-07-11・全4件消化）

- 実起動: `codex_agent(model="gpt-5.6-terra")` → TUI に terra 表示（端末ピン sol を無視）、起動応答は `model=gpt-5.6-terra（引数） effort=low（端末config継承）`。grok 起動 → footer `Grok 4.5 (high)`。composer 起動 → Composer 表示。いずれも新 dist 直叩きで確認。
- grok/composer への effort 指定 → session 作成前に明示エラー（headless 専用／effort 非対応の説明文つき）＝ツール応答で判別可能。
- managed config 上書き: fake home 実物で `model` 行のみ置換・未指定 effort ピン（ultra）は継承＋警告表示・`[table]` 以降原文保持を確認。
- 回帰テスト **183 件全 green**（+6。model 引数組み立て・effort 拒否・managed config 置換・空 model 残骸ゼロ・MCP schema）。テスト・README 更新は Codex 中位（terra×medium, codex exec）へ委譲し、統括が diff レビュー＋再実行で採用。

## 出典

- 実測・調査の詳細: dotagents `rag/models/xai-grok45-composer25.md`・`rag/models/gpt-5.6-family.md`（出典・取得日・確度付き）
- 関連 caveat（own DB）: `codex-cli-reasoning-effort-ultra-max-proactive-on` / `grok-cli-effort-headless-p-tui-effort-…` / `codex-sidecar-home-config-toml-…`

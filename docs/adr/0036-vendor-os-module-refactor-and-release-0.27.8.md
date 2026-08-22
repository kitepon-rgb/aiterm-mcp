# ADR 0036: vendor/OS固有コードのモジュール分離と release 0.27.8 受入

- Status: Accepted（2026-08-23・不変Decision）
- Campaign正本: [docs/32](../32-vendor-os-adapter-refactor-plan.md)

## Decision

1. vendor固有コードは `src/vendors/{claude,codex,grok}.ts`、vendor中立の共有プリミティブは
   `src/agent-shared.ts`、tmux/psmux の OS 差は `src/tmux-runtime.ts` が所有する。依存方向は
   core → vendors → agent-shared → (tmux-runtime, errors) の一方向とし、core 所有のサービス
   （transcript行読取・rate limit検知・transcript不在エラー）は引数注入で渡す。
   形式的 adapter interface / registry は3 vendorに対して過剰として採らない（最小実装）。
   composer は grok adapter のモデル既定違いサブタイプとして扱う（棚卸し実測: 95%超同一）。
2. `configureAgent`／`dispatchAgentTurn`／`openAgent` の進行役フロー・Claude operation marker
   家族・event file 解析は core の PTY サービスと本質結合するため core に残し、vendor 分岐は
   移設済み vendor 関数を呼ぶ薄い dispatch に限る。
3. 公開受入: **v0.27.8** を正式公開版とする。npm latest=0.27.8
   （integrity は registry 記録を正）、GitHub Release、Registry workflow success、
   registry 由来 global install で dist 全 .js のローカルバイト一致・14 tools・
   initialize version 0.27.8・stderr 0 bytes・3 bins を確認済み。
   検証: 各wave focused green・local full 347件（pass 346/fail 0/skip 1）・
   self-hosted 4環境 full CI green。
4. **v0.27.7 は公開面欠陥版**（tag は移動・再利用しない）: package.json `files` の
   `dist/*.js` glob が新設 `dist/vendors/` を同梱せず、公開版が `ERR_MODULE_NOT_FOUND` で
   起動不能だった。repo 内 dist で `npm test` を回す 4環境CI では構造的に検出できず、
   **公開後 smoke（registry由来installの実ロード）が検出した**。再発防止として
   `npm pack --dry-run` により build 済み runtime dist（直下＋vendors/）の全 .js の
   tarball 同梱を release-metadata test で固定した（Windows は npm.cmd のため shell 経由）。

## 経緯の要点

- ベースライン 346件 green（HEAD 2d357c3）→ P1 OS層集約 → P2 vendor分離 →
  P3 ホットスポット解体（scope は純粋 vendor ロジックに精緻化）→ P4 4環境CI →
  P5 公開。各wave は独立 revert 可能な commit・逐語移設・エラー文言/タイミング定数不変。
- core.ts 4,912→3,647行。vendor分岐 約90→39箇所（残りは薄い dispatch と進行役）。
- CI で Windows runner FOX の `getaddrinfo() thread failed to start`（checkout 失敗・
  インフラ要因）に2回当たり、冷却後 rerun で回復（罠DB記録済み）。

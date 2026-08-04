# 0027. v0.23.0 Throughline portable forkの公開受入

## Status

Accepted — 2026-08-04

## Release identity

- release commit / tag target: `7d92048e09b9afca6532c71769c3a3b36d527024`
- tag / GitHub Release: `v0.23.0 — Throughline portable fork across AI vendors`
- package: `aiterm-mcp@0.23.0`
- implementation plan: [Throughline portable fork](../26-throughline-portable-fork-plan.md)

## Acceptance evidence

### Local gates

- final full regression: 335/335 pass、fail 0。
- focused portable fork: 6/6 pass。Codex型TUI後送、Grok型argv、contextの無加工合成、
  Throughline missing／nonzero／invalid schema／empty context、clean launch不変、mission／replay排他を固定。
- MCPB: manifest validate pass、0.23.0 archive pack pass。asset SHA-256
  `f62dee5b106ec44f5f6e774854171e0803ee76bcba6eeb7083fbdfdd30fdbd6b`、3,480,092 bytes。

### Main ancestry and CI

- `npm run verify:release-commit`: release commitが`origin/main`へ着地済みと確認。
- main CI `30919026450`: Linux／macOS／Windows、Node 18／20／22の全job success。
- tag CI `30919295270`: 全必須jobとnpm provenance publishがsuccess。
- GitHub Releaseはvalidated MCPBを添付して公開。

### Public package and Registry

- npm: version `0.23.0`、integrity
  `sha512-6+Hswa3in3G3zLH4rFOwbiAcbry4ja3JRviq3V91MV8vbu0vtLMUXZXT/lvayFAToL3T/p1iuA4RdwjBGOnjAA==`、
  shasum `e84d02c94463a745a971111639c798e27efa6d78`。
- Official MCP Registry workflow `30919622861`: success。公開APIで
  `io.github.kitepon-rgb/aiterm-mcp` 0.23.0は`active`かつ`isLatest:true`。
- この端末のglobal installをregistry版0.23.0へ更新。Throughlineはglobal 0.9.0。

### Representative cross-vendor live smoke

- source: Throughline session `codex:019fcd13-e1d6-7213-bf43-52f7f6a22d36`。
- target: global installed `aiterm-mcp@0.23.0`の`claude_agent`。
- clean launchを1回起動・close後、portable forkを1回実行。`aiterm-wait`は`done`。
- Claudeはsource memory由来の`creates: true`と、新ミッション由来の`MISSION_OK`を同じ回答で返した。
- 前後でsourceの`session` rowと、`session_id`列を持つ全tableのsource所有件数が完全一致。
  `merged_into`も不変で、DB所属の移動・copyは起きていない。
- smoke用sessionはすべてcloseし、`pf_*`のmetadata／log残骸は0。

## Failure records retained

- 最初のsmoke harnessは前後比較用SQLite queryで文字列引用を誤り、portable launch前に停止。
  clean sessionはclose済み。製品失敗ではない。
- 次のharnessはMCP SDKのstdio既定envが`TMPDIR`／`XDG_RUNTIME_DIR`を子へ渡さず、serverと
  `aiterm-wait`が別state rootを見たため回収失敗。sessionはcloseし、transportへ親envを明示して
  同一state rootへ揃えた正規入口で再実行した。portable fork本体のfallbackは追加していない。

## Decision

v0.23.0を公開受入する。portable forkはThroughlineの読み取り専用handoff contextを4 launcherの
既存初回prompt経路へ加えるだけであり、元DBのsession所属を変更しない。field省略時はclean launch、
指定時の外部Throughline失敗はPTY作成前の明示エラーとする。

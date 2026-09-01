# ADR 0047: Throughline補足コンテキストの透過搬送

## Status

Accepted — 2026-09-01

## Context

BellTeamはBot固有の長期記憶とRAGを、日々の会話記憶と一緒に次のharness sessionへ渡す必要がある。
内容の選択・Bot projectとの照合・context予算は記憶製品Throughlineの責務であり、PTY transportの
Aitermへ複製するとharness差と記憶規則が二重管理になる。

## Decision

1. `agent_launch`と旧launcher aliasへ任意の`throughline_supplement_file`を追加する。
2. 指定時は`throughline_source_session`を必須とし、Aitermは
   `throughline handoff-context ... --supplement-file <path>`へpathをそのまま渡す。
   この任意fieldはThroughline 0.10.8以降を必要とする。
3. Aitermはファイルを開かず、schema、内容、project束縛、文字数を解釈しない。
4. Throughline失敗時は既存portable fork契約どおりPTY作成前に明示失敗し、clean launchへfallbackしない。
5. harness別adapterとsession ownershipは変えず、4 harnessが同じ共通経路を使う。

## Acceptance

- fake Throughlineが受けたargvで補足pathの完全一致を確認する。
- 補足なしのportable forkとclean launchが変わらない。
- MCP schemaが標準入口と旧4 aliasへ同じ任意fieldを公開する。
- 3環境full CI、npm、MCPB、Official Registryの公開後smokeを通す。

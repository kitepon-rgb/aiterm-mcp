# ADR 0028: portable fork公開後ドキュメント同期の受入

## Decision

AIterm v0.23.0／Throughline v0.9.0のportable fork実装後に、両repositoryの現行ドキュメント面を
全域監査し、read-only handoff context契約へ同期した成果を受け入れる。

## 受入matrix

| 面 | 受入結果 |
|---|---|
| AIterm利用者向けREADME／CLAUDE／設計／公開記録 | 既に`throughline_source_session`、4 launcher共通経路、no fallback、DB所有権不変と一致していたため維持 |
| AIterm作業者／contributor／security | `AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md`をv0.23.0契約へ同期 |
| Throughline利用者／作業者／配布skill | 日英README、`AGENTS.md`、`CLAUDE.md`、配布Codex skillを`handoff-context`契約へ同期 |
| Throughline設計索引 | Observer completed-turn projectionとportable context exportを別境界として明示 |
| 履歴文書 | ADR、archive、evidence、RAG sourceは当時の不変証拠として改稿しない |

## 検証

- 変更Markdownの相対リンク監査: AIterm 6文書、Throughline 8文書、欠落0。
- 旧現行表記監査: AIterm Securityの`0.3.x`、Throughline READMEの`v0.6.3`、Observerの旧active表記を解消。
- AIterm focused test: `core-agent`／MCP smoke 113/113 pass。
- Throughline focused test: CLI help／handoff-context 5/5 pass。
- `git diff --check`: 両repository成功。

## Knowledge return

通常handoffはbatonとsession継承を所有する。一方、`handoff-context`は既存DBをread-onlyで開き、
SessionStartと同じbudgeted contextだけを返し、memory rowの`session_id`も`sessions.merged_into`も
変更しない。Observer APIはcompleted-turn projectionであり代替ではない。AItermはSQLiteを直接読まず、
このversioned CLI境界だけを4 launcher共通入口で呼ぶ。

## 非目標

runtime、package version、公開artifactの変更、追加release、履歴ADR／archive／RAGの現行文言化は行わない。

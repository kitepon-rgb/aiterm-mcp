# ADR 0029: Grok／Composer agent parityの範囲と実行レーン

- Status: Accepted
- Date: 2026-08-13

## Context

aitermのClaude／Codex launcherは、起動model／effort、同一sessionの設定変更、read-only制約、完了回収、
通常環境、Throughline、lineageを共通面として持つ。Grok／Composer launcherは同じ完了・環境経路を使う一方、
現行Grok Buildが提供するeffort、sandbox、session内変更を公開せず、利用不能なComposer modelをGrokへ
silent fallbackしたまま成功と報告する。

変更は公開MCP schema、vendor境界、実機受入、version、npm／GitHub／Official MCP Registry、global installへ連鎖する。
したがって受入が多段に連鎖し、最終裁定と公開証拠を検証可能に保持する必要がある。

## Decision

1. `docs/29-grok-composer-agent-parity-plan.md`の共通同等機能をGrok／Composerへ実装する。
2. 同等機能はClaudeとCodexの共通部分で決め、Claude固有構造化操作は含めない。
3. Composer modelがvendor catalogにない場合は起動前に明示失敗し、別modelへfallbackしない。
4. 本campaignは`chained_acceptance=true`かつ`decision_evidence_required=true`の統括レーンで進める。
   計画された中断と複数repo書込調整はない。
5. 実装・検証・公開は単一writerがLattice planの依存順に進め、各gateを親が実測で裁定する。

## Consequences

- 4 launcherの共通面を同じcaller契約で扱える。
- vendor側でComposerが提供されない環境では、Composer launcherは利用不能を正直に返す。
- 公開までを一つの受入連鎖として追跡し、repo内実装だけで完了扱いにしない。

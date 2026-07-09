---
title: "codex_agent prompt UX adversarial review"
source_url: "local:aiterm-mcp-codex-agent-prompt-ux-adversarial-review-2026-07-09"
source_type: local_probe
fetched: 2026-07-09
topic: completion-detection
tags: ["codex", "grok", "composer", "aiterm", "agent_done", "prompt", "tui", "oracle", "subagent", "adversarial-review", "implementation-smoke"]
summary: "codex_agent(prompt=...) の長文/日本語 prompt と初回 agent_done 待ち計画を、aiterm Codex とサブエージェントで敵対的検証し、実装後に Codex の単一行/長い日本語/複数行日本語 initial prompt wait smoke を通した。Grok/Composer は OAuth approval 画面で initial_prompt=not_sent になり、prompt 未送信の安全側挙動を確認したため、初回 prompt wait は公開 schema に出さない。"
relevance: "初回 prompt を shell argv から降ろす実装の採用ゲートと実装後検証。Stop hook event の帰属、initial_prompt state、TUI 直接投入、通常 read metadata、pending 中の通常 pty_send 拒否、Grok/Composer OAuth approval 時の not_sent 挙動と未公開判断、final answer API の責務分離を再調査しないためのローカル証跡。"
evidence_level: "oracle_dry_run_live_timeout_aiterm_codex_subagents_real_smoke"
chars: 5968
---

# codex_agent prompt UX adversarial review

調査日: 2026-07-09  
対象: `docs/09_codex-agent-prompt-ux-plan.md` and local implementation

## 検証構成

- Oracle MCP
  - 添付: `docs/09_codex-agent-prompt-ux-plan.md`, `src/core.ts`, `src/index.ts`, `src/codex-stop-hook.ts`, `docs/04_agent-done-plan.md`, `docs/adr/0002-agent-launcher-tools.md`, `README.md`
  - 結果: dry-run bundle は成功。live consult は attachment upload timeout で完了しなかった。
  - Oracle 由来の指摘は採用せず、失敗として記録する。
- aiterm `codex_agent` session `plan_refute_aiterm`
  - prompt なし起動後、`pty_send(wait:"agent_done")` で短い ASCII review prompt を送り、`is_complete=True via agent_done vendor=codex` を確認した。
- Subagents `Darwin` / `Einstein`
  - 実装経路、API/UX 境界、既存 docs との衝突を分担して検証した。

## 採用した blocker

### 初回 prompt に `sendAndWaitAgentDone()` は単純再利用できない

`sendAndWaitAgentDone()` は冒頭で `bindCompletedInitialPrompt()` を呼ぶ。`initial_prompt=true` のまま初回 prompt route に入ると、文字列送信前に拒否される。

初回 prompt は専用 helper を作り、TUI ready gate、event boundary、`initial_prompt` state 遷移、prompt 送信を分ける。

### launcher `wait:"agent_done"` は `agent_done:true` 必須

`agent_done:true` は managed home / hook / metadata を作る明示 opt-in。`wait:"agent_done"` が暗黙に hook を有効化すると副作用が見えにくくなる。

計画では `prompt + agent_done:true + wait:"agent_done"` のみ有効とし、`agent_done:false` または prompt なしでは送信前エラーにする。

### 複数行 TUI 直接投入は acceptance にしない

現行 probe は shell argv と表示崩れを確認しただけで、TUI 入力欄への複数行投入が 1 turn に保たれることは確認していない。

実装前に Codex TUI で単一行、長い日本語、複数行日本語を smoke し、複数 turn に割れる場合は secure instruction file route に切り替える。

### final-message API は初期実装から外す

`last_assistant_message` を通常 event に保存して「最終回答だけ取得」API を作る案は、`docs/04_agent-done-plan.md` の「hook payload の最終回答を通常保存せず正本扱いしない」方針と衝突する。

さらに hook event JSONL には 64 KiB 上限があり、長い最終回答を同一行に入れると done event 自体を失う可能性がある。扱うなら ADR 級の別フェーズとし、event には pointer/size/status だけを入れる。

### 通常 `pty_read` の agent event は completion ではない

通常 `pty_read` が Stop hook event を見つけても、その event が現在の read/input に帰属するとは限らない。

`agent_done_detected` ではなく `agent_event_seen` とし、`completion_attribution=none` を明示する。`is_complete=True via agent_done` は、`pty_send(wait:"agent_done")` または launcher `wait:"agent_done"` が送信前 EOF boundary 以後の event を待った時だけ付ける。

### prompt は shell command ではない

初回 prompt route を通常 `pty_send` と同じ安全意味にすると、`rm -rf / を説明して` のような正当な prompt が destructive command として誤拒否され得る。

prompt route では destructive command gate と terminal control sanitization を分ける。prompt は shell command ではないが、端末制御シーケンスは別途扱う。

## 棄却した懸念

- shell quoting で日本語 prompt が必ず失われる、という主張は証拠不足。controlled probe では argv としては保持された。
- 通常 `pty_read(wait:true)` で Stop hook を見たら `is_complete=True` にすべき、という案は stale event の帰属を誤るため棄却。
- managed `CODEX_HOME` が user-level vendor hook file を壊す懸念は現行実装には当たらない。通常 hook file は編集しない。
- launcher に optional `wait` を足すこと自体は additive にできる。default `wait:"none"`、`agent_done:true` 必須、失敗時 session semantics の明文化が条件。

## 計画への反映

`docs/09_codex-agent-prompt-ux-plan.md` を更新し、以下を固定した。

- 初回 prompt 専用 helper を作る。
- `wait:"agent_done"` は `agent_done:true` 必須。
- 複数行 TUI 直接投入は実測ゲートにする。
- secure instruction file route の 0600/0700/no-follow/cleanup 方針を acceptance に入れる。
- `agent_event_seen` / `completion_attribution=none` を使い、通常 read の stale event を completion にしない。
- final-message API は初期実装から外す。

## 実装後検証

2026-07-09 に `src/core.ts` / `src/index.ts` / `test/core-agent.test.mjs` / `test/smoke.test.mjs` へ実装した。

実装結果:

- `codex_agent` launcher schema に `wait`, `timeout`, `screen`, `lines` を追加。Grok/Composer launcher には post-OAuth smoke まで公開しない。
- `openAgentWithInitialPrompt()` を追加し、起動と初回 prompt 送信を async route で分離。
- `sendInitialAgentPrompt()` を追加し、初回 prompt 専用に TUI ready、送信前 event EOF boundary、wait timeout、state 遷移を扱う。
- `initial_prompt` を `none/not_sent/sent/pending/done/failed` state として扱う。旧 boolean metadata は読み込み時に後方互換変換する。
- prompt route は `force:true` で destructive command gate を bypass するが、通常 sanitizer は通す。prompt は shell command ではないため、`rm -rf /` を含む説明依頼を誤拒否しない。
- 起動時 prompt が `pending` / `sent` の間は通常 `pty_send` を拒否し、後続入力が同じ TUI turn へ混入するのを防ぐ。手動介入は `pty_key` または明示的な `pty_send(..., force:true)`。
- session 作成後の初回 prompt route で error になった場合は、error text に `session_id` を残して調査/復旧できるようにする。
- `pty_read` は agent session では `agent_event_seen`, `completion_attribution=none`, `initial_prompt`, `last_turn_id`, `frontend` の補助 metadata を出す。通常 read の stale event を completion にしない。

検証:

- `npm test`: 177/177 pass。
- 実 Codex initial prompt wait smoke:
  - 単一行 prompt: Stop hook event 1件、expected marker、`is_complete=True via agent_done vendor=codex` を確認。
  - 長い日本語 prompt: Stop hook event 1件、expected marker、`is_complete=True via agent_done vendor=codex` を確認。
  - 複数行日本語 prompt: Stop hook event 1件、expected marker、`is_complete=True via agent_done vendor=codex` を確認。
  - shell continuation 表示は経由しない。
- 実 Grok/Composer initial prompt wait smoke:
  - 2026-07-09 の環境では OAuth browser approval 画面で止まり、ready gate は `ready=false`。
  - 戻り値は `initial_prompt=not_sent` で、prompt は送信されなかった。
  - これは安全側挙動として採用。公開 schema には出さず、ログイン承認後の再 smoke は `docs/09_codex-agent-prompt-ux-plan.md` Phase 6 に残す。

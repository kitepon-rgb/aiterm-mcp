---
title: "Grok/Composer agent_done implementation probe"
source_url: "local:aiterm-mcp-grok-agent-done-implementation-2026-07-07"
source_type: local_probe
fetched: 2026-07-07
topic: completion-detection
tags: ["grok", "composer", "agent_done", "oauth", "hook", "tui", "aiterm"]
summary: "aiterm-mcp に Grok/Composer 用 managed GROK_HOME + fake HOME + Stop hook wrapper を実装し、追加敵対的検証で GROK_HOME 全体共有案を棄却、OAuth auth.json/auth.json.lock だけを通常 Grok home と共有する実装に修正した。TUI ready gate 実装後、明示的な read ready 待ちなしの MCP tools/call 起動直後即送信 smoke も通過した。"
relevance: "Grok/Composer の TUI hook route 実装状況、OAuth credential/lock 共有の採用理由、実 TUI smoke、TUI ready gate、agent_done 負系/race/security/schema 回帰を固定する。"
evidence_level: "unit_test_green_166; real_tui_smoke_green; parallel_smoke_green; immediate_mcp_tools_call_smoke_green; negative_race_security_schema_tests_green"
chars: 6035
---

# Grok/Composer agent_done implementation probe

調査日: 2026-07-07  
対象: `aiterm-mcp` 未リリース実装、Grok CLI `0.2.87`

## 結論

Grok/Composer 用の `agent_done` 配管はコード上は入った。

- `grok-stop-hook.ts` を追加し、Grok Stop payload の `sessionId` / `promptId` / `reason` を aiterm の `agent_done` JSONL へ正規化する。
- `openAgent("grok"|"composer", { agent_done:true })` は launch ごとに managed `GROK_HOME` と fake `HOME` を作る。
- fake `HOME/.grok` は managed `GROK_HOME` へ symlink する。これが無いと Grok 内部の一部が `$HOME/.grok` を見て auth/welcome 経路が不安定になる。
- managed `GROK_HOME/config.toml` は `[cli] auto_update=false`、`[features] remote_fetch=false` / `managed_config=false`、`[compat.claude|cursor].* = false` を書く。
- OAuth では通常 Grok home の `auth.json` と `auth.json.lock` をセットで managed `GROK_HOME` へ symlink する。`auth.json` だけを symlink して lock を launch ごとに分裂させる経路は撤去した。
- Grok/Composer managed 起動には `--no-auto-update` と `--no-alt-screen` を入れる。prompt がある場合は、実測成功形に合わせて `--model ... --effort ... --verbatim '<prompt>'` の順にする。
- `pty_send(wait:"agent_done")` は Codex と同じ event file EOF 境界・session lock・suffix 付与を使い、vendor は `grok` / `composer` として返す。未 bind の初回送信では vendor TUI の入力欄 ready を送信前に待ち、未 ready なら文字列を送らずエラーにする。

追加敵対的検証で、aiterm 専用の永続共有 `GROK_HOME` 案は不採用にした。`GROK_HOME` は auth 専用ではなく、config / hooks / sessions / memory / plugins / logs を持つため、全体共有は hook/config/session 汚染を増やす。採用範囲は OAuth credential と lock file に限定する。

初回の実 Grok/Composer TUI smoke は未完了だった。理由は Grok 側の OAuth refresh token が失効しており、headless でも TUI でも再ログイン要求になったため。

観測 stderr:

```text
OIDC: token refresh HTTP error http_status=400 oauth2_error=Some("invalid_grant")
auth.refresh.permanent_failure reason=RefreshTokenRejected
auth: token expired, silent refresh failed - re-authentication required
```

この状態では `grok -p` も TUI も device-code login 画面へ入り、agent_done の実ターン検証にならなかった。`grok login` 承認後に再実行し、実 smoke は成功した。

## 通った検証

- `npm test`: 166 pass
- `grok-stop-hook`: Stop payload を `vendor:"grok"` / `vendor:"composer"` の `agent_done` event へ正規化。
- `openAgent grok/composer agent_done`: managed `GROK_HOME`、fake `HOME`、`HOME/.grok` symlink、OAuth `auth.json` + `auth.json.lock` symlink、Stop hook JSON、`--no-auto-update` / `--no-alt-screen` / `--verbatim` 組み立てを fake bin で確認。
- OAuth auth 不在時は session / agent state 残骸ゼロで `grok login` 必要エラーを返すことを確認。
- `sendAndWaitAgentDone`: fake Grok event 到着で `is_complete=True via agent_done vendor=grok` suffix を返す。
- `sendAndWaitAgentDone`: stale event、初回 prompt done、同時 wait busy reject、即時 event、`launch_id` 不一致、`vendor_session_id` bind 後の不一致、partial JSONL、malformed JSONL 診断、done後 offset consume を回帰化。
- hook wrapper: env 無し no-op、任意 path env 無視、symlink event file 拒否、secure state root/agents dir 負系を回帰化。
- core cleanup: root symlink を辿って agent state を削除しないことを回帰化。
- 追加敵対的検証: state root の mode が緩いと stale metadata cleanup がスキップされ、同名 agent 再起動後に metadata 複数で `pty_send(wait:"agent_done")` が失敗するケースを再現。core cleanup 側で owner/symlink を確認した上で root/agents dir を 0700 に補正して cleanup する修正と回帰テストを追加。
- 追加リリース前 smoke: 起動直後の Codex TUI に送ると入力受付前に文字列が落ち、`agent_timeout` になるケースを再現。未 bind の初回 `pty_send(wait:"agent_done")` に TUI ready gate を追加し、未 ready 時は送信前エラーで止める修正と回帰テストを追加。
- 追加敵対的検証: 遅延初回 prompt event、bind 後 vendor_session_id 欠落、bind 前 vendor_session_id 混在、screen settle 早期安定、wait 中 close/killAll、cross-process wait lock、oversized JSONL、event file hard link、Grok auth lock hard link を採用指摘として修正し、回帰テストを追加。
- screen settle: 不一致後の一致と上限到達を fake capture/fake clock で回帰化。
- managed home cleanup: Codex/Grok の symlink 先 auth/lock/config を close cleanup が変えないことを回帰化。
- MCP schema: `pty_send.wait` が `"none" | "agent_done"` のみであることを tools/list smoke で固定。
- `inspect` probe: fake `HOME` + managed `GROK_HOME` では hook source は aiterm の Stop hook 1件、plugin/MCP は 0 件にできる。
- 実 `grok_agent(agent_done:true)` -> `pty_send(wait:"agent_done")`: `OK` 応答と `is_complete=True via agent_done vendor=grok` を確認。
- 実 `composer_agent(agent_done:true)` -> `pty_send(wait:"agent_done")`: `OK` 応答と `is_complete=True via agent_done vendor=composer` を確認。
- 並行 smoke: Grok TUI、Composer TUI、通常 headless `grok -p` を同時実行し、`grokDone:true` / `composerDone:true` / `headlessText:"OK"` / login prompt false を確認。
- 同一 cwd 並列 smoke: Codex/Grok/Composer を `/Users/kite/Developer/aiterm-mcp` で同時に起動し、3本とも `is_complete=True via agent_done vendor=...` と `OK` を確認。event 混線なし。
- MCP tools/call smoke: `node dist/index.js` を実起動し、JSON-RPC `tools/call` 経由で `codex_agent` / `grok_agent` / `composer_agent` + `pty_send(wait:"agent_done")` を同時実行。3本とも `OK` と agent_done suffix を確認。ready gate 実装後は、明示的な `pty_read` ready 待ちなしの起動直後即送信でも通過。
- 普通PTY smoke: Python REPL に入り、`until: ">>>"` で `print(sum(range(10))) -> 45` を確認。MCP `tools/call` 経由でも `pty_open` / `pty_send` / `pty_read(wait:true, until:"45")` / `pty_close` が通過し、agent_done 実装後も REPL の従来挙動は維持。

## 通っていない検証

- refresh token rotation を強制する長時間/期限切れ再現は未実施。今回の並行 smoke は「即時に login 再要求へ戻らない」ことの確認であり、将来の refresh 競合を完全証明するものではない。
- StopFailure、キャンセル、権限待ち、エラー時 payload と screen の採取は未実施。

## 次にやること

1. refresh token が実際に期限切れ/更新される条件で、複数 aiterm Grok/Composer session と通常 `grok` CLI の並行 smoke を再実行する。
2. StopFailure、キャンセル、権限待ち、エラー時の payload と screen を採取する。
3. no-prompt 起動後の follow-up 入力と、prompt あり起動後の follow-up を分けて回帰化する。

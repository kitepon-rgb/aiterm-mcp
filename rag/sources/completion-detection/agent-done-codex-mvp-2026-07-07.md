---
title: "Codex agent_done MVP implementation smoke"
source_url: "local:aiterm-mcp-codex-agent-done-mvp-2026-07-07"
source_type: local_probe
fetched: 2026-07-07
topic: completion-detection
tags: ["codex", "aiterm", "agent_done", "stop-hook", "tmux", "mvp"]
summary: "aiterm-mcp に Codex managed Stop hook route を実装し、codex_agent(agent_done:true) から pty_send(wait:\"agent_done\") が実 Codex TUI の1ターン終了を待てることを確認した。"
relevance: "AI CLI done 検知計画の採用ゲート。Codex は画面推測ではなく Stop hook event で done を返せること、また tmux send-keys では text と Enter を分離すべきことを固定する。"
evidence_level: "implemented_unit_test_real_codex_smoke"
chars: 3128
---

# Codex agent_done MVP implementation smoke

調査日: 2026-07-07  
対象: `aiterm-mcp` local implementation

Current status (2026-07-07 finalization): this note records the first Codex
MVP cut. It is superseded by the later Grok/Composer implementation probe and
Codex managed home allowlist hardening. Current released state is
`aiterm-mcp@0.9.1`: Codex/Grok/Composer `agent_done` are released, Codex
managed `CODEX_HOME` allowlists only `auth.json` symlink + private
`config.toml` copy + aiterm-owned `hooks.json`, and the regression suite is
168 tests.

## 結論

Codex については、永続PTY TUIを維持したまま `pty_send(wait:"agent_done")` で turn done を待つ最小縦断が通った。

実装後の実 Codex smoke:

```text
codex_agent(agent_done:true, reasoning_effort:"low")
pty_send(wait:"agent_done", text:"Reply exactly OK and nothing else.")

• OK
• Stop hook (stopped)
[is_complete=True via agent_done vendor=codex turn_id=... vendor_session_id=... done_status=turn_done]
```

ここでの done は「Codex の1ターン終了」であり、タスク成功や回答品質は含めない。

## 実装した route

- `codex_agent` に `agent_done?: boolean` を追加した。
- `agent_done:true` の時だけ managed `CODEX_HOME` を作る。
- 当時の MVP route は通常 `~/.codex` の top-level entry を広く symlink し、`config.toml` を copy、`auth.json` を symlink、`hooks.json` だけ aiterm 管理の Stop hook に差し替えていた。
- 現在の v0.9.1 route はこの広い symlink を廃止し、通常 Codex home からは `auth.json` symlink と `config.toml` private copy だけを持ち込み、`hooks.json` は aiterm が managed home 内で所有する。
- Codex 起動コマンドには `CODEX_HOME=<managedHome>`、`AITERM_AGENT_KIND=codex`、`AITERM_SESSION_ID`、`AITERM_AGENT_LAUNCH_ID`、`--dangerously-bypass-hook-trust` を付ける。
- hook wrapper は `AITERM_AGENT_*` から secure state root 配下の event file path を再構成し、`agent_done` JSONL を append する。
- hook wrapper stdout は Codex への JSON 応答 `{ "continue": false }` だけにし、診断は stderr。
- `pty_send(wait:"agent_done")` は送信直前の event file EOF を開始境界とし、それ以後の matching event だけを採用する。
- 普通のPTY session、`mark:true`、`rtk:true`、`enter:false` は送信前に拒否する。

## 追加で見つけた罠

初回実 smoke は2回 timeout した。画面には入力したプロンプトが残り、Stop hook event は来なかった。

切り分けとして、モデル呼び出しを伴わない `/status` を Codex TUI に送った。

失敗:

```text
core.send(sid, "/status", { enter:true })
-> 画面に "› /status" が残るだけで status は開かない
```

成功:

```text
core.send(sid, "/status", { enter:false })
sleep(500ms)
core.sendKey(sid, "Enter")
-> /status 画面が開く
```

このため `sendAndWaitAgentDone` は通常の `core.send(..., enter:true)` を使わず、agent_done 経路だけ `enter:false` で text を入れてから短い delay 後に Enter を送る。

この修正後、実 Codex smoke は約14秒で成功した。

## 回帰テスト

当時の `npm test` は 134 tests pass。現在の v0.9.1 finalization 後は
168 tests pass。

追加した主なテスト:

- `codex-stop-hook` が Stop payload を `agent_done` event に正規化し、`continue:false` を返す。
- `openAgent("codex", {agent_done:true})` が managed `CODEX_HOME` と Stop hook を組み立てる。
- `sendAndWaitAgentDone` が fake event 到着まで待ち、`agent_done` suffix を付ける。
- 普通のPTY session は `agent_done` 待機を送信前に拒否する。
- `enter:false` は `agent_done` 待機で送信前に拒否する。
- Grok/Composer の `agent_done:true` は当時は送信前に拒否していた
  （現在は実装・実 smoke 済み）。

## 残る未解決

- Grok/Composer はこの時点では未実装だったが、後続の
  `grok-agent-done-implementation-probe-2026-07-07.md` で実装・実 smoke 済み。
- Codex managed home の広い symlink pass-through は後続の
  `codex-managed-home-allowlist-2026-07-07.md` で hardening 済み。
- StopFailure、キャンセル、権限待ち、長文回答時の screen settle は追加 smoke が必要。

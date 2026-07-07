---
title: "Codex CLI Stop hook as turn-done signal"
source_url: "https://developers.openai.com/codex/hooks"
source_type: official_docs_and_local_probe
fetched: 2026-07-06
topic: completion-detection
tags: ["codex", "hook", "stop", "turn-done", "tui", "agent-cli"]
summary: "Codex CLI の Stop hook はターン終了時に発火する。exec、直接TUI、aiterm openAgent相当のtmux経路で発火を実測した。ただし co-located Stop hook の decision:block continuation で初回Stopは final done ではなくなる。"
relevance: "Codex TUI の画面文言や静止状態ではなく、CLIライフサイクルイベントで done を捕まえる根拠。同時に、既存 Stop hook へ単純appendする bridge が誤doneする反証でもある。"
evidence_level: "direct_exec_tui_openagent_probe; continuation_blocker_confirmed"
chars: 4476
---

# Codex CLI Stop hook as turn-done signal

調査日: 2026-07-06  
更新日: 2026-07-07  
実測バージョン: `codex-cli 0.142.3`

## 結論

Codex TUI の done は、画面末尾やプロンプト文字列から推測しない。Codex CLI の `Stop` hook を使うと、Codex の1ターン終了時に機械可読の payload を外部スクリプトへ渡せる。

ここでの done は「タスク成功」ではなく、「Codex の1ターンが終わり、次の入力境界に来た」という意味に限定する。

ただし、co-located Stop hooks がある場合、`Stop` 到着だけを final done とみなしてはいけない。別の Stop hook が `decision:"block"` を返すと Codex は継続し、bridge hook は continuation 前の Stop と continuation 後の Stop の両方を見得る。

## 公式仕様から確認したこと

- hooks は Codex の lifecycle に command hook を差し込む仕組み。
- `Stop` は turn scope の event。
- `Stop` の matcher は無視される。
- hook sources は user-level `~/.codex/hooks.json` / `~/.codex/config.toml` と project-local `.codex/...` など。
- project-local hooks は trusted project layer が必要。
- `--dangerously-bypass-hook-trust` を付けると、その実行だけ hook trust review をバイパスできる。
- `async: true` の command hooks は Codex 0.142.3 では skip される。

## 実測: user-level Stop hook

ユーザー本体の `~/.codex` は編集せず、一時 `CODEX_HOME` に `hooks.json` を置き、`auth.json` は symlink のみで利用した。秘密の内容は読んでいない。

hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /tmp/aiterm-codex-home-probe.JHSCz5/stop_hook.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### `codex exec --json`

実行:

```bash
CODEX_HOME=/tmp/aiterm-codex-home-probe.JHSCz5 \
  codex --dangerously-bypass-hook-trust \
  --ask-for-approval never \
  --sandbox read-only \
  exec --json --ephemeral \
  "Reply with exactly OK and nothing else."
```

Stop hook payload:

```json
{
  "session_id": "019f37c3-f239-77e1-9f10-7ff75d3e021c",
  "turn_id": "019f37c3-f245-7502-a3bb-be0477aa94c0",
  "transcript_path": null,
  "cwd": "/Users/kite/Developer/aiterm-mcp",
  "hook_event_name": "Stop",
  "model": "gpt-5.5",
  "permission_mode": "bypassPermissions",
  "stop_hook_active": false,
  "last_assistant_message": "OK"
}
```

### interactive TUI

実行:

```bash
CODEX_HOME=/tmp/aiterm-codex-home-probe.JHSCz5 \
  codex --dangerously-bypass-hook-trust \
  --ask-for-approval never \
  --sandbox read-only \
  --no-alt-screen \
  "Reply with exactly OK and nothing else."
```

Stop hook payload:

```json
{
  "session_id": "019f37c6-e53d-78d3-8210-ad98fe4c115c",
  "turn_id": "019f37c6-e67d-7dc0-90d5-dca20060f2ec",
  "transcript_path": "/private/tmp/aiterm-codex-home-probe.JHSCz5/sessions/2026/07/06/rollout-2026-07-06T23-13-29-019f37c6-e53d-78d3-8210-ad98fe4c115c.jsonl",
  "cwd": "/Users/kite/Developer/aiterm-mcp",
  "hook_event_name": "Stop",
  "model": "gpt-5.5",
  "permission_mode": "bypassPermissions",
  "stop_hook_active": false,
  "last_assistant_message": "OK"
}
```

### aiterm openAgent 相当の tmux 経路

2026-07-07 の Phase 0 smoke で、`core.openAgent("codex", ...)` と同じ `tmux new-session -> bash -> send-keys` 経路でも Stop hook 発火を確認した。

観測:

- temporary `CODEX_HOME` + `auth.json` symlink
- `--dangerously-bypass-hook-trust`
- `last_assistant_message`: `OK`
- `hook_event_name`: `Stop`
- `permission_mode`: `bypassPermissions`
- `AITERM_AGENT_KIND` / `AITERM_AGENT_SESSION_ID` / `AITERM_AGENT_LAUNCH_ID` が hook env へ届いた
- temporary home では project directory trust prompt が出る。hook trust bypass とは別問題

新規 tmux server では親環境の custom env が hook まで届く。一方、既存 tmux server に後から env 付き client で `new-session` しても custom env は自動伝播しない。実装では `tmux new-session -e ...` または起動コマンド側で明示 env を渡す。

## 実測: co-located Stop hook continuation

2026-07-07 の Phase 0 smoke で、Stop hooks を2本同居させた。

- bridge hook: payload を記録して `{}` を返す。
- adversary hook: 初回 Stop で `{"decision":"block","reason":"...SECOND..."}` を返して Codex を継続させる。

結果:

```json
[
  {
    "kind": "bridge",
    "payload": {
      "hook_event_name": "Stop",
      "stop_hook_active": false,
      "last_assistant_message": "FIRST",
      "turn_id": "019f380b-464a-7eb0-b812-7052884bd1c4"
    }
  },
  {
    "kind": "adversary",
    "stdout": {
      "decision": "block",
      "reason": "Adversary Stop hook continuation: reply exactly SECOND and do not run tools."
    }
  },
  {
    "kind": "bridge",
    "payload": {
      "hook_event_name": "Stop",
      "stop_hook_active": true,
      "last_assistant_message": "SECOND",
      "turn_id": "019f380b-464a-7eb0-b812-7052884bd1c4"
    }
  }
]
```

adversary -> bridge の逆順でも bridge は2回記録した。hook 設定順序では守れない。continuation 後も `turn_id` は同じだった。

このため、既存 user-level Stop hook へ aiterm bridge を単純 append する設計では、bridge が `FIRST` の Stop を final done と誤認し得る。

## 実装上の含意

- Codex TUIを維持するなら、Stop hook bridge が done 検知の本命。ただし bridge が Stop chain を単独所有できる route、または continuation を含む最終結果を集約できる managed wrapper が必要。
- `last_assistant_message` は最終応答の取得に使えるが、成功判定そのものではない。
- `stop_hook_active` は Stop hook の再入・継続制御を扱うためのフラグ。continuation 前後で同じ `turn_id` が来るため、`turn_id` だけで重複排除しない。
- hook が全ターンに対して発火するので、aiterm 側は vendor `session_id` / `turn_id` / timestamp / cwd / launch token で自分のPTYセッションへ対応付ける必要がある。

## 注意点

- project-local `.codex/hooks.json` は一時git repoで試した限り、`codex exec` ではログが出なかった。user-level `CODEX_HOME/hooks.json` は exec/TUI ともに実測成功。MVPで project-local hook 前提にしない。
- user-level hooks を aiterm が勝手に書き換えるのは高リスク。やるなら明示的な setup コマンドと restore 導線が必要。単純 append は continuation 誤doneのため禁止。
- per-launch temporary `CODEX_HOME` + auth symlink だけでは通常 home と同等ではない。model/MCP/plugins/sandbox/approval/trust が変わるため、そのまま採用しない。
- Stop hook は「ターン終了」を示す。キャンセルやエラーを成功扱いしないため、必要なら transcript / JSONL / last message / 別イベントを併読する。
- hook trust と project directory trust は別。temporary home では project trust prompt で止まる可能性を成功扱いしない。

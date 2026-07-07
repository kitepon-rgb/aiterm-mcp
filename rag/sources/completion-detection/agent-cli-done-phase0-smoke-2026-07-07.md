---
title: "Phase 0 multi-agent smoke: AI CLI TUI done detection"
source_url: "local:multi-agent-smoke-2026-07-07"
source_type: local_probe
fetched: 2026-07-07
topic: completion-detection
tags: ["codex", "grok", "composer", "hook", "stop", "tui", "temporary-home", "phase0"]
summary: "Codex/Grok/Composer の TUI Stop hook をマルチエージェントで実測した。hook 発火自体は確認できたが、Codex continuation と temporary home 差分が実装前ブロッカーとして残った。"
relevance: "pty_send(wait:\"agent_done\") 実装前の採用ゲート。Stop hook を捕まえるだけでは final done にならない条件と、temporary vendor home をそのまま使えない条件を固定する。"
evidence_level: "multi_agent_local_probe"
chars: 7446
---

# Phase 0 multi-agent smoke: AI CLI TUI done detection

調査日: 2026-07-07  
対象: `codex_agent` / `grok_agent` / `composer_agent` の永続PTY TUI done 検知  
目的: vendor Stop hook を `pty_send(wait:"agent_done")` の完了境界に使えるか、実装前ブロッカーを実測する。

## 実行環境

- repo: `/Users/kite/Developer/aiterm-mcp`
- Codex: `/Users/kite/.local/bin/codex`, `codex-cli 0.142.3`
- Grok: `/Users/kite/.grok/bin/grok`, 実測中に `0.2.82` から `0.2.87` へ更新された形跡あり
- tmux: `3.7b`
- platform: macOS / uid `501`
- `XDG_RUNTIME_DIR`: 未設定
- `os.tmpdir()`: `/var/folders/v4/ntdd_q2d10q962kq3cfx8lr00000gn/T`

秘密は読まない。`auth.json` は symlink 参照または mtime/hash 確認に留める。

## 結論

Stop hook 発火自体は Codex/Grok/Composer TUI すべてで確認できた。

ただし、それだけでは `pty_send(wait:"agent_done")` 実装へ進めない。Codex は co-located Stop hook の continuation で初回 Stop が final done ではなくなる。Grok/Composer は temporary home と compat hook/plugin 混入を制御できていない。

## Codex TUI hook/env smoke

aiterm `openAgent("codex", ...)` と同じ `tmux new-session -> bash -> send-keys` 経路で、Codex TUI Stop hook が発火した。

条件:

- temporary `CODEX_HOME`
- 通常 `~/.codex/auth.json` は symlink のみ
- `--dangerously-bypass-hook-trust`
- `--ask-for-approval never`
- `--sandbox read-only`
- prompt: `Reply exactly OK.`

観測:

- `last_assistant_message`: `OK`
- `hook_event_name`: `Stop`
- `permission_mode`: `bypassPermissions`
- hook env に `AITERM_AGENT_KIND=codex` / `AITERM_AGENT_SESSION_ID` / `AITERM_AGENT_LAUNCH_ID` が届いた
- temporary home では project directory trust prompt が出る。hook trust bypass とは別問題
- 既存 `~/.codex/auth.json` の mtime は不変

追加で分かったこと:

- 新規 tmux server では親環境の custom env が hook まで届く。
- 既存 tmux server に後から env 付き client で `new-session` しても custom env は自動伝播しない。実装では `tmux new-session -e ...` または起動コマンド側の明示 env が必要。

## Codex Stop continuation smoke

Stop hook を2本同居させた。

- `bridge.py`: payload を event file へ記録し、stdout は `{}`。
- `adversary.py`: 初回 Stop で `{"decision":"block","reason":"...SECOND..."}` を stdout へ出し、Codex を継続させる。

代表コマンド:

```bash
CODEX_HOME=/tmp/aiterm-phase0-smoke... \
  codex --dangerously-bypass-hook-trust \
  --ask-for-approval never \
  --sandbox read-only \
  --no-alt-screen \
  -C /Users/kite/Developer/aiterm-mcp \
  'Do not run tools. Reply exactly FIRST and nothing else. If a later prompt asks for SECOND, reply exactly SECOND and nothing else.'
```

bridge -> adversary 順の実測:

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

adversary -> bridge 順でも bridge は2回記録した。hook 設定順序では守れない。continuation 後も `turn_id` は同一だった。

採用する制約:

- co-located Stop hooks を許すなら「Stop 到着 = done」は禁止。
- `turn_id` だけで重複排除しない。
- bridge を最後に置く設計や hook 順序依存は不可。
- 安全にやるなら、Stop chain を aiterm が所有する isolated route、または全 hook 結果を集約できる managed wrapper が必要。

## Codex trust smoke

- `--dangerously-bypass-hook-trust` あり: hooks は実行された。
- bypass なし・未 trust の `codex exec --json --ephemeral`: Codex は正常終了したが Stop hooks は0件だった。
- bypass なし・TUI で `Trust all and continue`: temporary `config.toml` に `hooks.state...trusted_hash` が保存され、Stop hook は実行された。
- temporary home では project directory trust prompt も別に出る。

## Temporary Codex home 差分

`CODEX_HOME=temp` + `auth.json` symlink だけでは通常 home と同等ではない。

観測:

- model: `gpt-5.5` から `<default>` 相当へ変化
- MCP: `12 -> 0`
- plugins: `11 -> 0`
- sandbox/approval: `Never + unrestricted + network enabled` から `OnRequest + restricted + restricted` へ変化
- session/state/log/sqlite は temp 側へ移動

`auth + config + hooks` symlink まで増やすと model/MCP は戻るが、plugin marketplace snapshot が temp home に無く `codex plugin list` が失敗した。

採用判断: auth symlink だけの per-launch temporary `CODEX_HOME` は不採用。

## Grok / Composer TUI hook smoke

Grok Build(Grok) と Grok Build(Composer) の TUI で Stop hook が発火した。

Grok TUI 条件:

- `GROK_HOME=temp`
- `auth.json` symlink
- `grok --model grok-build --effort low --verbatim 'Reply exactly OK.'`

Composer TUI は `grok-composer-2.5-fast` 相当で同様に実測。

payload shape:

```json
{
  "cwd": "/Users/kite/Developer/aiterm-mcp",
  "hookEventName": "stop",
  "promptId": "...",
  "reason": "end_turn",
  "sessionId": "...",
  "timestamp": "...",
  "transcriptPath": "...",
  "workspaceRoot": "/Users/kite/Developer/aiterm-mcp/"
}
```

hook env:

- `AITERM_AGENT_KIND=grok` または `composer`
- `AITERM_AGENT_LAUNCH_ID=...`
- `GROK_HOOK_EVENT=stop`
- `GROK_SESSION_ID=...`
- `GROK_HOME=...`

payload には model id が入らない。Grok と Composer の区別は aiterm が注入する `AITERM_AGENT_KIND` と agent metadata に依存する。

## Grok temporary home / compat hook 差分

`GROK_HOME=temp` + `auth.json` symlink だけでは通常 home と同等ではない。

観測:

- native `~/.grok/config.toml` が消える
- `inspect` 上は MCP `10 -> 9`、skills `21 -> 8`
- native `x-article` MCP が消える
- 一方で `.claude` 互換の MCP / plugins / hooks は temp home でも残る
- `grok mcp list --json` では temp で `1 -> 0` になるが、runtime discovery の `inspect` では Claude compat MCP が残る
- `GROK_CLAUDE_HOOKS_ENABLED=false` / `GROK_CURSOR_HOOKS_ENABLED=false` と `[compat.<vendor>] hooks=false` は user hooks 無効化には効く
- Claude plugin 由来 hook file は残った。`[plugins].disabled` の列挙や `*` では消えなかった

Grok は調査中に `0.2.82` から `0.2.87` へ symlink が更新された形跡がある。正確な発火点は未切り分けだが、TUI起動経路で `--no-auto-update` 相当を固定できるまで実装対象に広げない。

採用判断: auth symlink だけの per-launch temporary `GROK_HOME` は不採用。compat hook/plugin 混入の制御が次ブロッカー。

## Secure state root smoke

hook state は現行 tmux socket dir に混ぜない。

採用:

- POSIX: `$XDG_RUNTIME_DIR/aiterm-mcp`
- fallback: `${os.tmpdir()}/aiterm-mcp-<uid>`
- directory / non-symlink / owner=current uid / mode `0700` を要求
- event file は `<STATE_ROOT>/agents/<session>.<launch_id>.events.jsonl`
- event file は `0600`, append は1 JSON line = 1 write
- wrapper env は `AITERM_AGENT_KIND` / `AITERM_SESSION_ID` / `AITERM_AGENT_LAUNCH_ID` まで
- `AITERM_AGENT_EVENT_FILE` のような任意 path env は採用しない

ローカル実測:

- `XDG_RUNTIME_DIR` 未設定
- fallback root 候補: `/var/folders/v4/ntdd_q2d10q962kq3cfx8lr00000gn/T/aiterm-mcp-501`
- 現行 `SOCKDIR` は `${TMPDIR}/claude-tmux-sockets`
- 実測 directory mode は `0755`、socket は `0600`

結論: `SOCKDIR` は event/metadata 置き場として不適。secure state root を別に持つ。

## 実装へ進む条件

Phase 1 へ進む前に、少なくとも Codex で次のどちらかを実証する。

1. 通常 home の model / MCP / plugins / sandbox / approval / project trust を必要十分に保ちつつ、Stop chain を aiterm が単独所有できる managed isolated home。
2. 既存 Stop hooks を単純 append せず、continuation を含む最終結果を誤認しない explicit setup / managed wrapper。

このどちらも通らない場合、TUI hook bridge の実装へ進まず、Codex exec JSONL / Grok headless JSON / Grok ACP の structured route を別計画で検討する。

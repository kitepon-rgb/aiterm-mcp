---
title: "Grok Build Stop hook as turn-done signal"
source_url: "local:~/.grok/docs/user-guide/10-hooks.md"
source_type: local_vendor_docs_and_probe
fetched: 2026-07-06
topic: completion-detection
tags: ["grok", "grok-build", "hook", "stop", "turn-done", "agent-cli"]
summary: "Grok の Stop hook は agent turn 終了時に発火する。headless、Grok TUI、Composer TUI で payload に sessionId/promptId/reason/transcriptPath が入ることを実測した。ただし temporary home と Claude/Cursor compat hook 混入が未解決。"
relevance: "Grok/Composer TUI の done を lifecycle hook で捕まえる根拠。同時に、GROK_HOME 隔離・auto-update・compat hook/plugin 抑制を実装前ブロッカーとして固定する資料。"
evidence_level: "headless_and_tui_probe; compat_home_blocker"
chars: 3823
---

# Grok Build Stop hook as turn-done signal

調査日: 2026-07-06  
更新日: 2026-07-07  
実測バージョン: `grok 0.2.82 (6d0b07d2de0f) [stable]`。Phase 0 smoke 中に `0.2.87` へ更新された形跡あり。

## 結論

Grok Build の done は `Stop` hook で捕まえられる。Grok docs は `Stop` を「agent turn ends」と定義し、完了・キャンセル・エラーを含むターン終了イベントとして扱っている。

2026-07-07 の Phase 0 smoke で、既存 `grok_agent` / `composer_agent` 相当の TUI 経路でも Stop hook 発火を確認した。

ただし、TUI hook bridge の実装へ進むにはまだ早い。temporary `GROK_HOME` + auth symlink だけでは通常 home と同等ではなく、Claude/Cursor 互換 hook/plugin 混入を完全には抑制できていない。さらに Grok CLI が通常 `~/.grok` 側を自動更新した形跡がある。

ここでの done は「Grok の1ターンが終了した」という意味。成功・キャンセル・エラーの区別は payload の `reason` や `StopFailure`、JSON output を見る。

## vendor docs から確認したこと

- hook は Grok session の lifecycle event で command または HTTP endpoint を呼ぶ。
- global hooks は `~/.grok/hooks/*.json` に置ける。
- project hooks は `<project>/.grok/hooks/*.json` などに置けるが folder trust が必要。
- `Stop` は agent turn の終了時に発火し、blocking ではない。
- `StopFailure` は API error でターンが終わった時のイベント。
- hook stdin には JSON payload が渡る。
- hook process には `GROK_HOOK_EVENT`, `GROK_SESSION_ID`, `GROK_WORKSPACE_ROOT` などの env も入る。

## 実測

ユーザー本体の `~/.grok` は編集せず、一時 `GROK_HOME` に `hooks/stop.json` を置き、`auth.json` は symlink のみで利用した。秘密の内容は読んでいない。

hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /tmp/aiterm-grok-home-probe.N6saDi/stop_hook.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

実行:

```bash
GROK_HOME=/tmp/aiterm-grok-home-probe.N6saDi \
  grok -p "Reply with exactly OK and nothing else." \
  --model grok-build \
  --effort low \
  --max-turns 1 \
  --output-format streaming-json \
  --no-auto-update
```

Stop hook payload:

```json
{
  "hookEventName": "stop",
  "sessionId": "019f37c4-7fa1-7643-9cef-5fd5fa74db34",
  "cwd": "/Users/kite/Developer/aiterm-mcp",
  "workspaceRoot": "/Users/kite/Developer/aiterm-mcp/",
  "timestamp": "2026-07-06T14:10:56.432710+00:00",
  "transcriptPath": "/tmp/aiterm-grok-home-probe.N6saDi/sessions/%2FUsers%2Fkite%2FDeveloper%2Faiterm-mcp/019f37c4-7fa1-7643-9cef-5fd5fa74db34/updates.jsonl",
  "promptId": "b85999ef-db56-4e3a-b6a2-b35d91a9ae52",
  "reason": "end_turn"
}
```

## 実測: Grok / Composer TUI Stop hook

2026-07-07 の Phase 0 smoke で、Grok Build(Grok) と Grok Build(Composer) の TUI Stop hook が発火することを確認した。

Grok TUI 条件:

```bash
GROK_HOME=/tmp/aiterm-grok-tui-smoke... \
  grok --model grok-build \
  --effort low \
  --verbatim 'Reply exactly OK.'
```

観測 payload:

```json
{
  "hookEventName": "stop",
  "reason": "end_turn",
  "sessionId": "019f3806-a1ea-7222-b0bf-9de4b47c76be",
  "promptId": "1f88f14e-c994-4a02-94e7-9785ae60f0a5",
  "cwd": "/Users/kite/Developer/aiterm-mcp",
  "workspaceRoot": "/Users/kite/Developer/aiterm-mcp/",
  "transcriptPath": "/tmp/aiterm-grok-tui-smoke.../sessions/.../updates.jsonl"
}
```

hook env:

- `AITERM_AGENT_KIND=grok` または `composer`
- `AITERM_AGENT_LAUNCH_ID=...`
- `GROK_HOOK_EVENT=stop`
- `GROK_SESSION_ID=...`
- `GROK_HOME=...`

Composer TUI の Stop payload shape は Grok TUI と同型だった。payload には model id が無いため、Grok と Composer の区別は aiterm が注入した `AITERM_AGENT_KIND` と metadata に依存する。

TUI には `user_prompt_submit [hooks: 2]` や `stop [hooks: 2/1]` の表示が出た。自分の temporary hook 以外の hook/compat source が同居している兆候がある。

## Temporary Grok home 差分

`GROK_HOME=temp` + `auth.json` symlink だけでは通常 home と同等ではない。

観測:

- native `~/.grok/config.toml` が消える。
- `inspect` 上は MCP `10 -> 9`、skills `21 -> 8`。
- native `x-article` MCP が消える。
- `.claude` 互換の MCP / plugins / hooks は temp home でも残る。
- `grok mcp list --json` は temp で `1 -> 0` になるが、runtime discovery の `inspect` では Claude compat MCP が残る。
- `GROK_CLAUDE_HOOKS_ENABLED=false` / `GROK_CURSOR_HOOKS_ENABLED=false` と `[compat.<vendor>] hooks=false` は user hooks 無効化には効く。
- Claude plugin 由来 hook file は残った。`[plugins].disabled` の列挙や `*` では消えなかった。

採用判断: auth symlink だけの temporary `GROK_HOME` は不採用。

## Auto-update risk

Phase 0 smoke 中に Grok CLI が `0.2.82` から `0.2.87` へ更新された形跡がある。`~/.grok/bundled`、`~/.grok/docs`、`~/.grok/active_sessions.json` などが更新された一方、`auth.json` / `auth.json.lock` は更新されていない。

正確な発火点は未切り分けだが、TUI起動経路で `--no-auto-update` 相当を確実に入れ、通常 `~/.grok` が更新されないことを smoke するまで Grok/Composer は実装対象に広げない。

## 実装上の含意

- Grok hook は `reason` を持つため、少なくとも headless/TUI で実測した正常系では `end_turn` を done として扱える。
- `sessionId` と `promptId` があるので、headless/structured mode なら correlation は比較的容易。
- TUIでも Stop hook は発火したが、payload に model id が無いため、`grok` / `composer` の区別は aiterm metadata で持つ。
- global hooks は常に trusted なので設置は簡単だが、ユーザー設定を勝手に汚さない。Codex と同様、setup コマンドまたは per-launch temporary `GROK_HOME` が候補。ただし auth symlink だけの temporary home は不採用。

## 注意点

- Grok は Claude/Cursor互換 hook sources も読む。既存の `~/.claude/settings.json` 側 hook だけでなく、Claude plugin 由来 hook が混ざる可能性もある。
- `Stop` は passive hook。失敗しても本体の実行は止まらないため、done bridge 側は hook の書き込み失敗を監視・可視化する必要がある。
- `Stop` は completed/cancelled/error を含む。成功判定が必要なら `reason`、`StopFailure`、または transcript を見る。

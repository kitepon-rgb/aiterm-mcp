---
title: "Codex exec --json turn.completed as structured done signal"
source_url: "https://developers.openai.com/codex/noninteractive"
source_type: official_docs_and_local_probe
fetched: 2026-07-06
topic: completion-detection
tags: ["codex", "exec", "jsonl", "turn.completed", "turn.failed", "agent-cli"]
summary: "Codex の non-interactive mode は `codex exec --json` で JSONL を出し、`turn.completed` / `turn.failed` を機械可読なターン境界として読める。"
relevance: "Codex をTUI画面ではなく構造化stdoutで委譲する場合の最も堅い done 検知経路。"
chars: 2300
---

# Codex exec --json turn.completed as structured done signal

調査日: 2026-07-06  
実測バージョン: `codex-cli 0.142.3`

## 結論

Codex を「他AIへ1ターン投げて結果を待つ」用途で使うなら、TUIをスクレイプするより `codex exec --json` を使う方が堅い。stdout に JSONL event stream が出て、正常完了は `turn.completed`、失敗は `turn.failed` / `error` として捕まえられる。

ここでの done は「Codex の1ターンが完了した」という意味。成果物の品質やタスク成功は別途検証する。

## 公式仕様から確認したこと

- `codex exec` は interactive TUI を開かない non-interactive mode。
- `--json` を有効にすると stdout は JSON Lines になる。
- event type には `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.*`, `error` が含まれる。
- セッション継続は `codex exec resume --last ...` または `codex exec resume <SESSION_ID> ...`。

## 実測

実行:

```bash
codex --ask-for-approval never \
  --sandbox read-only \
  exec --json --ephemeral \
  "Reply with exactly OK and nothing else."
```

観測した主要イベント:

```jsonl
{"type":"thread.started","thread_id":"019f37c1-e2ba-7333-bb88-1148d20b934f"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"OK"}}
{"type":"turn.completed","usage":{"input_tokens":22513,"cached_input_tokens":4480,"output_tokens":50,"reasoning_output_tokens":43}}
```

## 実装上の読み方

- `thread.started.thread_id` を vendor session/thread id として記録する。
- `item.completed` の `item.type == "agent_message"` を最終応答候補として蓄積する。
- `turn.completed` を done として扱う。
- `turn.failed` または `error` は done ではなく failed として扱う。
- stderr には警告が混ざるため、JSONL parser は stdout の JSON line だけを読む設計にする。

## aiterm への含意

既存の `codex_agent` はTUIを永続PTYに起動する設計だが、done検知を最重要視する委譲用途では `codex exec --json` を別ツールまたは別modeとして持つ方が安全。

候補:

- `codex_agent(mode: "tui")`: 既存通り。done は Stop hook bridge。
- `codex_agent(mode: "exec-json")` または `codex_run`: `codex exec --json` を起動し、`turn.completed` を待つ。

TUIの人間可読性と JSONL の決定論性は別価値なので、同じ done 判定で無理に統一しない。

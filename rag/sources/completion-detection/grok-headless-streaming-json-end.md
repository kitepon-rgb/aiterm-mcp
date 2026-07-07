---
title: "Grok headless streaming-json end event"
source_url: "local:~/.grok/docs/user-guide/14-headless-mode.md"
source_type: local_vendor_docs_and_probe
fetched: 2026-07-06
topic: completion-detection
tags: ["grok", "grok-build", "headless", "streaming-json", "end", "agent-cli"]
summary: "Grok headless mode は `--output-format streaming-json` で JSONL を出し、`type: end` をターン完了イベントとして読める。"
relevance: "Grok Build をAIからAIへ委譲する用途で、TUIやHookなしにstdoutだけで done を取る最短経路。"
chars: 2158
---

# Grok headless streaming-json end event

調査日: 2026-07-06  
実測バージョン: `grok 0.2.82 (6d0b07d2de0f) [stable]`

## 結論

Grok Build を非対話で使うなら、`grok -p ... --output-format streaming-json` の `{"type":"end"}` が最も単純な done signal になる。

ここでの done は「Grok の1リクエスト/ターンが終了した」という意味。`stopReason` は正常系では `EndTurn`。

## vendor docs から確認したこと

- `-p` / `--single` は headless mode を起動する。
- output format は `plain`, `json`, `streaming-json`。
- `json` は完了後に `text`, `stopReason`, `sessionId`, `requestId` を含む単一JSONを出す。
- `streaming-json` は JSONL event stream。
- event type は `text`, `thought`, `end`, `error`。`max_turns_reached` や `auto_compact_*` もあり得るので、未知 type を許容して `type` で分岐する。
- `sessionId` は `--resume` に渡して継続できる。

## 実測

実行:

```bash
grok -p "Reply with exactly OK and nothing else." \
  --model grok-build \
  --effort low \
  --max-turns 1 \
  --output-format streaming-json \
  --no-auto-update
```

観測した主要イベント:

```jsonl
{"type":"thought","data":"..."}
{"type":"text","data":"OK"}
{"type":"end","stopReason":"EndTurn","sessionId":"019f37c1-e5f2-77d0-bcf1-8d5a1e3d7a65","requestId":"ec2219b0-b034-4bea-89de-8b0c0931186c"}
```

## 実装上の読み方

- `type == "text"` を応答として蓄積する。
- `type == "thought"` は必要な場合だけ別チャネルで記録する。
- `type == "end"` を done として扱い、`stopReason`, `sessionId`, `requestId` を保存する。
- `type == "error"` は failed として扱う。
- 未知の event type は無視または telemetry に記録し、parser を壊さない。

## aiterm への含意

既存の `grok_agent` はTUIを永続PTYに起動する設計だが、done検知だけを考えるなら headless streaming JSON の方が堅い。

候補:

- `grok_agent(mode: "tui")`: 既存通り。done は Stop hook bridge。
- `grok_agent(mode: "headless-json")` または `grok_run`: `streaming-json` を読み、`end` を待つ。

TUIとJSONLを同じAPIで扱うなら、内部 driver を分けて `done_event` を同じ形に正規化する。

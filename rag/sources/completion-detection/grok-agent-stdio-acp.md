---
title: "Grok agent stdio ACP as persistent structured agent protocol"
source_url: "local:~/.grok/docs/user-guide/15-agent-mode.md"
source_type: local_vendor_docs
fetched: 2026-07-06
topic: completion-detection
tags: ["grok", "acp", "json-rpc", "agent-stdio", "persistent-agent", "done"]
summary: "Grok の `grok agent stdio` は JSON-RPC/ACP で永続agent processを操作する。docs上は `session/prompt` response をターン完了境界として扱えるが、実装スパイクは未実施。"
relevance: "GrokをTUIではなく構造化プロトコルで永続操作する長期候補。PTY画面スクレイピングやHook設置を避けられる可能性はあるが、現時点では docs 確認のみ。"
evidence_level: "docs_only; unprobed"
chars: 2699
---

# Grok agent stdio ACP as persistent structured agent protocol

調査日: 2026-07-06  
参照バージョン: `grok 0.2.82 (6d0b07d2de0f) [stable]` bundled docs

## 結論

Grok Build を「永続する別AI」として扱うなら、TUIより `grok agent stdio` が構造的に強い可能性がある。これは ACP (Agent Client Protocol) の JSON-RPC server として Grok を起動し、`session/new` / `session/prompt` / `session/update` でやり取りする。

ただし、この調査は bundled docs の確認までで、実装スパイクは未実施。現時点では MVP の前提にしない。

done は画面ではなく、`session/prompt` request に対する JSON-RPC response をターン完了境界として扱える。途中経過は `session/update` notification で受ける。

## vendor docs から確認したこと

- `grok agent stdio` は persistent process として起動する。
- transport は stdin/stdout の JSON-RPC。
- lifecycle は initialize -> session/new -> session/prompt -> session/update -> permission handling。
- `session/update` の `sessionUpdate` 値には `agent_message_chunk`, `agent_thought_chunk`, `tool_call`, `tool_call_update`, `plan` がある。
- 拡張メソッドは `x.ai/*` prefix。`initialize` response から利用可能メソッドを発見する前提。
- docs のサンプル client は `session/prompt` 送信後、`session/update` を読み続け、`data.result` が来たら final response として break している。

## done 判定の形

概念:

```text
client -> grok: {"jsonrpc":"2.0","id":N,"method":"session/prompt",...}
grok -> client: {"method":"session/update", ...}  # streamed updates
grok -> client: {"jsonrpc":"2.0","id":N,"result":...}  # this prompt turn done
```

この `id == N` の response を done とする。通知だけでは完了判定しない。

## aiterm への含意

ACP は PTY ではなく child process stdio を握る設計になる。`aiterm-mcp` の現在の価値である「1本の永続PTY」からは外れるが、「AIが必要に応じて他AIと会話する」目的にはむしろ自然な構造化プロトコル。

選択肢:

- 短期: 既存 `grok_agent` TUI + Stop hook bridge。
- 中期: headless streaming JSON driver。
- 長期: `grok_acp_agent` として `grok agent stdio` driver を追加し、`session/prompt` response を done とする。

## 未実測事項

- この調査では ACP client を実装して実行するところまでは行っていない。
- permission request / tool call approval の具体payloadは追加調査が必要。
- `session/prompt` の error response と cancellation の扱いは実装前にスパイクする。

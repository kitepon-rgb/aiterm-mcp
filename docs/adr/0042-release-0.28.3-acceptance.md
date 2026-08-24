# ADR 0042: release 0.28.3（state-root一本化）の公開受入

- Status: Accepted
- Date: 2026-08-24
- Release: 0.28.3

## 文脈

campaign 32（ADR 0036）のmaintenance queueに、stop hook 2本（claude/grok）とagent-sharedが
`uid()`／`runtimeStateBase()`をそれぞれ複製実装している重複が記録されていた。stop hookは
「内部moduleへ依存しない」設計のため、agent-sharedからのimportでは解消できなかった。

## 決定

node builtin（fs/os）だけに依存する最下層`src/state-root.ts`を新設し、`currentUid()`と
`runtimeStateBase()`の唯一の実装をここへ置く。agent-sharedはre-export（既存の消費importは
不変）、stop hook 2本はstate-rootを直接importする。stop hookのbuiltin-only依存の設計は、
state-rootがbuiltin依存だけであることで維持される。挙動・15-tool API・schema・受け皿の
state root配置（`aiterm-mcp-<uid>`）は不変。

## 受入証跡

- macOS full test 355 pass / 0 fail。
- release commit `24b8115`（0.28.3 bump一式）、main CI（4環境）`32675470468` success、
  tag CI／npm publish success（`gh run watch`でTAG_CI_GREEN確認）、
  Registry workflow `32675999886` success。
- GitHub Release v0.28.3＋MCPB添付、global install後のMCP initialize smokeでserverInfo 0.28.3。

# ADR 0047: Windows managed stateはpsmux namespaceと同じTMPDIRへ隔離する

- 日付: 2026-08-30
- 状態: Accepted

## Decision

Windows nativeで`TMPDIR`が設定されているprocessは、psmuxの`SOCKDIR`／namespaceだけでなくAiterm managed state rootにも同じ`TMPDIR`を使う。`TMPDIR`未設定の通常serverは従来どおり`os.tmpdir()`、すなわち通常の`%TEMP%\aiterm-mcp-0`を使う。POSIXの`XDG_RUNTIME_DIR`優先契約は変更しない。

test fixtureへ個別に`XDG_RUNTIME_DIR`を足すだけの修正は採らない。Aitermを隔離processで使う任意の入口が、PTYとmanaged metadataを同じ境界へ置くことを製品側で保証する。

## Reason

Windowsの`tmux-runtime.ts`は`TMPDIR`を最優先して`SOCKDIR`とpsmux namespaceを作る。一方、managed stateの`runtimeStateBase()`は`XDG_RUNTIME_DIR`が無ければ`os.tmpdir()`を使っていた。Windows Nodeの`os.tmpdir()`は`TMPDIR`を無視し`TEMP`を返す。

この不一致により、`core-tmux.test.mjs`等はpsmux serverだけを一時namespaceへ隔離し、agent metadataは実利用中の`%TEMP%\aiterm-mcp-0\agents`へ共有していた。隔離testの`killAll()`は一時psmux serverを終了した後、共有agent metadataを全削除する。本番Fableのpsmux sessionは別namespaceなので生存し、`aiterm-wait`／`agent_transcript`の相関だけが消えた。同じ現象を独立した2 sessionで実測した。

## Verification

- Windows child processで`TEMP=foreign`、`TMPDIR=isolated`、`XDG_RUNTIME_DIR`無しの場合、`runtimeStateBase()`は`isolated`を返す。
- foreign TEMPへ置いたmanaged metadataは、TMPDIR隔離childの`openSession()`→`killAll()`後もbyte-exactに残る。
- 隔離child自身のstate rootはTMPDIR配下にあり、`killAll()`で正常に空になる。
- 既存のWindows psmux長文／並行send、managed Stop hook、close／killAll cleanup回帰を維持する。

# agent launcher通常環境共有 characterization

実測日: 2026-08-04  
対象: Claude Code 2.1.221、Codex CLI 0.146.0、Grok Build 0.2.117

この記録は[ADR 0025](adr/0025-shared-agent-environment-and-lineage.md)の実装前characterizationである。
probeは通常homeとproject設定をread-onlyで観測し、認証・設定・MCP・plugin・historyを書き換えていない。

## Claude Code

- `--setting-sources user,project,local`は通常の3 scopeを明示的に読む。
- `--settings <file-or-json>`は追加settingsを読むため、aiterm所有のlaunch固有Stop hookだけを足せる。
- `--append-system-prompt`は既定system promptへ追加でき、通常のCLAUDE.md／settings／MCP／plugin／skillを
  置換せずsub-agent contextを伝えられる。
- `--session-id <uuid>`でvendor sessionをlaunch時に一意化できる。
- 通常transcriptには`assistant`の`stop_reason=end_turn`と、turn境界の`system`／
  `subtype=turn_duration`が残る。今回の移行ではdurable operation互換を維持するため、完了正本は
  通常settingsへ加算するlaunch固有Stop hookを使い続ける。
- `--setting-sources ''`とuser MCP snapshotは不要であり、削除対象である。

## Codex CLI

- 通常`CODEX_HOME`のまま起動すると、projectのhook trust UI、AGENTS.md、MCP初期化失敗を直接CLIと同じく
  表示した。launcherはこの通常挙動を隠してはならない。
- `-c developer_instructions=<text>`はmodel-visible promptへ独立したdeveloper contentとして追加された。
  `codex debug prompt-input`で比較すると、既存developer content 4件のbyte数・SHA-256はすべて不変で、
  launch固有19 bytesのcontentが1件だけ追加された。
- TUIのroot rolloutは起動時ではなく初回prompt送信時に作られる。`session_meta`は
  `originator=codex-tui`、`source=cli`を持つ。
- launch固有developer instruction markerはroot rolloutの先頭developer recordに残る。共有homeで
  複数sessionが同時に作られても、`originator`／`source`と一意launch markerの積でroot rolloutを束縛できる。
- `task_complete.turn_id`と最終assistant messageは束縛後のroot rolloutだけから読む。managed
  `CODEX_HOME`、config copy、auth symlink、agent definition snapshotは不要であり、削除対象である。

## Grok Build / Composer

- 通常環境の`grok inspect --json`は、このprojectでproject instructions 3件、agents 5件、hooks 15件、
  MCP 13件、skills 24件を発見した。現行fake `HOME`／managed `GROK_HOME`はこれらを落とす。
- `--rules <text>`は通常system promptへ追加rulesを加えられる。
- `--session-id <uuid>`は新規conversationのsession IDを一意に指定できる。
- 通常`GROK_HOME`のsession directoryには`events.jsonl`、`chat_history.jsonl`等があり、
  `events.jsonl`はturn終端を`type=turn_ended`として記録する。最終回答は同じsessionの
  `chat_history.jsonl`に`type=assistant`として残る。
- このためfake `HOME`、compat discovery無効化、managed Stop hookを廃止し、既知session IDの通常
  transcriptだけでcursor以後の完了と回答を相関できる。

## 共通lineage契約

- launcherは`role=subagent`、親session、depth、lineage、`delegation_allowed=true`を環境metadataと
  vendor-native追加instructionの両方へ同値で渡す。
- aiterm由来の親metadataが無い初段は親を`host-root`、depthを1とする。
- 子の環境を継承したstdio aiterm MCPから次を起動する時は、親を現在の
  `AITERM_AGENT_SESSION_ID`、depthを親+1とし、lineageへ新sessionを追記する。
- 再委譲は禁止しない。instructionは、必要な追加委譲を許可しつつ、同じ任務全体を同型agentへ
  反射的に丸投げしないことだけを要求する。

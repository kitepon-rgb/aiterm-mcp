# ADR 0048: Terminal transport does not own command policy

- Status: Accepted
- Date: 2026-08-31
- Decision owner: product owner

## Context

BellTeamの通常container bind mountでGrokを起動した時、Aiterm独自の祖先directory権限検査が
credentialをGrokへ渡す前に拒否した。また、監査用の検索commandに`DROP TABLE`という文字列が
含まれただけで、破壊command tripwireが端末への送信自体を拒否した。

どちらもAitermがtransportより上位のpolicyを推測した誤検知である。文字列の意味とcredentialの
利用可否は、実際に処理するshell、接続先、vendor CLIだけが正しく判断できる。

## Decision

1. `pty_send`の破壊command正規表現を、rtk変換前後とも削除する。`force`は非Claude agent sessionへの
   手動素送信を表す既存の操作modeとしてだけ残す。
2. Grok credentialのmode、owner、link count、symlink、ancestor、size、JSON内容、file種別を
   Aitermでは検査しない。継承した`GROK_AUTH_PATH`は空でない絶対pathかつ存在することだけ確認し、
   そのままGrokへ渡す。既定authが無い場合の`XAI_API_KEY`経路は維持する。
3. managed Claude内の`/login`と`/logout`をAitermでは拒否しない。session作成前の公式
   `claude auth status --json` preflightは、無認証session残骸を作らない外部境界確認として維持する。
4. 64KiB上限、control character整形、送信直列化、TUI ready／submit、operation digest、turn相関、
   schema検証はtransportと結果相関の責務なので維持する。
5. 本判断はADR 0020のDecision 5と、ADR 0034でGrok auth検査を撤去対象外とした例外を置き換える。
   過去ADRは当時の判断記録として書き換えない。

## Verification

- `npm run build`
- `node --test test/core-tmux.test.mjs test/core-agent.test.mjs test/launcher-structured.test.mjs test/repository-contract.test.mjs`
- `npm test`

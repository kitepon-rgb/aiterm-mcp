# 0003. Claude対話エージェント起動契約

## Context

ADR 0002はCodex／Grok／Composerの対話TUIをAiterm所有の永続PTYへ起動し、同じsessionを
`pty_read`／`pty_send`で継続操作する契約を定めた。一方、Claude Codeだけはlauncherを持たず、
Claude親から同providerのObserverを継続稼働させる公開経路が欠けていた。

`claude -p`をcompleted turnごとに起動する方式は、この欠落を解消しない。各requestが別process／
別contextとなり、利用者が見られる一つの対話session、同じObserverによる理解の蓄積、対話TUIの
回収・中断というAitermの価値を使わないためである。

## Decision

- 公開ツール`claude_agent`を追加し、Claude Codeの対話TUIを新しい永続PTYへ起動する。
- 起動後の操作は既存どおり`pty_read`／`pty_send`／`pty_key`（`C-c`）／`pty_close`を使う。同じ
  `session_id`へのfollow-upは同じClaude sessionへ届き、completed turnごとに別Claude processを
  起動しない。
- `agent_done:true`ではlaunch専用のmanaged settingsをAitermが生成し、通常のuser／project／local
  settings hookを継承しない。managed settingsが所有するStop hookだけでturn完了を通知する。
- Claude Stop payloadの`last_assistant_message`は、secure state root内のlaunch専用owner-only resultへ
  boundedに保存する。event JSONLには本文を含めず、`pty_read(agent_transcript:true)`だけが直近完了
  turnの本文を返す。Claudeのprivate transcript、debug log、内部RPCは読まない。
- Stop eventは`session_id`とlaunch identityへ相関し、stale／foreign／malformed eventを完了扱いしない。
  timeoutは失敗や再送へ丸めず、同じPTY sessionを残す。後着resultは
  `pty_read(agent_transcript:true)`でpromptを再送せず回収し、その後の新しいfollow-upだけを
  `pty_send(wait:"agent_done")`で送信する。
- `claude_agent(prompt=..., wait:"agent_done")`は、TUIが入力受付状態になった後に初回promptを送り、
  同じStop境界を待つ。readyを確認できない時はprompt未送信を明示し、sessionを残す。
- Claude CLIの導入・認証・model利用権は利用者責任とする。不在や不正引数はsession作成前にfail loud
  とし、`claude -p`、別provider、private protocolへfallbackしない。

## Observerとの責務境界

AitermはClaude対話sessionの起動・継続入力・完了観測・結果回収だけを所有する。Throughline、
Observer cursor、助言判断、Mailbox配送はObserver製品の責務であり、Aitermへ持ち込まない。

Observer側のSupervisorはAIではない。同じ`claude_agent` sessionへ新しいcompleted turnだけを投入し、
exact-onceとcrash recoveryを管理する。Observerの理解を保持する主体は、その永続Claude sessionである。

## Consequences

- 公開ツールはPTY 6 + agent launcher 4 + diagnostics 1 = 計11になる。
- Claude Observerだけでなく、一般のClaude Code対話作業も他vendorと同じAiterm操作モデルで扱える。
- managed settingsは通常Claude設定と意図的に分離される。通常hookを必要とする用途では
  `agent_done:false`を使うか、将来の明示契約を別ADRで設計する。
- 実Claude TUIのready marker、認証、Stop hook、初回／follow-up完了はlive H gateで一度だけ確認する。
  fixture成功をlive成功へ丸めない。

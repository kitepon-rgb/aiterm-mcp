# ADR 0045: agent ready gateは既知のblocking UIで即時に制御を返す

- 日付: 2026-08-29
- 状態: Accepted

## Decision

agent初回promptのready gateは、Codexのupdate・directory trust・hooks review・MCP/command approval、Claudeのproject trust・MCP consentを観測した場合、timeoutを待たず`ready:false`を返す。承認操作は行わず、sessionを維持し、0.29.0で定めた`initial_prompt=not_sent`の明示エラーへ直ちに流す。

通常の入力欄ready判定と11回連続安定確認は変更しない。Grok／Composer／Cursorへ未観測の文言を追加しない。
現在のidle composerがreadyなら、scrollbackに残った古いblocking UI文言よりready判定を優先する。

## Reason

LiveTRのWindows Peertable席で、Aitermがdirectory trust画面をready待ちのまま約60秒保持し、callerへ`not_sent`を返す前後にCodex TUIが終了した。callerがtrustへ応答する時点ではGit Bashへ戻っており、席を構成できなかった。Macのtrust済みcwdではblocking UIを踏まないため再現しなかった。

blocking UIは入力待ちであり、時間経過でreadyにはならない。待つことに価値がなく、callerが明示応答するために制御を返すのが正しい。

## Verification

- blocking UI 4種は1 sample・sleep 0で`ready:false`。
- 通常readyは既存の安定sample契約を維持。
- Windows Peertable Codex席でroom登録とbrief dispatchまで確認する。

## 2026-08-30 follow-up: Claude workspace trustの`❯`をcomposerと区別する

Claude Code 2.1.251のworkspace trust UIは、`No, exit`／`Yes, I trust this folder`の選択カーソルにもcomposerと同じ`❯`を使う。従来の`Claude Code`＋行頭`❯`だけのready判定は、このmenuを11回連続readyと数え、初回promptを現在選択中の`No, exit`へ貼ってEnterを送る。その結果Claudeが終了しても、Aitermは`initial_prompt=pending`とevent cursorを成功形で返していた。

readyよりaction-requiredを先に評価する変更は採らない。scrollbackの古いblocking UIより現在のidle composerを優先する既存契約を壊すためである。Claude画面内の最後の行頭`❯`だけを調べ、その行が番号付きまたは番号なしのworkspace trust選択肢ならreadyと認めない。古いtrust menuの下に現在composerが描画されている場合は、最後のmarkerがcomposerなのでreadyを維持する。

実画面fixtureは1 sample・sleep 0で`ready:false`、古いtrust表示＋現在composerは`ready:true`とする。fake Claude trust TUIのprompt付き起動は成功receiptを返さず、sessionを`initial_prompt=not_sent`で残し、event/resultを空のまま保ち、prompt本文を画面へ送らないことを統合回帰で固定する。

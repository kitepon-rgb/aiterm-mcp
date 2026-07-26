# ADR 0017: dispatch案内を「投げっぱなし」正典へ反転し、完了待ちの起動形を親ホスト別に名指しする

日付: 2026-07-26

## Status

Accepted。pure gateとsmoke gateはgreen。clientInfo実測と実codex子のE2E receiptで配線を確認した。

## Context

オーナー報告: Claudeからaiterm経由でsub agentを呼ぶ時、非ブロックdispatchが製品の要であるにも関わらず、
親が完了までブロックする使い方に流れる事例の方が多い。

現行案内を読むと原因は3点ある。

1. すべてのdescriptionが「dispatchは即返る」の直後に「完了通知は aiterm-wait を…」と続き、
   dispatch→waitが一続きの手順に見える。設計は非同期なのに文型が同期のままで、
   「待たなくてよい」という許諾が一言もない。
2. 起動形の指示が「ホストのバックグラウンドタスクとして実行」という抽象名詞だけ。
   具体形を知らない親は通常のforeground実行へ落ち、既定600秒ターンを塞ぐ。
3. 親が待たずに済む状態を表す語彙が製品側に無い。

論点として「子の答えに依存する時は親が待つのが正しい」を検討したが、オーナー裁定で棄却した。
このハーネスは背景プロセスのexitで親を再invokeするため「待つ以外できない」局面が存在しない。
子が1体でも親は制御を返すべきで、並行とは子同士だけでなく親と子の並行を指す。
待つこと自体は正しく、待つ主体が親だと誤りである。

## Decision

1. dispatch／起動時prompt送信後の案内は、第一文で「投げっぱなしでよい＝ここで待たない」を宣言する。
   待ち方は後段に置き、foreground実行の禁止を案内本文へ含める。
2. 完了待ちの起動形は、親ホストが分かる時はそのホストの実際の呼び出し形を名指しする。
   `claude-code` には `Bash(command: ..., run_in_background: true)` を出す。
3. 親ホストはMCP initializeの`clientInfo.name`から取る。取れない時は汎用の非ブロック指示へ落ち、
   機能・schema・完了判定は一切変えない。
4. tool descriptionは`registerTool`時＝initialize前に固定されるためホストを名指しできない。
   descriptionは汎用の断定形を持ち、ホスト別の具体形はreceipt側が所有する。
   descriptionの動的差し替えは行わない。
5. 未完了sessionへ触れた時の復旧案内も同じ文型へ揃える。取りこぼしゼロの`--cursor 0`は維持する。
6. `aiterm-wait`の既定timeout・exit契約・outcome語彙・公開schemaは変更しない。
   待つ主体はwaiterプロセスであって親ではない、が本ADRの分界である。

## 非目標

- `--timeout 0`の一発照会に`running` outcomeを足す件は別タスク。公開schemaのenum追加は
  消費者のexhaustive switchを壊すため、本文面変更へ混ぜない。
- 「複数子へ同時dispatchして回収する」使い方の型をdescriptionへ書くことはしない。
  並行以外あり得ない以上、型として教えるものではなく既定の文型へ埋め込むものである。

## Acceptance

- pure testで、claude-code親の名指し形、未知/未申告親の汎用形、案内1行目の宣言、
  待ちコマンドのcursor整合、foreground禁止、復旧案内の`--cursor 0`を固定する。
- smoke testで、dispatch系5ツールのdescriptionが非ブロック規範を持ち、
  旧抽象文へ戻らないことを固定する。
- 実clientInfoは実物のClaude Codeから採取して確認する（推測で決めない）。
- 実vendor子で launch receipt → 案内どおりの完了待ち → done → 回収 → close を通す。
- receiptへraw prompt、PTY本文、credential、絶対pathを新たに載せない。

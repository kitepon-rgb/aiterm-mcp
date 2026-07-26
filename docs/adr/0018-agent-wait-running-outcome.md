# ADR 0018: 待たない照会の未完了を running として分離し、timeout と1語に潰さない

日付: 2026-07-26

## Status

Accepted。CLI／observe の focused gate と full regression はgreen。

## Context

`aiterm-wait --timeout 0` は以前から「待たずに一度だけ観測する照会」として動いていた。
deadline が即時到達するため event file を1回走査して返る。

問題は返る語だった。未完了は `timeout` を返し、exit は 3 になる。
`timeout` は「既定600秒待って終わらなかった」を指す語であり、0秒で聞いた時の
「まだ走っている」と同じ語に潰されていた。受け取る親から見ると、軽い照会の答えが
失敗・異常として届く。結果として「投げて、自分の作業をして、気が向いたら一度だけ様子を見て、
まだなら作業へ戻る」という往復が製品の語彙に存在しなかった。

[ADR 0017](0017-non-blocking-dispatch-guidance.md) で親のブロックは案内から排除したが、
押し込み機構を持たない親（背景プロセスの終了で再呼び出しされないホスト）には
「待つ」か「聞く」しか手段がなく、その「聞く」が異常系にしか見えないままだった。

## Decision

1. `AgentWaitObservation.outcome` に `running` を追加する。意味は「まだ終わっていない」。
2. `running` を返すのは `timeout=0`（待たずに一度だけ観測する照会）の未完了だけとする。
   1秒以上を指定した待機の未完了は従来どおり `timeout` で、待ち方の意味は変えない。
3. `running` の exit code は 5 とする。`done`=0 / `timeout`=3 / `closed`=4 / エラー=1 は不変。
4. outcome → exit code の対応表は全 outcome を型で網羅強制する。語を足して表を直し忘れると
   `undefined` から exit 0 になり、未完了が完了として親へ届く。この取りこぼしを
   compile error で止める（実際に不足させて型エラーになることを確認済み）。
5. `closed`（観測中に session が消えた）と、未知 session のエラーは `running` へ倒さない。
   打ち間違えた session 名が永久に「まだ走っている」と報告されると、親が存在しない子を待ち続ける。
6. 照会は receipt・tool description で宣伝しない。ADR 0017 で排した「親が子のお守りをする」
   誘惑を自分で戻さないため、押し込み機構を持たない親向けの逃げ道として README にだけ書く。
7. MCP の公開 tool と schema は変更しない。影響は `aiterm-wait` の receipt だけに閉じる。

## 版番号

`aiterm.agent-wait-result.v1` の outcome 語彙が増えるため patch では出さない。
受け取り側が「語はこの3つで全部」という前提で分岐を書いている場合、4つ目はどの枝にも当たらない。
版番号の真ん中を上げて（0.19.3 → 0.20.0）、番号自体を「自分の分岐を見直せ」という合図にする。

## Acceptance

- `--timeout 0` の未完了が `running` / exit 5 で返ることを固定する。
- `--timeout 0` でも完了済みは `done` / exit 0 で返ることを固定する。
- 1秒以上の待機の未完了は `timeout` / exit 3 のままであることを固定する。
- 未知 session が `running` にならないことを固定する。
- exit code が全 outcome で相異なり、`done` 以外に 0 を割り当てないことを固定する。
- receipt・tool description に照会の案内が現れないことは ADR 0017 の smoke gate が引き続き担う。

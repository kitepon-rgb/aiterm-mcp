# codex_agent prompt / agent_done UX hardening plan

> **2026-08-03 superseded note**: この文書の`agent_done:true`、`wait:"agent_done"`、Codex Stop hook、
> `agent_timeout`はv0.9〜v0.10当時の履歴であり、現行APIではない。現行launcherは常にmanaged、sendは
> 非ブロックdispatch、完了通知は`aiterm-wait --cursor`で受ける。Codexの完了正本はroot rollout
> transcriptの`task_complete.turn_id`であり、設計は[ADR 0022](adr/0022-codex-rollout-completion.md)を正とする。

Date: 2026-07-09
Status: Historical implementation record; current completion contract is superseded as noted above

## Goal

`codex_agent(prompt=...)` を、長文・日本語・複数行 prompt でも shell command line 由来の崩れを見せず、初回 prompt の完了境界も `agent_done` として明確に扱える状態にする。

初期対象は `codex_agent`。`grok_agent` / `composer_agent` は同一実装を機械的に広げず、vendor ごとの TUI 入力実測と smoke test を通した後に対応する。

## Implementation Result

2026-07-09 に Codex 初期対象を実装した。

- `codex_agent(prompt, agent_done:true, wait:"agent_done")` は prompt を shell command line へ載せず、TUI ready 後に初回 prompt を送る。
- 単一行、長い日本語、複数行日本語の実 Codex smoke で、Stop hook event、expected marker、`is_complete=True via agent_done vendor=codex` を確認した。
- `prompt + wait:"none"` は初回 prompt を送った後 `initial_prompt=pending` を返し、完了前 follow-up を拒否する。
- TUI ready failure は prompt を送らず `initial_prompt=not_sent` を返して session を残す。
- wait timeout は `initial_prompt=pending` と `is_complete=False via agent_timeout` を返し、成功扱いしない。
- 通常 `pty_read` は agent 補助 metadata を出すが、stale Stop hook を `is_complete=True` に昇格しない。
- Grok/Composer の同 route は実測時に OAuth browser approval 画面で止まり、`initial_prompt=not_sent` で prompt 未送信を確認した。ログイン承認後の再 smoke を Phase 6 に残す。

## Report Verification

ユーザー報告の真偽を、現行実装、既存 docs、controlled probe、aiterm 上の Codex、サブエージェントで確認した。Oracle は dry-run まで通ったが live consult は attachment upload timeout で完了していないため、採用証跡から外す。

| 報告 | 判定 | 根拠 | 対応方針 |
| --- | --- | --- | --- |
| 長い日本語 prompt で TUI 上の入力/表示が崩れる | 表示崩れは再現。実際に Codex へ渡らないかは未確定 | `openAgent(prompt)` は prompt を shell の単一引用符引数として起動コマンドへ埋め込み、`tmux send-keys -l` で送る。`CODEX_BIN=/bin/echo` の controlled probe では複数行日本語 prompt は最終 argv として保持されたが、画面には `>` continuation と重複に見える echo が出た | prompt を shell command line に載せない route へ寄せる |
| `pty_send` で状態確認を送ると崩れた入力と混ざり syntax error になった | 直接再現は未実施。起こり得る | `codex_agent` は起動コマンド投入直後に戻る。初回 prompt 処理中/起動途中/continuation 表示中に後続入力を送ると、shell または TUI の現在状態へ混入し得る。現行 metadata はこの危険を明示しない | 初回 prompt state を metadata と待機 route で明示し、確定的に危険な状態では送信前に拒否する |
| `agent_done:true` でも起動時 prompt の完了待ちが分かりにくい | 確認済み | `codex_agent` schema には `wait` が無い。`openAgent` は起動した旨だけ返す。`sendAndWaitAgentDone` は `initial_prompt` が未完了なら送信前に拒否する | launcher に初回 prompt 専用の wait route を追加する。ただし既存 `sendAndWaitAgentDone` の単純再利用はしない |
| `Stop hook (stopped)` が見えても `is_complete=False via nested` になる | 確認済み | 通常 `pty_read(wait:true)` は `waitCompletion` の dead/mark/until/quiescent/nested だけを見る。agent event file は通常 read の completion 判定に使わない。Codex TUI は前面が shell ではないため nested False になる | `is_complete` とは別に agent event metadata を返す。通常 read で stale event を completion に昇格しない |
| TUI 出力が noisy で最終回答だけ取りにくい | 確認済み | `pty_read(full:true)` / `screen:true` は端末ログ/画面を読む。hook wrapper は Codex payload の `last_assistant_message` を保存していない | 初期実装では扱わない。最終メッセージ API は既存方針と衝突するため別 ADR/別フェーズへ分離する |

Controlled probe excerpt:

```text
bash-3.2$ '/bin/echo' 'NoveLore リポジトリで...
> 重点:
> - 現行 graph_upsert inputSchema と必須/任意の差分
...
NoveLore リポジトリで...
重点:
- 現行 graph_upsert inputSchema と必須/任意の差分
...
```

これは「prompt が必ず失われる」証拠ではない。一方で、AI が読む画面としては壊れて見えるため、現行 UX は不十分。

## Adversarial Verification

2026-07-09 に計画書を以下で敵対的検証した。

- Oracle MCP: 添付 bundle の dry-run は成功したが、live consult は attachment upload timeout で完了しなかった。Oracle 由来の指摘は採用せず、失敗として記録する。
- aiterm `codex_agent` session `plan_refute_aiterm`: prompt なし起動後、`pty_send(wait:"agent_done")` で短い ASCII review prompt を送り、Stop hook 完了を確認した。
- Subagents `Darwin` / `Einstein`: 実装経路、API/UX 境界、既存 docs との衝突を分担して検証した。

採用する blocker:

- `sendAndWaitAgentDone()` は初回 prompt route に単純再利用できない。冒頭で `bindCompletedInitialPrompt()` を呼ぶため、`initial_prompt=true` のまま入ると送信前に拒否される。
- launcher の `wait:"agent_done"` は `agent_done:true` と明示的に結び付ける必要がある。暗黙に managed hook / managed home を有効化しない。
- 複数行 prompt の TUI 直接投入は未検証。acceptance は「直接投入できること」ではなく、「直接投入 smoke に通る、または secure instruction file route に切り替わること」にする。
- `last_assistant_message` を通常 event に保存して final answer API を作る案は、`docs/04_agent-done-plan.md` の既存方針と衝突する。さらに hook event line の 64 KiB 上限と privacy surface を広げるため、初期実装から外す。
- 通常 `pty_read` に出す agent event は、その read/input に帰属する completion ではない。`agent_done_detected` のような強い名前を避け、`agent_event_seen` と `completion_attribution=none` を明示する。
- prompt を TUI 後送する場合、TUI 作成後の ready 失敗、送信失敗、wait timeout で session を残すか閉じるかを API として固定する必要がある。
- prompt 送信は shell command ではないため、destructive command gate と同じ意味で扱わない。内部 prompt route は terminal control sanitization と destructive gate の責務を分ける。

棄却する懸念:

- 「shell quoting で日本語 prompt が必ず失われる」は証拠不足。controlled probe では argv としては保持された。問題は表示/観測 UX と後続入力混入 risk。
- `Stop hook (stopped)` を見た通常 `pty_read(wait:true)` を `is_complete=True` にする案は危険。stale event の帰属を誤るため採用しない。
- managed `CODEX_HOME` が user-level vendor hook file を破壊する懸念は現行実装には当たらない。通常 hook file は編集しない。
- launcher に optional `wait` を足すこと自体は additive にできる。条件は default `wait:"none"`、`wait:"agent_done"` では `agent_done:true` 必須、失敗時 session semantics の明文化。

## Design Direction

### 1. 起動時 prompt を shell command line へ埋め込まない

現行:

```text
CODEX_HOME=... codex ... '<user prompt>'
```

問題:

- 複数行 prompt では shell continuation prompt `>` が画面に出る。
- 起動コマンド echo と TUI/出力が混ざり、AI が「壊れた」と判断しやすい。
- 起動直後に後続入力を送ると、shell/TUI のどちらへ入ったかが分かりにくい。

採用方針:

1. launcher はまず prompt なしで vendor TUI を起動する。
2. TUI ready gate を通す。
3. 初回 prompt 専用 helper を使って prompt を送る。
4. `wait:"agent_done"` の場合は、初回 prompt 用に設定した event boundary 以降の Stop hook だけを待つ。

重要: 既存 `sendAndWaitAgentDone()` はそのまま使わない。初回 prompt は `initial_prompt` state、destructive gate、event boundary が後続 `pty_send` と異なるため、専用 helper を作る。

### 2. prompt transport は実測ゲートで決める

第一候補は TUI 入力欄への直接投入。ただし、複数行を直接貼った時に vendor TUI が途中改行を submit と解釈する可能性がある。

実装前ゲート:

- Codex TUI に対して、単一行、長い日本語、複数行日本語の 3 ケースを実測する。
- 複数行が 1 turn として処理されることを Stop hook event と画面で確認する。
- 複数 turn に割れる、または入力欄が不安定なら、直接投入を採用しない。

fallback は secure instruction file route とする。

- instruction file は aiterm managed state 配下に作る。
- file mode は 0600、親 directory は 0700。
- symlink/hardlink を拒否し、no-follow 系の既存安全方針に合わせる。
- TUI へ送るのは短い ASCII 指示と file path だけにする。
- cleanup policy は「done 後に削除」または「debug 用に保持」を option で固定し、黙って残さない。

### 3. launcher に初回 `wait:"agent_done"` を追加する

候補 schema:

```ts
codex_agent({
  prompt?: string;
  agent_done?: boolean;
  wait?: "none" | "agent_done";
  timeout?: number;
  screen?: boolean;
  lines?: number;
})
```

挙動:

- default は `wait:"none"`。
- `wait:"agent_done"` は `prompt` あり、かつ `agent_done:true` の時だけ有効。暗黙に hook を有効化しない。
- `prompt` なし + `wait:"agent_done"` は明示エラー。
- `prompt` あり + `wait:"none"` は TUI ready と prompt 送信までは行い、初回 prompt の完了は待たない。戻り値には `initial_prompt=sent` または `initial_prompt=pending` と次に使う操作を明記する。
- `prompt` あり + `wait:"agent_done"` は初回 prompt の Stop hook まで待ち、`pty_send(wait:"agent_done")` と同種の suffix を返す。
- 初回 prompt の完了後は `initial_prompt_state=done` とし、後続 `pty_send(wait:"agent_done")` は従来通り使える。

互換性:

- `prompt` なしの launcher は従来通り、TUI を起動して `session_id` を返す。
- `prompt` ありの launcher は shell argv route をやめるため、現行より TUI ready 分だけ戻りが遅くなる可能性がある。README に明記する。
- この機能は `codex_run` の復活ではない。永続 TUI session は残り、後続操作は `pty_read` / `pty_send` で行う。

### 4. TUI 作成後の失敗 semantics を固定する

失敗を隠さないため、session の扱いを固定する。

- session 作成前の検証失敗: session は作らない。
- launch command 投入失敗: 可能なら session を閉じ、残骸を残さない。
- TUI 作成後、prompt 送信前の ready failure: prompt は送らず、session は残し、戻り値に `session_id` と `initial_prompt=not_sent` を明記する。
- prompt 送信後の wait timeout: session は残し、戻り値に `initial_prompt=pending`、screen/tail、timeout metadata を返す。
- prompt 送信後に Stop hook event が取れた場合だけ `is_complete=True via agent_done` を付ける。

`frontend` heuristic は hard rejection の根拠にしない。送信前拒否に使うのは `initial_prompt pending`、wait lock、TUI ready false など確定状態だけにする。

### 5. `pty_read` に agent 状態 metadata を出す

通常の completion 判定は維持する。`nested` を安易に True へ変えない。

追加する metadata の候補:

```text
[agent vendor=codex initial_prompt=done agent_event_seen=true completion_attribution=none frontend=agent_tui]
```

推定項目:

- `agent_session`: true/false
- `vendor`: codex/grok/composer
- `initial_prompt`: none/not_sent/sent/pending/done/failed
- `agent_event_seen`: true/false
- `last_turn_id`: known なら表示
- `completion_attribution`: none / current_wait
- `frontend`: shell / shell_continuation / agent_tui / unknown

注意:

- 通常 `pty_read` の `agent_event_seen=true` は「この read が完了した」意味ではない。
- `frontend` は推定値。`pane_current_command` と screen heuristic から出すため、確証扱いしない。
- shell continuation と断定できる時だけ警告を強める。

### 6. Stop hook と `is_complete` を混同しない

`is_complete=True via agent_done` は、`pty_send(wait:"agent_done")` または launcher の `wait:"agent_done"` が、その入力に対応する event boundary を待った時だけ付ける。

通常 `pty_read(wait:true)` に stale な Stop hook を見つけただけで `is_complete=True` にしない。これは「どの入力に対応する done か」を取り違える危険がある。

通常 read では以下のように別 metadata にする。

```text
[agent vendor=codex agent_event_seen=true completion_attribution=none turn_id=...]
[is_complete=False via nested]
```

### 7. 最終メッセージ取得 API は初期実装から外す

Codex Stop hook payload には実測上 `last_assistant_message` がある。ただし現行 `docs/04_agent-done-plan.md` は、hook payload の最終回答を通常保存せず、正本扱いしない方針を取っている。

この計画の初期実装では、最終メッセージ専用 API を作らない。

将来扱う場合の条件:

- ADR または `docs/04_agent-done-plan.md` 更新で方針変更を明示する。
- event JSONL 行に全文を入れない。event には pointer/size/status だけを入れ、本文は 0600 の別 file に保存する。
- size limit、truncation、欠落時の明示 metadata、privacy surface を仕様化する。
- TUI 解析 fallback で成功扱いしない。

## Implementation Order

この順序で進める。前段の exit criteria を満たすまで次段に進まない。

### Phase 0. Baseline and current-failure lock

- [x] `npm test` を green で取る。既存赤があれば、この計画の実装前に原因を切り分ける。
- [x] `CODEX_BIN=/bin/echo` の controlled probe を characterization test にする。
- [x] 現行 route では複数行日本語 prompt が shell continuation 表示を出すことを固定する。
- [x] 現行 route でも argv として prompt が保持されるケースがあることを固定し、「必ず prompt loss」と誤診しないようにする。

Exit criteria:

- 現行問題が「データ喪失確定」ではなく「shell command line 表示/観測 UX と後続入力混入 risk」としてテストで説明できる。
- `npm test` が green、または既存赤の原因とこの作業への影響が明文化されている。

### Phase 1. Prompt transport gate

- [x] 実 Codex TUI に prompt なしで起動する smoke を用意する。
- [x] TUI ready 後に単一行 prompt を送って 1 turn の Stop hook を確認する。
- [x] TUI ready 後に長い日本語 prompt を送って 1 turn の Stop hook を確認する。
- [x] TUI ready 後に複数行日本語 prompt を送って、複数 turn に割れないか確認する。
- [x] direct TUI route が不安定なら、secure instruction file route を採用する決定を docs に追記する。実測では Codex direct TUI route が通ったため fallback は採用しない。

Exit criteria:

- direct TUI route を採用できるか、secure instruction file route に切り替えるかが決まっている。
- どちらの route でも、prompt が shell command line に載らない実装方針になっている。

### Phase 2. State model and API contract

- [x] `initial_prompt` boolean を `none/not_sent/sent/pending/done/failed` の state として扱う設計にする。
- [x] `codex_agent` launcher schema に `wait`, `timeout`, `screen`, `lines` を追加する。Grok/Composer には post-OAuth smoke まで公開しない。
- [x] `wait:"agent_done"` は `prompt` + `agent_done:true` の時だけ許可する validation を入れる。
- [x] `prompt` なし + `wait:"agent_done"` と `agent_done:false` + `wait:"agent_done"` は送信前エラーにする。
- [x] `prompt + wait:"none"` の戻り値に `initial_prompt` state と次操作を出す。

Exit criteria:

- public API の組み合わせ制約が MCP schema test と behavior test で固定されている。
- `agent_done:true` を暗黙に有効化する route が存在しない。

### Phase 3. Initial prompt helper

- [x] `openAgent` の launch と初回 prompt 送信を分離する async route を追加する。
- [x] 初回 prompt 専用 helper を作り、既存 `sendAndWaitAgentDone()` の単純再利用を避ける。
- [x] 初回 prompt helper は送信前 event EOF boundary を持つ。
- [x] prompt route では destructive command gate と terminal control sanitization を分ける。
- [x] TUI 作成後、prompt 送信前の ready failure では prompt を送らず、session を残して `initial_prompt=not_sent` を返す。
- [x] prompt 送信後の wait timeout では session を残し、`initial_prompt=pending` と timeout metadata を返す。

Exit criteria:

- 初回 prompt の送信、待機、timeout、ready failure が後続 `pty_send(wait:"agent_done")` と混線しない。
- prompt 本文に破壊的コマンド例が含まれても、prompt text として扱われる。

### Phase 4. Agent read metadata

- [x] `pty_read` に `agent_event_seen`, `completion_attribution`, `initial_prompt`, `vendor`, `last_turn_id` を追加する。
- [x] 通常 `pty_read(wait:true)` で stale Stop hook を見ても `is_complete=True` にしない。
- [x] `agent_done_detected` という強い名前は使わない。
- [x] `frontend` heuristic は metadata/warning に留め、hard rejection には使わない。

Exit criteria:

- `is_complete=True via agent_done` は、現在入力に対応する event boundary を待った route だけで出る。
- 通常 shell/SSH/REPL の completion semantics が変わっていない。

### Phase 5. Docs, regression, release gate

- [x] README / README.ja に launcher `wait:"agent_done"` の使い方と制約を反映する。
- [x] `docs/04_agent-done-plan.md` と ADR 0002 に、初回 prompt wait が `codex_run` ではなく永続 TUI の convenience route であることを反映する。
- [x] unit / tmux / MCP schema / real Codex smoke を追加する。
- [x] `npm test` を green にする。
- [x] 実 Codex smoke で `codex_agent(prompt, agent_done:true, wait:"agent_done")` の完了を確認する。

Exit criteria:

- docs と code の公開挙動が一致している。
- 回帰テストと real smoke が通っている。
- `last_assistant_message` 保存や final-message API が初期実装に混入していない。

### Phase 6. Grok/Composer follow-up

- [x] Codex 実装完了後に、Grok/Composer で同じ prompt transport smoke を別途行う。2026-07-09 の実測では OAuth browser approval 画面で ready=false となり、prompt 未送信の `initial_prompt=not_sent` を確認。
- [ ] Grok/Composer の browser approval 後に同じ prompt transport smoke を再実行する。
- [ ] Grok/Composer では `--verbatim` 付き shell argv route から TUI 後送 route へ変える影響を個別に確認する。
- [x] vendor ごとの挙動が揃わないため、公開 schema は Codex のみ初回 prompt wait 対応にし、Grok/Composer から `wait` / `timeout` / `screen` / `lines` を出さない。

Exit criteria:

- Grok/Composer は Codex 実装へ機械的に巻き込まれていない。
- 対応する場合は vendor 別 smoke が通っている。

## Implementation Tasks

- [x] Characterization: `CODEX_BIN=/bin/echo` で複数行日本語 prompt の現行 shell display 崩れをテスト化する。
- [x] Characterization: 実 Codex smoke で、単一行、長い日本語、複数行日本語を TUI 直接投入 route で試す。
- [x] Characterization: TUI 直接投入が複数 turn に割れないことを Stop hook event と画面で確認する。
- [x] Characterization: `pty_read(wait:true, screen:true)` が agent TUI で `nested` を返し得ること、agent metadata は completion と別表示になることを固定する。
- [x] Refactor: `openAgent` の起動と初回 prompt 送信を分離する async route を追加する。
- [x] Implement: 初回 prompt 専用 helper を追加し、既存 `sendAndWaitAgentDone()` の単純再利用を避ける。
- [x] Implement: `initial_prompt` を boolean ではなく state として扱えるようにする。
- [x] Implement: prompt route では destructive command gate と terminal control sanitization を分ける。
- [x] Implement: `codex_agent` launcher input schema に `agent_done`, `wait`, `timeout`, `screen`, `lines` の関係を明示する。
- [x] Implement: `wait:"agent_done"` は `prompt` + `agent_done:true` の時だけ許可する。
- [x] Implement: `prompt + wait:"agent_done"` で初回 prompt 完了まで待って返す。
- [x] Implement: `prompt + wait:"none"` の戻り値に初回 prompt state と正しい待ち方を明記する。
- [x] Implement: TUI ready failure / send failure / wait timeout の session semantics を実装する。
- [x] Implement: `pty_read` に `agent_event_seen` / `completion_attribution` / `initial_prompt` metadata を追加する。
- [x] Implement: shell continuation / agent TUI / unknown の軽量 frontend 推定を追加する。ただし hard rejection には使わない。
- [x] Defer: Codex `last_assistant_message` 保存と最終メッセージ取得 API は別 ADR/別フェーズへ分離する。
- [x] Docs: README / README.ja / `docs/04_agent-done-plan.md` / ADR 0002 を更新し、Grok/Composer の初回 prompt wait 未公開を明記する。
- [x] Tests: unit / tmux / MCP schema / real smoke を追加し、`npm test` を green にする。

## Test Requirements

- launcher schema: `wait`, `timeout`, `screen`, `lines` が `codex_agent` にだけ出る。`grok_agent` / `composer_agent` には出ない。
- launcher schema: `wait:"agent_done"` と `agent_done:true` の組み合わせ制約を `codex_agent` で固定する。
- behavior: `prompt` なし + `wait:"agent_done"` は送信せず明示エラー。
- behavior: `prompt` あり + `wait:"agent_done"` + `agent_done:false` は送信せず明示エラー。
- behavior: prompt 中に `rm -rf /` や SQL 破壊例が含まれても、prompt text として送信できる。
- behavior: terminal control sequence は prompt route の sanitizer で扱う。
- behavior: 複数行 prompt が複数 turn に割れない。割れる vendor では secure instruction file route が選ばれる。
- behavior: stale Stop hook event が通常 `pty_read(wait:true)` の `is_complete=True` にならない。
- behavior: no-prior-event / stale-event-before-boundary / current-event-after-boundary を分ける。
- behavior: TUI ready failure では prompt を送らず、session_id と `initial_prompt=not_sent` を返す。
- behavior: wait timeout では session を残し、`initial_prompt=pending` と timeout metadata を返す。
- regression: user-level vendor hook file を編集しない。

## Acceptance Criteria

- 長い日本語・複数行 prompt を `codex_agent(prompt, agent_done:true, wait:"agent_done")` に渡しても、shell continuation 表示を経由せず、最終結果に `is_complete=True via agent_done vendor=codex` が付く。
- 複数行 TUI 直接投入が不安定な場合、secure instruction file route に自動で切り替わり、複数 turn に割れない。
- `codex_agent(prompt, wait:"none")` の戻り値が、初回 prompt の state と次に取るべき操作を明示する。
- `wait:"agent_done"` は `agent_done:true` なしでは動かない。暗黙に managed hook を有効化しない。
- `pty_read(wait:true, screen:true)` は agent TUI で `nested` を返し得るが、別 metadata で `agent_event_seen` / `completion_attribution=none` / `initial_prompt` が分かる。
- 壊れた/曖昧な状態では、確定的に拒否できる条件だけ送信前に止める。heuristic は警告に留める。
- 初期実装では Codex 最終回答だけ取得 API を作らない。
- 通常 PTY、SSH、REPL の completion semantics は変えない。

## Risks

- TUI 入力欄への複数行貼り付けは vendor ごとに挙動が違う可能性がある。直接送信が不安定なら secure instruction file route へ切り替える。
- `prompt` あり launcher は shell argv route をやめるため、現行より戻りが遅くなる可能性がある。README で明示する。
- `frontend` 推定は誤判定し得る。確定情報として扱わず、警告/補助 metadata に留める。
- `last_assistant_message` は Codex hook payload の実測 field であり、将来消える可能性がある。初期実装では依存しない。
- secure instruction file route は file lifecycle と privacy surface を増やす。0600/0700、cleanup、no-follow を acceptance に含める。

## Non-goals

- 通常 shell/SSH/REPL の `nested` を True completion に変えない。
- stale Stop hook event を通常 `pty_read` の completion として扱わない。
- agent TUI の画面文字列だけを正本として final answer 抽出しない。
- user-level vendor hook file は引き続き編集しない。
- `codex_run` のような非対話 structured runner を aiterm 本体へ復活させない。

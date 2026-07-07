# AI CLI done 検知 実装計画

更新日: 2026-07-07  
状態: Codex/Grok/Composer の `*_agent(agent_done:true)` -> `pty_send(wait:"agent_done")` 実 smoke は成功。2026-07-07 の追加敵対的検証で、Grok の `GROK_HOME` 全体を aiterm 永続共有にする案は hook/config/session 汚染リスクが大きいため棄却し、per-launch isolated `GROK_HOME` を維持したまま OAuth `auth.json` と `auth.json.lock` だけを通常 Grok home と共有する方針へ修正した。`grok login` 後に Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke も通過し、login 再要求なしを確認した。同一 cwd で Codex/Grok/Composer を並列起動しても event は混線せず、普通PTYの Python REPL smoke も通過。さらに 2026-07-07 に `node dist/index.js` を実起動し、JSON-RPC `tools/call` 経由で `codex_agent` / `grok_agent` / `composer_agent` + `pty_send(wait:"agent_done")` と普通PTY Python REPL が通ることを確認した。リリース前 smoke で「起動直後に送ると vendor TUI の入力受付前に文字が落ち、hook が来ず `agent_timeout` になる」ケースを再現したため、未 bind の初回 `pty_send(wait:"agent_done")` に vendor TUI ready gate を追加し、未 ready なら送信前エラーにする実装へ修正した。ready gate 実装後は明示的な `pty_read` ready 待ちなしの起動直後即送信 smoke も通過した。CI 系の agent_done 負系/race/security/schema テストは、古い event、初回 prompt done、TUI ready gate、同時 wait、即時 event、`launch_id`/`vendor_session_id` 不一致、bind 後の vendor_session_id 欠落、bind 前 vendor_session_id 混在、初回 prompt pending、partial/malformed/oversized JSONL、done 後 offset consume、wait file lock、wait 中 close/killAll 拒否、hook no-env、存在しない `XDG_RUNTIME_DIR` fallback、path injection、hard link 拒否、secure root、core cleanup root symlink no-follow、緩い state root での stale metadata cleanup、screen settle、MCP schema、managed home cleanup まで追加済み。`npm test` は 167/167 pass。

## 0. 位置づけ

Codex / Grok Build(Grok) / Grok Build(Composer) の対話 TUI を永続PTYで扱う現行方針は維持する。
本計画は、AI CLI セッションに入力したあと、画面ポーリングや静止推測ではなく vendor hook の turn done を境界にして、境界後の端末観測結果を `pty_send` の返り値として返すための計画。

敵対的検証と Phase 0 smoke の結果、初期計画から次を修正した。

- MVP は全 vendor 同時対応ではなく、まず Codex 1本の最小縦断で通す。
- `codex_send` / `grok_send` / `composer_send` や `codex_run` / `grok_run` は作らない。
- user-level hook の自動 merge を MVP 第一候補にしない。
- `AITERM_AGENT_EVENT_FILE` のような任意 path env を hook wrapper に信じさせない。
- `last_seen_event_offset` ではなく、`pty_send` 送信直前の event file EOF を現ターン境界にする。
- `core.send` は同期関数のまま維持し、待機は別の async wrapper に分離する。
- Codex は aiterm の tmux/openAgent 相当経路でも Stop hook と `AITERM_AGENT_*` env が届くことを実測した。
- ただし Codex Stop hook は同居 hook が `decision:"block"` を返すと同じ `turn_id` のまま継続する。bridge が初回 Stop を見ただけで done と呼ぶ設計は禁止する。
- Codex MVP は managed `CODEX_HOME` で Stop chain を aiterm が単独所有する route を採用した。既存 `~/.codex/hooks.json` は変更しない。2026-07-07 の追加 hardening で、通常 Codex home の広い symlink は廃止し、managed home へ持ち込む通常 home 側エントリは `auth.json` symlink と `config.toml` copy に限定した。
- Codex TUI は literal text 投入直後の Enter を取り落とすことがある。`wait:"agent_done"` 経路では text と submit Enter を分離し、短い delay を挟む。
- Grok Build(Grok) / Grok Build(Composer) の TUI Stop hook は実測で発火した。payload は同型だが model id は入らないため、aiterm 側の `kind` metadata で区別する。
- `CODEX_HOME` / `GROK_HOME` の temporary home + auth symlink だけでは採用不可。Codex は `auth.json` symlink + `config.toml` copy + aiterm-owned `hooks.json` の allowlist route を採用し、通常 home のその他 state/cache/session entry は managed home へ symlink しない。
- Grok/Composer は `GROK_HOME` 全体共有ではなく、per-launch isolated `GROK_HOME` と fake `HOME` を維持する。共有対象は OAuth credential と lock file に限定し、通常 `grok` CLI と同じ `auth.json` / `auth.json.lock` を見る形にする。

根拠資料:

- `rag/briefs/agent-cli-done-detection.md`
- `rag/sources/completion-detection/agent-cli-done-phase0-smoke-2026-07-07.md`
- `rag/sources/completion-detection/codex-cli-stop-hook.md`
- `rag/sources/completion-detection/grok-cli-stop-hook.md`
- `rag/sources/completion-detection/grok-headless-streaming-json-end.md`
- `rag/sources/completion-detection/grok-agent-stdio-acp.md`
- `docs/adr/0002-agent-launcher-tools.md`

確度:

- Codex: `codex exec --json`、直接 TUI、aiterm `openAgent` 相当の tmux 経路で Stop hook 発火を実測済み。hook trust / project trust の条件も実測済み。
- Codex: 既存 Stop hook 同居時の continuation は実測で危険確定。co-located hook を許す設計では初回 Stop を final done と扱えない。
- Codex: 2026-07-07 実装 smoke で、`Reply exactly OK and nothing else.` に対し `OK` と `is_complete=True via agent_done vendor=codex` を実測済み。
- Grok: headless `-p --output-format streaming-json`、headless Stop hook、TUI Stop hook を実測済み。managed `GROK_HOME` + fake `HOME/.grok -> GROK_HOME` route で hook/plugin 混入を抑え、OAuth `auth.json` / `auth.json.lock` を通常 Grok home と共有する実装で実 TUI smoke まで通過。
- Composer: TUI Stop hook は実測済み。実装は Grok payload + `kind:"composer"` metadata で通し、実 TUI smoke も通過。
- Grok ACP: vendor docs 確認のみ。実装スパイク未実施。

## 1. 目的

目的はひとつ。

**永続PTYという外部APIを保ったまま、AI CLI セッションだけ完了境界を vendor hook の turn done に差し替え、done後の画面/出力を `pty_send` の返り値で返す。**

これにより、呼び出し側AIは以下の無駄をしなくてよい。

- `pty_send` 後に `pty_read` を繰り返して「終わったか」を探す。
- TUI画面の文言や静止時間から done を推測する。
- Codex/Grok/Composer ごとに別の送信ツールを覚える。

## 2. 非目的

- `codex_send` / `grok_send` / `composer_send` のような専用送信ツールは作らない。
- `codex_run` / `grok_run` のような structured run tool は、この計画の MVP では作らない。将来の別レーン候補として残す。
- AI CLI の最終回答を hook payload から抽出して正本扱いしない。
- done を「タスク成功」とは扱わない。done は「そのAI CLIの1ターンが終了した」だけ。
- SSH / docker / REPL / DB shell など普通の対話端末を AI CLI と同じ done hook で扱わない。
- MVP で `wait:"auto"` は公開しない。
- user-level vendor hook を暗黙に書き換えない。
- hook wrapper で任意ファイルパスを env から受け取って書かない。

## 3. 公開API

### 3.1 ツール表面

公開ツールは増やさない。

- 起動: `codex_agent` / `grok_agent` / `composer_agent`
- 入力: `pty_send`
- 観測: `pty_read`
- キー操作: `pty_key`
- 終了: `pty_close`

`pty_send` に任意の wait 指定を追加する。

MVP schema:

```ts
wait?: "none" | "agent_done";
timeout?: number;
screen?: boolean;
lines?: number;
```

既定は `wait: "none"` とし、既存挙動を壊さない。

既存の `raw` は「送信前サニタイズを無効化する」意味のまま維持する。返り値を raw にする意味へ流用しない。返り値 raw が必要なら将来 `output_raw` 等の別名で追加する。

`wait: "agent_done"` は agent session 専用。普通のPTY session に指定した場合は、送信前に副作用ゼロで明示エラーにする。

`wait: "agent_done"` と `mark:true` / `rtk:true` は併用しない。MVP では送信前に明示エラーにする。agent TUI へ shell sentinel や command rewrite を混ぜない。

### 3.2 返り値

`pty_send(wait: "agent_done")` は以下の順で動く。

1. 送信前に agent metadata と hook route が有効か検証する。
2. 同一 session の agent wait lock を取る。MVP では同時2本目を `agent session busy` として拒否する。
3. 対象 session の event file EOF offset を現ターン開始境界として記録する。
4. 対象PTYへ入力を送る。Codex TUI では text 投入と submit Enter を分離し、短い delay を挟む。
5. 未 bind の初回送信では、送信前に vendor TUI の入力欄 ready を待つ。未 ready なら文字列を送らずエラーにする。
6. 開始境界より後に追記された vendor hook event を待つ。
7. hook event 到着後、短い minimum delay と screen/log settle を行う。
8. `readOutput(screen:true)` 相当で最終画面を読む。
9. log offset を EOF へ進め、直後の通常 `pty_read()` が同じターンを重複増分として返さないようにする。
10. 画面本文 + meta + completion suffix を返す。

MCP の現在の返り値は text content なので、MVP では JSON API化しない。既存 `pty_read(wait:true)` と同じく末尾メタで表現する。

例:

```text
... Codex TUI の最終画面 ...
[aiterm t1: screen / ~420 tok]
[is_complete=True via agent_done vendor=codex turn_id=... done_status=turn_done]
```

hook 未設定など送信前に判定できる不備は MCP エラーにする。送信後の timeout は既に入力済みなので、screen を可能な範囲で返しつつ `is_complete=False via agent_timeout` として扱う。これは done 成功ではない。

### 3.3 普通の対話端末

SSH / docker / REPL / DB shell / vim / top はこれまで通り汎用PTYとして扱う。

- 確実に完了させたい通常コマンド: `mark:true`
- 特定の表示を待つ: `pty_read(wait:true, until: "...")`
- シェル復帰が取れる通常コマンド: quiescence
- ネスト中で確証がない: `nested` / `timeout` / `is_complete=False`

普通のPTYでは「出力が静止した」ことを done と言い換えない。

## 4. 内部設計

### 4.1 secure state root

agent metadata と event file は、tmux socket path をそのまま信用して増やさない。secure state root を用意する。

候補:

```text
$XDG_RUNTIME_DIR/aiterm-mcp
fallback: <os.tmpdir()>/aiterm-mcp-<uid>
```

条件:

- directory である。
- symlink ではない。
- current uid が owner。
- mode は 0700 相当。
- 条件を満たさない場合は agent done 機能を明示エラーで止める。

MVP を POSIX/macOS で先に通す。Windows native + WSL 経路は hook 書き込み側 path と Node 読み取り側 path が分かれるため、`event_file_node` / `event_file_hook` の設計と smoke が通るまで対応済みにしない。

### 4.2 agent session metadata

`openAgent` が作る session に agent metadata を保存する。

候補ファイル:

```text
<STATE_DIR>/agents/<session>.<launch_id>.agent.json
```

内容:

```json
{
  "kind": "codex",
  "aiterm_session": "t1",
  "launch_id": "uuid-or-random-token",
  "event_file": "<STATE_DIR>/agents/<session>.<launch_id>.events.jsonl",
  "created_at": "2026-07-06T...",
  "cwd": "/repo",
  "vendor_session_id": null,
  "hook_route": "temporary_home",
  "node_platform": "darwin"
}
```

`kind` は `codex` / `grok` / `composer`。`composer` は内部的には Grok CLI hook を使うが、aiterm の分類では `composer` として保持する。

新規 `openSession` 時は、同名 session の古い agent metadata / event file を掃除する。`closeSession` / `killAll` でも `.agent.json` / `.events.jsonl` を掃除する。外部 kill 後の同名再利用で普通PTYが agent 扱いされる事故を防ぐ。

### 4.3 hook bridge

hook wrapper は vendor payload を解釈しすぎない。以下だけを正規化して JSONL へ追記する。

```json
{
  "type": "agent_done",
  "aiterm_session": "t1",
  "launch_id": "...",
  "vendor": "codex",
  "vendor_session_id": "...",
  "turn_id": "...",
  "reason": "Stop",
  "done_status": "turn_done",
  "at": "2026-07-06T..."
}
```

重要:

- wrapper は `AITERM_AGENT_EVENT_FILE` のような任意 path を受け取らない。
- env で受け取るのは `AITERM_AGENT_KIND` / `AITERM_SESSION_ID` / `AITERM_AGENT_LAUNCH_ID` まで。
- event file path は wrapper が secure state root + session + launch_id から再構成する。
- session / launch_id は既存の session 名検証と同等以上に制限する。
- event file は symlink を拒否し、0600 で作成し、append は `O_APPEND` で1行1writeにする。
- reader は newline で完結した行だけ parse し、末尾の未改行 fragment は offset を進めず次 poll に残す。
- hook wrapper は stdout に何も出さない。診断は event error または secure log に限定する。
- raw payload 保存は debug opt-in。通常は正規化 field だけ保存する。
- line length / file size 上限を持ち、巨大 payload で待機側を詰まらせない。

Codex payload mapping:

- `vendor_session_id`: `session_id`
- `turn_id`: `turn_id`
- `reason`: `hook_event_name` または `"Stop"`
- `stop_hook_active`: 保存する。Phase 0 では continuation 後も同じ `turn_id` で再度 Stop が来たため、単独の重複排除キーにしない。
- `last_assistant_message`: 通常保存しない。debug opt-in のみ。

Grok payload mapping:

- `vendor_session_id`: `sessionId`
- `turn_id`: `promptId`
- `reason`: `reason`（正常系 headless 実測: `end_turn`）
- `transcriptPath`: 通常保存しない。debug opt-in のみ。

初回 event で `vendor_session_id` を metadata に bind し、以後は同じ vendor session id だけを採用する。bind 前に同一 launch file へ複数 vendor session が入った場合は曖昧成功にしない。

### 4.4 hook の設置方針

実装前に必ず smoke test で決める。

候補A: explicit user-level setup

- Codex: `~/.codex/hooks.json`
- Grok: `~/.grok/hooks/*.json`
- 暗黙 install は禁止。やるなら `setup-agent-hooks --dry-run` / `--install` / `--uninstall` 相当の明示導線を作る。
- merge は append-only、既存順序維持、バックアップ、atomic rename、idempotent marker、unknown field 保持、復元テストを必須にする。
- Codex は hook trust index/hash を壊さない検証が必須。
- Codex は sibling Stop hook が `decision:"block"` でターンを継続させる可能性を検証する。

候補B: per-launch temporary vendor home

- `CODEX_HOME` / `GROK_HOME` を一時ディレクトリにして hook を同梱。
- temp home は secure state root 配下に作り 0700。
- `auth.json` symlink は対象が通常ファイルであることを検証し、cleanup は symlink を辿らない。
- auth の mtime/hash が変わらないことを smoke する。
- 通常 home と temp home の model / project trust / MCP / plugin / hook / session 挙動差を redaction 付きで確認する。
- Grok は Claude/Cursor 互換 hook 混入を無効化できるか検証する。
- Phase 0 の結果、auth symlink だけの temporary home は不採用。Codex は model/MCP/plugins/sandbox/approval の差分を抑えるため `config.toml` をコピーするが、通常 home のその他 state/cache/session entry は managed home へ symlink しない。Grok は native config を失う一方で Claude 互換 hook/plugin が残るため、fake `HOME` + managed `GROK_HOME` を採用する。

候補C: project-local hook

- Codex は一時repo実測で `codex exec` の project-local hook が発火しなかったため、MVPでは採らない。
- Grok project hook は folder trust が絡むため、MVPでは採らない。

MVP の方針:

- user-level hook の自動 merge は採らない。
- Phase 0 の結果、候補Bの素朴な temporary home は落とす。
- Codex は managed isolated `CODEX_HOME` で Stop chain を aiterm が単独所有する route を採用済み。通常 home の `hooks.json` は触らない。
- Codex の単純 append bridge は continuation 誤doneを起こし得るため禁止のまま。
- Grok/Composer は TUI Stop hook 自体は通った。hook/plugin 混入は fake `HOME` + per-launch managed `GROK_HOME` で抑制する。OAuth は通常 Grok home の `auth.json` と `auth.json.lock` をセットで共有し、`auth.json` だけを symlink して lock を分裂させる実装は禁止する。
- どの TUI hook route も通らない場合は、TUI bridge 実装へ進まず、structured run / ACP レーンへ方針転換を検討する。

### 4.5 turn wait

`core.send` は同期関数のまま維持する。`wait:"agent_done"` は async wrapper を新設する。

候補:

```ts
async function sendAndWaitAgentDone(name, text, opts): Promise<string>
```

処理:

1. session 名検証。
2. `wait:"agent_done"` の事前条件を送信前に検証。
3. `mark:true` / `rtk:true` 併用を送信前に拒否。
4. 同一 session lock を取得。MVP は busy reject。
5. 未 bind の初回送信では vendor TUI の入力欄 ready を送信前に確認する。未 ready なら文字列を送らず code 2 で返す。
6. event file size を `turn_start_offset` として記録。
7. Codex TUI では `core.send(..., enter:false)` で文字列だけ送り、短い delay 後に Enter を送る。
8. `turn_start_offset` より後の完結 JSONL 行だけを読む。
9. `aiterm_session` / `launch_id` / `vendor_session_id` が一致する event を採用。
10. timeout なら screen を可能な範囲で返し `is_complete=False via agent_timeout` を付ける。
11. done event なら screen settle 後に画面を返す。
12. log offset を EOF へ進める。
13. lock を解放。

`last_seen_event_offset` を「現在ターンの開始境界」として使わない。永続 offset は cleanup 補助に留め、現在ターンは必ず送信直前 EOF を基準にする。

### 4.6 done 後の screen settle

hook は「turn終了」を示すだけで、tmux pipe-pane / capture-pane の最終描画が完全に揃った保証ではない。

そのため event 到着後に screen settle を入れる。

MVP 方針:

- event 到着後に小さな minimum delay を置く。
- `captureScreen` を間隔付きで複数回取り、連続一致を確認する。
- log size も短く安定確認する。
- 上限到達時は `agent_done_but_screen_unstable` を suffix に含める。
- これは done の推測ではなく、done後の画面flush待ち。completion判定とは分けて実装する。
- fake clock / fake capture で決定的に単体テストする。

## 5. 実装手順

### Phase 0: ブロッカー smoke と方針確定

2026-07-07 にマルチエージェントで実測済み。結果は「hook 発火は取れるが、安全な hook route は未確定」。

- [x] Codex: `openAgent` が実際に組む tmux 経路相当で TUI Stop hook が発火するか実測する。
- [x] Codex: hook が `AITERM_AGENT_*` を見られるか確認する。
- [x] Codex: 既存 Stop hook 同居時、特に `decision:"block"` continuation で初回 Stop を done と誤認し得ることを確認する。
- [x] Codex: hook trust なし / trust あり / `--dangerously-bypass-hook-trust` ありを分けて発火条件を確認する。
- [x] Codex: `--no-alt-screen` 無しは現行実 smoke で通過。長文回答 / キャンセル / 権限待ち / エラー時 payload は「done=turn終了であり成功判定ではない」という設計により採用ブロッカーから外し、将来の payload taxonomy 調査へ移した。
- [x] Grok TUI: `grok-build` で Stop hook が発火するか実測する。
- [x] Composer TUI: `grok-composer-2.5-fast` で Stop hook が発火するか実測する。
- [x] Grok/Composer: StopFailure、キャンセル、権限待ち、エラー時 payload は「done=turn終了であり成功判定ではない」という設計により採用ブロッカーから外し、将来の payload taxonomy 調査へ移した。
- [x] Grok/Composer: hook env 継承、payload shape、compat hook 混入を採取する。
- [x] temporary home 採用時、通常 home との差分を redaction 付きで記録する。
- [x] user-level setup は採用しない。merge / backup / restore / trust 検証は managed home route 採用により不要化した。
- [x] secure state root の候補と権限検証方式を決める。
- [x] Windows を MVP 対象に含めるか決める。native Windows + WSL path bridge は MVP 外。

### Phase 0.1: hook route 再設計 smoke

Phase 1 の前に通したブロッカー。

- [x] Codex managed isolated home 案: 通常 home の model / MCP / plugins / sandbox / approval / project trust を必要十分に保ち、Stop chain を aiterm が単独所有できる条件を実測する。
- [x] Codex explicit setup 案は棄却。既存 Stop hook 同居 continuation は実測で危険確定済みのため、user-level setup / append / restore route へ進まない。
- [x] Codex: sibling `decision:"block"` を同居させない managed route を採用し、Stop chain を aiterm 単独所有にする。
- [x] Codex: hook trust と project trust は別であることを Phase 0 RAG に記録済み。止まる経路は hook event 欠落 -> `agent_timeout` で成功扱いしない。
- [x] Grok: `--no-auto-update` 相当を TUI 起動経路へ確実に入れ、通常 `~/.grok` が更新されない条件を確認する。
- [x] Grok: Claude/Cursor compat user hooks と plugin hooks を無効化できる条件を確定する（fake `HOME` + managed `GROK_HOME` + `HOME/.grok` symlink）。
- [x] temporary home cleanup が symlink を辿らず、auth / lock / config の実体を変えないことを単体テストで固定する。
- [x] 安全 route が残ったため structured route への凍結条件は発火しない。Codex/Grok/Composer managed TUI hook route を採用済み。

### Phase 1: Codex 最小縦断

Codex だけで `pty_send(wait:"agent_done")` が done 画面を返すところまで通した。

- [x] secure state root helper を追加する。
- [x] agent metadata path / event path を launch_id 入りにする。
- [x] `openSession` / `closeSession` / `killAll` で stale agent state を掃除する。
- [x] Codex hook wrapper を追加する。
- [x] hook wrapper は診断を stdout に出さず、Codex への JSON 応答 `{continue:false}` だけを返し、secure append と path 再構成を行う。
- [x] Codex payload parser を追加する。
- [x] `sendAndWaitAgentDone` を追加する。`core.send` は同期のまま。
- [x] session lock を追加し、同一 session の二重 `wait:"agent_done"` を拒否する。
- [x] `pty_send` schema に `wait` / `timeout` / `screen` / `lines` を追加する。
- [x] `wait:"none"` は既存 `pty_send` と文言互換を維持する。
- [x] `wait:"agent_done"` なら送信前検証、送信直前 EOF、done待ち、固定 delay の screen settle、offset consume を行う。
- [x] 未 bind の初回 `wait:"agent_done"` で vendor TUI の入力欄 ready を送信前に待ち、未 ready なら文字列を送らない。
- [x] 普通のPTY session に `wait:"agent_done"` が指定されたら送信前エラーにする。
- [x] `mark:true` / `rtk:true` / `enter:false` 併用を送信前エラーにする。
- [x] 既存 destructive gate / raw sanitize の挙動を変えない。
- [x] 実 Codex smoke: `Reply exactly OK and nothing else.` -> `OK` と `is_complete=True via agent_done vendor=codex` を確認する。

### Phase 2: Grok / Composer 追加

Phase 0 の TUI Stop hook 実測と Phase 0.1 の isolation route は通ったため、Grok/Composer の配管を実装した。初回実 TUI smoke は Grok OAuth refresh token 失効で止まったが、`grok login` 後に Grok/Composer とも採用ゲートを通過した。

- [x] Grok payload parser を追加する。
- [x] Composer を Grok CLI payload + `kind:"composer"` として扱うテストを追加する。
- [x] Grok/Composer の `vendor_session_id` bind を実装する。
- [x] compat hook 混入の抑制または明示的な既知リスク表示を実装する。
- [x] Grok OAuth: per-launch isolated `GROK_HOME` は維持し、通常 Grok home の `auth.json` と `auth.json.lock` をセットで共有する。`auth.json` だけを symlink する旧経路は撤去する。
- [x] Grok OAuth: `auth.json.lock` が無い場合は通常 Grok home 側に 0600 の通常ファイルとして作る。既存 lock が symlink / directory なら明示エラーにする。
- [x] Grok OAuth: 複数 aiterm Grok/Composer session と通常 `grok` CLI が同じ credential/lock を見る前提を docs/RAG に明記する。
- [x] Grok/Composer の実 TUI smoke を `grok login` 後に再実行し、docs/RAG に還流する。
- [x] Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke を実行し、login 再要求なしを確認する。

### Phase 3: hook setup 導線

managed home route 採用により、MVP では user-level hook setup 導線を作らない。通常の vendor hook file は書き換えない方針を維持する。

- [x] `setup-agent-hooks --dry-run` / `--install` / `--uninstall` 相当の導線は不要化。managed home が Stop chain を launch ごとに単独所有する。
- [x] user-level hook merge は棄却。append-only / backup / restore / trust保持の実装は行わない。
- [x] setup の単体テストと temp home 統合テストは不要化。代わりに managed home / hook wrapper / secure state root の単体テストを置く。

### Phase 4: docs と利用導線

- [x] README に `pty_send(wait:"agent_done")` の使い方と失敗時 suffix を追加する。
- [x] `docs/01_design-plan.md` の完了境界に agent_done を追記する。
- [x] `docs/adr/0002-agent-launcher-tools.md` に「起動だけでなく done hook metadata を持つ」追補ADRを書くか、0003を作る。
- [x] hook setup は不要。README には `agent_done` が managed home を使い、通常 hook file を書き換えないことを記載する。
- [x] `rag/briefs/agent-cli-done-detection.md` に実装後の結論を追記する。

## 6. テスト計画

### CIで回すテスト

- [x] 既存テストが全て通る。
- [x] `wait:"none"` は既存 `pty_send` と文言互換。
- [x] `wait:"agent_done"` を普通のPTYに指定すると、送信前にエラーになり文字が届かない。
- [x] `wait:"agent_done" + mark:true` は送信前エラー。
- [x] `wait:"agent_done" + rtk:true` は送信前エラー。
- [x] `wait:"agent_done" + enter:false` は送信前エラー。
- [x] fake agent metadata + fake event file で `sendAndWaitAgentDone` が done を拾う。
- [x] fake Grok event で `sendAndWaitAgentDone` が `vendor=grok` suffix を返す。
- [x] Grok/Composer managed home が `auth.json` と `auth.json.lock` を同じ通常 Grok home へ symlink する。
- [x] Grok/Composer managed home が `auth.json` だけを symlink しないことを固定する。
- [x] Grok/Composer managed home は fake `HOME/.grok -> per-launch GROK_HOME` を維持し、通常 `~/.grok/hooks` や compat plugin を直接読ませない。
- [x] Grok OAuth auth 不在時は session 作成後でも残骸を閉じ、明示エラーを返す。
- [x] 送信前に存在する古い done event を拾わない。
- [x] `openAgent(prompt)` 相当の初回 done が残っていても follow-up の done と誤認しない。
- [x] 同一 session へ `Promise.all` で2本 `wait:"agent_done"` した時、2本目を busy reject する。
- [x] event が送信直後に即到着する race を拾える。
- [x] `launch_id` 不一致 event を無視する。
- [x] `vendor_session_id` bind 後、不一致 event を無視する。
- [x] partial JSONL の末尾 fragment を malformed 扱いせず、次 poll に残す。
- [x] malformed 完結 JSONL を握りつぶさず、明示メタとして返す。
- [x] hook wrapper が env 無しなら no-op。
- [x] hook wrapper が診断を stdout に出さず、Codex への JSON 応答だけを返す。
- [x] hook wrapper が symlink event file を拒否し、`AITERM_AGENT_EVENT_FILE` のような任意 path env を無視する。
- [x] secure state root が symlink / 緩いmodeなら拒否する。owner 不一致は hook 実装で guard 済みだが、非 root CI では他ownerを安全に作れないため runtime テスト対象外。core cleanup も root symlink を辿らない回帰を固定済み。
- [x] screen settle の「不一致 -> 一致」「上限到達」を fake clock / fake capture で固定する。
- [x] done返却後、通常 `pty_read()` が同じターンを重複増分として返さない。
- [x] `closeSession` / `killAll` / 新規 `openSession` が agent state を掃除する。
- [x] MCP `tools/list` schema に `wait:"none" | "agent_done"` だけが出る。
- [x] TUI ready 前の `pty_send(wait:"agent_done")` は送信前エラーになり、文字列が PTY に届かない。

### 採用ブロッカーの手動 smoke

vendor CLI と認証が必要なので CI 必須にはしないが、採用前ブロッカーとして扱う。

- [x] Codex: `codex_agent` -> `pty_send(wait:"agent_done", "OKだけ返して")` -> screen に OK、suffix に `agent_done vendor=codex`。
- [x] Codex: 既存 Stop hook 同居時の continuation は実測で危険確定。managed route では同居させないため誤認経路を閉じた。
- [x] Codex: hook trust 条件は Phase 0 RAG に記録済み。managed route は `--dangerously-bypass-hook-trust` を使う。
- [x] Grok: `grok_agent` -> 同上。`grok login` 後に `is_complete=True via agent_done vendor=grok` を確認済み。
- [x] Composer: `composer_agent` -> 同上。`grok login` 後に `is_complete=True via agent_done vendor=composer` を確認済み。
- [x] Codex/Grok/Composer を同じ cwd で並列起動し、全 vendor が `is_complete=True via agent_done` で混線しないことを実 smoke 済み。2026-07-07 に MCP サーバを stdio 起動し、JSON-RPC `tools/call` 経由でも3 vendor同時 `OK` + agent_done suffix を確認した。ready gate 実装後は、明示的な `pty_read` ready 待ちなしの起動直後即送信でも3 vendor同時に通過した。
- [x] hook が無い/壊れている時に送信前エラーまたは `agent_timeout` で明示失敗する。hook no-env / symlink拒否 / malformed JSONL / event欠落 timeout をテスト済み。
- [x] `pty_send(wait:"none")` 後に従来通り `pty_read` できる。
- [x] REPL は従来挙動から変わらないことを実 smoke 済み。2026-07-07 に MCP `tools/call` 経由でも Python REPL の `print(sum(range(10))) -> 45` を確認した。SSH/docker は専用コードパスを持たず通常PTY内のテキスト入力なので、外部環境依存の手動 smoke は docs/04 の完了条件から外す。
- [x] temporary / managed home 採用時、auth / lock / config の実体を cleanup が変えないことを単体テストで固定。plugin / trust 差分は Phase 0 RAG に記録し、managed route の設計前提として扱う。

## 7. 敵対的検証で採用した指摘

- stale event: `last_seen_event_offset` では前ターン done を拾う。送信直前 EOF を現ターン境界にする。
- session concurrency: 同一 session の複数 `wait:"agent_done"` は混線する。session lock で拒否する。
- event file naming: session名固定 file は再起動/遅延 hook に弱い。launch_id 入り file にする。
- path injection: event file path を env で渡すと任意ファイル追記になる。wrapper が安全な path を再構成する。
- user-level hook: 暗黙 merge は既存設定と trust を壊す。MVP の第一候補から外す。
- Codex Stop continuation: sibling Stop hook が `decision:"block"` でターン継続できるため、単純な Stop 到着を最終 done と断言しない。
- Grok/Composer TUI: Stop hook 発火は実測済み。auto-update と Claude/Cursor compat hook/plugin 混入は fake `HOME` + per-launch managed `GROK_HOME` + `--no-auto-update` で抑制し、OAuth credential/lock だけ通常 Grok home と共有する形で実装対象に広げた。
- API互換: `raw` の意味を返り値 raw に流用しない。`wait:"auto"` はMVPで出さない。
- `core.send`: async化せず、待機 wrapper を分ける。
- screen settle: 連続一致だけでは古い安定画面を返し得る。minimum delay / log安定 / 不安定suffix / fake test を入れる。
- TUI startup readiness: 起動直後に送ると vendor TUI がまだ入力受付状態でなく文字列を落とし得る。未 bind の初回 send は vendor-specific ready gate（Codex: `OpenAI Codex` + 入力欄、Grok/Composer: `Grok Build` + `❯`）を送信前に通す。

## 8. リスクと対策

- vendor hook payload 変更: version を記録し、必須field欠落時は明示エラー。unknown field は raw debug opt-in に限定する。
- hook と端末描画の順序差: done後の screen settle を入れる。
- user-level hook 設定破壊: 暗黙 install 禁止。明示setupは dry-run / backup / restore / trust検証必須。
- temporary vendor home の副作用: auth symlink だけの temporary home は不採用。managed isolated home を採るなら Phase 0.1 で差分を再検証する。
- Grok/Composer route: TUI Stop hook は実測済み。auto-update と compat hook/plugin 混入は managed route で制御済み。残る実測リスクは refresh token rotation 強制条件、キャンセル/権限待ち/StopFailure payload。
- agent session と event の混線: `launch_id` 入り event file、送信直前 EOF、vendor_session_id bind を使う。
- hook wrapper 失敗: 送信前に検出可能なものはエラー。送信後は `agent_timeout` / `agent_hook_error` を成功done扱いしない。
- TUI ready failure: 未 bind の初回送信は入力欄 ready を待つ。未 ready なら送信前エラーにし、文字列を流さない。
- Windows path: event file の Node path / hook path 分離が通るまで対応済みにしない。

## 9. 完了条件

- [x] `pty_send(wait:"agent_done")` が Codex のターン終了を hook で待てる。
- [x] Grok/Composer は auto-update と compat hook/plugin 混入の制御が通った後に同じ条件で対応する。
- [x] 返り値に done 境界後の screen/read 結果が含まれる。
- [x] 普通のPTYの既存挙動が変わらない。
- [x] done はタスク成功ではなく turn終了として表示される。
- [x] hook未設定/失敗/timeout が done 成功扱いされない。
- [x] stale event / concurrent send / launch_id / vendor_session_id / partial JSONL / malformed JSONL / done後 offset の回帰テストがある。
- [x] path injection / hook merge 破壊 / secure root 負系の回帰テストがある。hook merge は user-level setup 棄却により非適用、path injection と secure root は hook wrapper テストで固定。
- [x] README / docs / ADR / RAG が同期されている。

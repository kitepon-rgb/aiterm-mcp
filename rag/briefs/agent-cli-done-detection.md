# Brief: Codex / Grok Build の done 検知

作成日: 2026-07-06  
更新日: 2026-07-07  
対象: `codex_agent` / `grok_agent` / `composer_agent` の永続PTY TUI done 検知  
結論の強さ: Codex exec JSONL・Codex Stop hook・Grok headless streaming JSON・Grok headless Stop hook・Codex/Grok/Composer TUI Stop hook は実測済み。Codex/Grok/Composer は managed home route で `pty_send(wait:"agent_done")` の実 smoke まで成功。Grok/Composer は fake `HOME` + per-launch managed `GROK_HOME` + OAuth `auth.json`/`auth.json.lock` 共有で通過し、Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke でも login 再要求なし。同一 cwd の Codex/Grok/Composer 並列 agent_done smoke と普通PTYの Python REPL smoke も通過。さらに MCP stdio server を実起動した JSON-RPC `tools/call` 経由で、3 vendor 同時 agent_done と普通PTY Python REPL が通過。リリース前 smoke で起動直後送信による入力落ちを再現し、未 bind の初回 send には vendor TUI ready gate を追加した。ready gate 実装後は、明示的な read ready 待ちなしの起動直後即送信 smoke も通過。CI は 167 pass。Grok ACP は vendor docs 確認のみ。

## done の定義

この文書での done は「外部AI CLIの1ターンが終わり、次の入力境界に来た」こと。タスク成功、品質、ファイル変更の正しさは含めない。

この定義にしないと、画面静止・長考・入力待ち・APIエラーを混ぜてしまい、判定が不確実になる。

## 現在の結論

画面スクレイピングで Codex/Grok の done を捕まえる案は採らない。各CLIが持つ構造化イベントを使う。

ただし、永続PTYを維持する現在の実装計画では、公開ツールを増やさず `pty_send(wait:"agent_done")` に寄せる。以前この brief に書いた `codex_run` / `grok_run` を短期MVPにする案は、現在の正本では採らない。structured run は将来の別レーン候補として残す。

確度:

1. Codex non-interactive: [`codex exec --json`](../sources/completion-detection/codex-exec-json-turn-completed.md) の `turn.completed` / `turn.failed` は実測済み。
2. Grok headless: [`--output-format streaming-json`](../sources/completion-detection/grok-headless-streaming-json-end.md) の `type: "end"` / `type: "error"` は実測済み。
3. Codex TUI: [`Stop` hook](../sources/completion-detection/codex-cli-stop-hook.md) は直接起動と aiterm `openAgent` 相当の tmux 経路で実測済み。
4. Codex co-located hooks: [`Phase 0 smoke`](../sources/completion-detection/agent-cli-done-phase0-smoke-2026-07-07.md) で sibling Stop hook が `decision:"block"` を返すと、bridge が初回 Stop を見た後に同じ `turn_id` のまま continuation することを実測済み。単純な Stop 到着は final done ではない。
5. Grok TUI / Composer TUI: [`Stop` hook](../sources/completion-detection/grok-cli-stop-hook.md) は TUI でも実測済み。payload は `hookEventName/sessionId/promptId/reason/transcriptPath` を持つが model id は持たない。
6. Grok 長期候補: [`grok agent stdio` ACP](../sources/completion-detection/grok-agent-stdio-acp.md)。`session/prompt` の JSON-RPC response を done とする案は docs 確認のみ。

## Codex MVP 実装結果

2026-07-07 に Codex だけ最小縦断を実装した。詳細一次メモは [`agent-done-codex-mvp-2026-07-07.md`](../sources/completion-detection/agent-done-codex-mvp-2026-07-07.md)。

実装した表面:

- `codex_agent(agent_done:true)` で managed `CODEX_HOME` を作る。
- managed home は通常 `~/.codex/hooks.json` を触らず、`hooks.json` だけ aiterm Stop hook に差し替える。
- `pty_send(wait:"agent_done")` は送信直前の event file EOF 以後だけを読み、Codex Stop hook の event を待つ。
- done後に screen/log settle を行って画面を返し、suffix に `is_complete=True via agent_done vendor=codex` を付ける。不安定なら `agent_done_but_screen_unstable` を付ける。

実 smoke:

```text
Reply exactly OK and nothing else.
-> OK
[is_complete=True via agent_done vendor=codex ... done_status=turn_done]
```

実装中に追加で見つけた罠:

- Codex TUI は `tmux send-keys -l <text>` の直後に `Enter` を連続投入すると、submit ではなく入力欄へ残ることがある。
- `/status` でモデル呼び出しなしに検証し、text 投入と Enter を分離して短い delay を挟むと submit されることを確認した。
- そのため `wait:"agent_done"` 経路だけ、text と submit Enter を分ける。通常 `pty_send` は既存挙動のまま。

## 実測結果の要点

Codex `Stop` hook payload:

```json
{
  "session_id": "...",
  "turn_id": "...",
  "hook_event_name": "Stop",
  "last_assistant_message": "OK"
}
```

Grok `Stop` hook payload:

```json
{
  "hookEventName": "stop",
  "sessionId": "...",
  "promptId": "...",
  "reason": "end_turn"
}
```

Codex JSONL:

```jsonl
{"type":"turn.completed", ...}
```

Grok streaming JSON:

```jsonl
{"type":"end","stopReason":"EndTurn","sessionId":"...","requestId":"..."}
```

## Phase 0 smoke の結論

2026-07-07 にマルチエージェントで実測した。詳細は [`agent-cli-done-phase0-smoke-2026-07-07.md`](../sources/completion-detection/agent-cli-done-phase0-smoke-2026-07-07.md)。

通ったこと:

- Codex TUI は aiterm `openAgent` 相当の tmux 起動経路でも Stop hook が発火し、`AITERM_AGENT_*` env も hook へ届いた。
- Grok Build(Grok) と Grok Build(Composer) の TUI でも Stop hook が発火した。
- secure state root は `$XDG_RUNTIME_DIR/aiterm-mcp`、fallback は `${os.tmpdir()}/aiterm-mcp-<uid>` とし、現行 tmux socket dir へ混ぜない方針でよい。

落ちたこと:

- Codex の co-located Stop hook では、bridge hook が初回 Stop を記録したあと、別 hook の `decision:"block"` によって Codex が継続した。continuation 後も `turn_id` は同じだった。したがって「Stop 到着 = final done」は禁止。
- `CODEX_HOME=temp` / `GROK_HOME=temp` に auth symlink だけ置く案は不採用。通常 home と model / MCP / plugins / sandbox / approval / trust / session が一致しない。
- Grok は temporary home でも Claude 互換 hook/plugin を拾い得る。現在の実装は fake `HOME` + managed `GROK_HOME` + `HOME/.grok -> GROK_HOME` で hook/plugin source を抑制する。
- 追加敵対的検証により、Grok の `GROK_HOME` 全体を aiterm 永続共有にする案は棄却。共有するのは通常 Grok home の OAuth `auth.json` と `auth.json.lock` だけに縮小する。

## 採用設計

### MVP: `pty_send(wait:"agent_done")`

既存TUI agentを永続PTYのまま維持し、送信ツールを増やさない。

- `codex_agent` / `grok_agent` / `composer_agent`: TUIを起動する。
- `pty_send(wait:"agent_done")`: 入力を送ったあと、vendor hook の turn done を待ち、done後の画面を返す。
- 未 bind の初回 `pty_send(wait:"agent_done")` は送信前に vendor TUI の入力欄 ready を待つ。未 ready なら文字列を送らず code 2 で失敗する。
- `pty_read`: 従来通り任意観測に使う。

重要な制約:

- Codex 1本の縦断は実装済み。
- Grok/Composer は TUI Stop hook 実測と fake event 経路が通った。実装では `--no-auto-update`、fake `HOME`、per-launch managed `GROK_HOME` で hook/plugin 混入を抑え、OAuth は `auth.json` と `auth.json.lock` をセットで通常 Grok homeへ symlinkする。`grok login` 後の実 TUI smoke と並行 smoke も通過した。
- 同一 cwd で Codex/Grok/Composer を並列起動し、3本とも `OK` と `is_complete=True via agent_done vendor=...` を返すことを確認した。
- 普通PTYの Python REPL smoke も通過し、agent_done 実装が SSH/docker/REPL を扱う通常PTY経路を専用化していないことを確認した。
- 2026-07-07 追加実測: `node dist/index.js` を起動し、JSON-RPC `tools/call` 経由で `codex_agent` / `grok_agent` / `composer_agent` + `pty_send(wait:"agent_done")` を同時実行。3本とも `OK` と agent_done suffix を確認。普通PTYも MCP 経由で Python REPL `45` を確認。
- 2026-07-07 追加敵対的検証: state root の mode が緩い場合に stale metadata cleanup がスキップされ、同名 agent 再起動後に metadata 複数で `pty_send(wait:"agent_done")` が失敗するケースを再現。core cleanup 側で owner/symlink を確認した上で root/agents dir を 0700 に補正して cleanup する修正と回帰テストを追加。
- 2026-07-07 リリース前 smoke 追加: Codex TUI 起動直後に `pty_send(wait:"agent_done")` を投げると、TUI が入力受付状態になる前に文字列が落ち、hook が来ず `agent_timeout` になるケースを再現。送信前 ready gate を実装し、未 ready なら文字列を送らずエラーにする回帰を追加。
- 2026-07-07 追加敵対的検証: 遅延初回 prompt event、bind 後 vendor_session_id 欠落、bind 前 vendor_session_id 混在、screen settle 早期安定、wait 中 close/killAll、cross-process wait lock、oversized JSONL、event file hard link、Grok auth lock hard link を採用指摘として修正し、回帰テストを追加。
- `wait:"auto"` は出さない。
- `mark:true` / `rtk:true` と `wait:"agent_done"` は併用しない。
- `raw` は既存の「送信前サニタイズ無効」の意味を維持し、返り値 raw には使わない。
- user-level hook の自動 merge はしない。
- hook wrapper に任意の event file path を env で渡さない。

### 旧案: structured run tools

以前の短期案:

- `codex_run` または `codex_agent(mode: "exec-json")`
- `grok_run` または `grok_agent(mode: "headless-json")`

これは done 境界だけを見るなら強い。Codex は `turn.completed`、Grok は `type:"end"` を読めるため、TUI hook より決定的。

しかし現在の目的は「永続PTYのまま、AI CLIだけ `pty_send` の返り値で done後画面を返す」ことなので、MVP本線から外す。将来、TUIを必要としない委譲用途が明確になった場合に別レーンで検討する。

## Hook bridge の設計要点

概念:

```text
Codex/Grok Stop hook
  -> append JSONL to secure state root / agents / <session>.<launch_id>.events.jsonl
pty_send(wait:"agent_done")
  -> 送信直前 EOF offset を記録
  -> offset 以後の matching event を読む
  -> done後 screen settle
  -> screen + completion suffix を返す
```

採用した安全条件:

- event file 名に `launch_id` を含める。
- 現ターン境界は `pty_send` 送信直前の event file EOF。
- 同一 session の `wait:"agent_done"` は lock し、MVPでは二重実行を拒否する。
- hook wrapper は診断を stdout に出さず、Codex への JSON 応答 `{continue:false}` だけを返す。
- event file path は env で渡さず、wrapper が安全な state root から再構成する。
- secure state root は owner/mode/symlink を検証する。core cleanup も root symlink を辿らない。
- partial JSONL は未完了行として次 poll に残す。
- done後の screen settle は completion判定とは分ける。
- hook wrapper は env 無しなら no-op、任意 path env を無視、event file symlink を拒否する。
- managed home cleanup は symlink を辿らず、通常 home の auth / lock / config 実体を変えない。
- MCP `tools/list` schema は `pty_send.wait` を `"none" | "agent_done"` に固定する。

## 未決リスク

- Codex Stop hook は他の Stop hook と同居できる。別 hook が `decision:"block"` でターンを継続する場合、単純な Stop 到着を最終 done と誤認することは実測済み。MVP は managed home で同居 hook を排除する。
- Codex continuation 後も `turn_id` が同一だったため、`turn_id` の重複排除だけでは守れない。
- Codex hook trust と user-level hook merge は壊しやすい。MVPで暗黙mergeしない。
- Codex project trust prompt は hook trust とは別に出る。temp home 起動時は非対話で止まる可能性がある。
- Grok は Claude/Cursor 互換 hook を読むため、既存 hooks の副作用や遅延が混ざる可能性がある。MVP 実装は fake `HOME` で既存 user/plugin hook source を切る。
- temporary `CODEX_HOME` / `GROK_HOME` は correlation には強いが、vendor home 分離により config / plugin / trust / session が変わる。auth symlinkだけの案は不採用。Grok OAuth は `auth.json` と `auth.json.lock` を同じ通常 Grok home から共有する。
- Hookはターン終了を示すだけ。キャンセル/エラー/成功の区別は payload・transcript・screen 側で扱う。
- Hook script 自体が落ちると done event が欠落する。bridge側は timeout/明示エラーを持つ。
- `async: true` hooks は Codex 0.142.3 では skip された。非同期hook前提にしない。
- vendor CLI の JSONL / hook payload はバージョン差で変わり得る。driver は version記録・unknown field許容・必須field欠落時の明示エラーを持つ。
- Hook発火は「ベンダーターン終了」であって「PTYバッファをaitermが全部読み終えた」保証ではない。TUI modeでは Stop event 後に screen settle して最終画面を回収する。
- Windows native + WSL 経路では hook 書込 path と Node 読取 path が分かれるため、`agent_done` は未対応。core PTY / agent launcher とは別 smoke が必要。

## 反証後の補正

Grok Build にこのbriefの反証を依頼したところ、主な有効指摘は「vendor内部イベント依存は形式変更に弱い」「Stop hookとPTY出力の完了は同一ではない」「ACPは実装未検証」という3点だった。これらは未決リスクへ採用した。

その後、8本のサブエージェント敵対的検証で以下を追加採用した。

- stale event 対策として、送信直前 EOF を現在ターン境界にする。
- 同一 session の `wait:"agent_done"` は lock する。
- 未 bind の初回 send は vendor-specific ready gate を通す。
- event file は `launch_id` 入りにする。
- hook wrapper は env の任意 path を信じない。
- user-level hook 自動 merge はMVPから外す。
- Grok/Composer TUIは managed route で実 smoke 済みとして扱う。ただし refresh token rotation 強制条件とキャンセル/権限待ち/StopFailure payload は未採取。
- `raw` / `wait:"auto"` / `mark:true` / `rtk:true` のAPI衝突をMVPで避ける。

さらに Phase 0 smoke で以下を採用した。

- Codex openAgent 相当経路の Stop hook/env は成立する。
- Codex Stop hook 同居時の continuation は実在するため、単純 append bridge は実装禁止。
- auth symlink だけの temporary vendor home は同等でも隔離でもないため不採用。
- Grok の `GROK_HOME` 全体共有案は hook/config/session 汚染が増えるため不採用。per-launch isolation は維持し、共有範囲は OAuth credential/lock に限定する。
- Grok/Composer TUI Stop hook は成立し、auto-update と compat hook/plugin 混入は fake `HOME` + per-launch managed `GROK_HOME` + `--no-auto-update` で抑制できた。OAuth は通常 Grok home の `auth.json` と `auth.json.lock` だけを共有する。
- secure state root は tmux socket dir と分離する。

一方で、「TUI可視画面の方がベンダー内部イベントより安定」「sentinelをプロンプトで強制すればよい」という反証は、done 検知の本線としては採用しない。理由は、TUI画面は長考・承認待ち・描画静止・入力待ちを区別できず、プロンプト指示の sentinel はモデル出力に依存して欠落・変形し得るため。補助信号としては使えるが、ブロッカー解消の主経路には置かない。

## 採らない案

- Codex/Grok TUIの画面末尾テキストで done 判定する。
- 出力静止だけで done 判定する。
- 固定秒 sleep で done 扱いする。
- `agent_wait_done` のような公開待機ツールを増やす。
- `codex_send` / `grok_send` / `composer_send` を増やす。
- user-level hooks を暗黙に書き換える。

これらは長考・ストリーミング・承認待ち・エラー画面を区別できない、または公開APIと運用リスクを増やす。

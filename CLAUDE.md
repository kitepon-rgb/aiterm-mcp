# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 現状: Node/TS の npm パッケージ `aiterm-mcp`（stdio MCP サーバ）

> **v0.12.2（2026-07-13公開）**: 公開面は `diagnostics` を加えた計10ツール。factory向けread-only診断と製品所有のoffline runtime error aggregateを追加した。
> collectionはschema-exact canonical dotagents configの`collection.enabled`がJSON boolean `true`の時だけ有効で既定OFF、network送信は行わない。raw exception/stderr/stack/prompt/PTY/transcript/event/pathはAPIで拒否する。
> 公開commit `239e7e4`、tag CI `29245251184`、npm `latest`、tag / GitHub Release、MCP Registry workflow `29245462227`、registry由来隔離installから10-tool MCP diagnosticsとruntime snapshotまで確認済み。

> **v0.17.0（2026-07-18公開）**: オーナー裁定「waitは廃止。引数を減らし使い方のパターンを減らす」による breaking 再設計（v0.16.0として内部確定）に、実運用フィードバック還流（aiterm-wait exit code=outcome連動・launch receiptのwait_command/event_cursor・完了受信手順の説明明記）を重ねて0.17.0で公開。
> ①`pty_send` から wait/timeout/screen/lines/operation_id を撤去。agent session への send は自動で**非ブロック dispatch**になり
>（ready gate・submit 分離内蔵・即返り）、`aiterm.pty-send-result.v1`（mode: sent|agent_dispatch）で **event_cursor**（送信直前の
> event file 境界）を返す。force:true は手動介入の素送信。②`claude_turn issue` は timeout 撤去・dispatch-only で即 accepted。
> ③launcher 4種から agent_done/wait/timeout/screen/lines を撤去し**常に managed 起動**（手動運転は pty_open＋vendor CLI 手動起動へ）。
> 初回 prompt は ready gate 経由で送信して待たずに返る。④`aiterm-wait` に --cursor を追加＝dispatch 後起動でも取りこぼしゼロ
>（全 vendor で起動順序非依存）。完了待ちは aiterm-wait 一本（Claude 親=background、押し込み機構の無い親=foreground shell）。
> core は sendAndWaitAgentDone/waitAgentDoneEvent/wait lock 取得系を削除し dispatchAgentTurn/observeAgentDone(cursor) へ置換。
> close/killAll の他プロセス wait lock 検査は cross-version 安全弁として残置。full regression 290/290。
> 2026-07-18 追補（実運用フィードバック還流）: `aiterm-wait` の exit code は outcome を映す（0=done / 3=timeout=未完了・既定600秒 / 4=closed / 1=エラー。exit≠完了、receiptのoutcomeが正）。
> launch receipt `aiterm.agent-launch-result.v1` に additive nullable の `event_cursor`/`wait_command` を追加（初回prompt時だけ非null）。
> launcher 4種の説明に完了受信手順を明記し、transcript未完了エラーは aiterm-wait のバックグラウンド実行を指す。full regression 291/291。
> 実機E2E通過（2026-07-18）: 実codex子でmanaged起動→dispatch即返り（cursor=0）→**dispatch後起動**の `aiterm-wait --cursor` がdone受信→harness re-invoke→transcript turn_id一致で回収→close。cursor起動順序非依存を実機確認。
>
> **v0.15.1（2026-07-18公開）**: `claude_agent`を追加し、PTY 6＋対話launcher 4
>（Claude/Codex/Grok/Composer）＋diagnostics 1＋構造化Claude caller 1＝計12ツール。Claudeは`claude -p`反復ではなく、
> 利用者がattachできる同じClaude Code TUI sessionへ初回／follow-upを送る。launch専用settingsの
> Stop hookが本文なしeventとowner-only bounded resultを分離し、timeout後もprompt再送なしで同じ
> sessionから回収する。durable callerの`operation_id`を送信→Stop event/result→回収へ相関し、古い結果の
> 誤帰属、同一ID再送、未解決operation中の別ID送信を拒否する訂正gateも受入済み。`claude_turn`は
> `issue`／`recover`を構造化statusへ固定し、完了時だけexact raw resultを返す。operation相関の関連122/122、
> full regression 262/262、独立反証の最終判定はP0/P1/P2残存なし（ADR 0006）。
> 構造化caller gateはfocused 5/5、related 126/126。親反証でrecoverへの暗黙timeout注入を除去済み
>（ADR 0009）。
> launcherは既存text互換に加え、session handleを文字列解析なしで得る`aiterm.agent-launch-result.v1`
> structured receiptを公開する。focused 4/4、related 94/94で受入済み（ADR 0011）。
> operation相関とstructured close receiptは0.14.0で内部確定し、aiterm-wait追加で0.15.0へbumpして公開した（既公開0.12.3からの次版・ADR 0007・0012）。
> Observer queue 19e実Claudeで、入力欄の単発ready直後に初回promptがstartup再描画へ消えるraceを再現した。
> 初回prompt前の4 vendor共通ready gateを11回連続pollへhardeningする修理はADR 0014／plan 15どおり完了し、
> pure 21/21、focused agent 4/4、related 113/113で受入済み。queue 19eの実managed Claude再検証待ち。
> B方式統一の完了push（2026-07-18）: 新bin `aiterm-wait`＋`core.observeAgentDone()` を追加。events.jsonlの純リーダーとして完了を待ち `aiterm.agent-wait-result.v1` receipt（done/timeout/closed）でexitする。lock/metadata/dispatch不干渉・launch_id隔離で多重waiter安全。dispatchは `claude_turn issue(timeout:0)`／`pty_send(wait:"agent_done",timeout:0)`。focused 16/16。Codex親のpush受け口は上流待ち（openai/codex#17543/#18056）。実Claude Code親のlive E2Eは2026-07-18通過（実codex子・re-invoke→receipt turn_id一致→transcript回収→close）。
> 公開手順: main push → `gh release create v<ver>` で tag 生成 → CI が npm publish --provenance（OIDC Trusted Publishing）、GitHub Release で registry.yml が MCP Registry 再登録。npm install 検証まで本セッションで実施。端末のMCP設定更新は各hostで別途。
> 実Claude model requestのlive smokeは明示承認待ち。
> 下記の10-tool記述とtest件数は公開済みreleaseの履歴であり、現sourceの公開面ではない。

**直前の公開面 v0.12.2（2026-07-13・factory diagnostics / local runtime error store）＝計 10 ツール**（現行公開は 0.15.1＝12 ツール＋`aiterm-wait` bin＋C locale tmuxへのUTF-8 LC_CTYPE注入fix。以下は当時の公開面の履歴。v0.12.0 が全域監査の確定修正＋長い TUI 回答の transcript 回収。監査ダイジェストは docs/11、transcript 設計は docs/12。v0.11.0 は GPT-5.6/Grok 4.5 世代モデル整合）: PTY 6 ツール（`pty_open`/`pty_send`/`pty_read`/`pty_key`/`pty_close`/`pty_list`）＋**対話エージェント起動 3 ツール**（`codex_agent`/`grok_agent`/`composer_agent`、v0.7.0〜。各ベンダー CLI の対話 TUI を永続 PTY 内に起動して session_id を返し、以後 pty_read/pty_send で操作。前提検証は effort→bin→cwd の順で session 作成前・失敗時の残骸ゼロ保証は v0.7.1）。2026-07-07 に `agent_done:true` + `pty_send(wait:"agent_done")` の managed Stop hook route を実装。未 bind の初回 `pty_send(wait:"agent_done")` は vendor TUI の入力欄 ready を送信前に待ち、未 ready なら文字列を送らずエラーにする。Codex/Grok/Composer は実 smoke（OK応答・`is_complete=True via agent_done vendor=...`）まで通過。Grok/Composer は追加敵対的検証で `GROK_HOME` 全体共有案を棄却し、per-launch isolation を維持しつつ OAuth `auth.json` と `auth.json.lock` だけを通常 Grok home と共有する実装へ修正（0.9.1当時。2026-07-14に廃止し、検証済み正本を`GROK_AUTH_PATH`でvendorへ渡す契約へ置換）。v0.9.1 で Codex managed `CODEX_HOME` は `auth.json` だけを通常 Codex home へ symlink し、`config.toml` は private copy、その他の `~/.codex` エントリは共有しない allowlist に修正した。`grok login` 後に Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke も通過し、login 再要求なしを確認。2026-07-07 に `node dist/index.js` を実起動し、JSON-RPC `tools/call` 経由でも3 vendor同時 `OK` + agent_done suffix と普通PTY Python REPL を確認済み。ready gate 実装後は、明示的な `pty_read` ready 待ちなしで起動直後に即 `pty_send(wait:"agent_done")` する smoke も通過。agent_done の負系/race は stale event・初回 prompt done・TUI ready gate・同時 wait・即時 event・`launch_id`/`vendor_session_id` 不一致・bind 後の vendor_session_id 欠落・bind 前 vendor_session_id 混在・初回 prompt pending・partial/malformed/oversized JSONL・done後 offset consume・wait file lock・wait 中 close/killAll 拒否・hook no-env・path injection・hard link 拒否・secure root・core cleanup root symlink no-follow・緩い state root での stale metadata cleanup・screen settle・MCP schema・managed home cleanup を回帰化済み。同一 cwd で Codex/Grok/Composer を並列起動して event 混線なし、普通PTYの Python REPL も実 smoke 済み。経緯: v0.5.0-0.6.0 で非対話 `delegate` を実装→対話パラダイム不整合のため v0.7.0 で撤去（非対話委譲は codex-sidecar の責務）。リリースは **tag `v*` push で CI が npm publish --provenance、GitHub Release 公開で registry.yml が MCP Registry 再登録**。回帰テストは計 **205 件**。

**v0.11.0（2026-07-11・GPT-5.6/Grok 4.5 世代整合＝docs/10 消化）**: ①3ツールに `model` 引数を追加（codex=`-m`、grok/composer=`--model` 上書き。空/空白は session 前拒否）。②`grok_agent` の既定モデルを stale な `grok-build` から **`grok-4.5`** へ更新（ライブカタログ実測に整合）。③codex managed `CODEX_HOME` の config.toml copy は、引数で渡した `model`/`reasoning_effort` に対応する top-level ピンを上書き（端末の ultra ピン等が対話子へ黙って波及しない。渡さないキーとテーブル以降は原文保持）。④grok/composer への `reasoning_effort` 指定は**起動前に明示エラー**（grok CLI の `--effort` は headless 専用・対話 TUI では警告の上無視されるため。旧 `low/medium/high/xhigh/max` enum は撤去）。⑤codex 起動応答に実効 model/effort と出所（引数／端末config継承／CLI既定）を常時明示し、実効 effort=ultra は proactive 自動委譲 ON の警告付き。前提検証順は model/effort→bin→cwd。

**2026-07-05〜07 の主な挙動変更（利用時に留意）**: ①`pty_read` の `until` は**既定でリテラル部分一致**（正規表現は `until_regex:true` でオプトイン）。②`pty_send(mark:true)` は `pty_read(wait:true)` が **until 無しでも sentinel を自動検出**して完了確定する（ネスト・非シェル前面でも効く。mark は POSIX シェル前提＝fish/csh は拒否）。③`read rtk:true` の pytest は**収集エラーを緑/無害に偽装しない**。④破壊ゲートに `rm -rf ./*`・引用符付き root・`..`・`./` を追加。⑤`screen+wait`・`full+lines` が機能化。⑥エージェント起動フラグ・モデル ID は実 CLI で裏取り済み（`codex 'prompt'`／`-c model_reasoning_effort=`／grok `--model grok-build|grok-composer-2.5-fast --effort <lvl>`）。⑦`agent_done:true` は managed vendor home を使い、通常 hook file を触らず Stop hook を aiterm 単独所有にする。未 bind の初回送信では vendor TUI の入力欄 ready gate を通し、未 ready なら送信前エラーにする。Codex TUI では text 投入直後の Enter が submit として落ちる罠があり、agent_done 経路だけ text と Enter を分離して短い delay を挟む。Grok/Composer は `--no-auto-update`・fake `HOME`・managed `GROK_HOME` で compat hook/plugin 混入を抑え、OAuth は検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡し、managed homeへauth/lockを置かない。Grok/Composer 実 smoke は `grok login` 後に通過済み。

履歴メモ: v0.4.1 は発見性メタ/README 刷新のリリース、v0.7.0 は対話エージェント起動3ツール追加、v0.9.0 は `agent_done` 公開、v0.9.1 は Codex managed home allowlist hardening、v0.10.0 は Codex launcher 初回 prompt wait 公開、v0.11.0 はモデル整合（`model` 引数・`grok-4.5` 既定・effort 実態合わせ）公開、v0.12.0 は全域監査の確定修正（stale wait lock 回収・close/killAll のプロセス間ガード・出力削減の行内キャップ・UTF-8 先頭境界・pytest 証拠ガード・破壊ゲートの `--`／rtk 変換後・line_range 逆転エラー・pty_list agent 列・codex managed config 可視化）＋新機能 `pty_read(agent_transcript:true)`（長い TUI 回答を vendor transcript から回収）公開、v0.12.1 は監査 C 節の hardening 全消化（stop hook short-write ガード・agent events の 64KB tail 読み・非 agent read の negative-cache）。詳細な版別差分は `CHANGELOG.md` と `docs/archive/` を参照する。

- **実装は Node/TS**（要件: Node>=18 + tmux）。`src/index.ts`（`@modelcontextprotocol/sdk` で 12 ツール公開〔PTY 6＋エージェント起動 4＋read-only diagnostics 1＋構造化Claude caller 1〕・stdio）/ `src/core.ts`（tmux 制御・出力削減・完了検出・安全ガード・Claude/Codex/Grok/Composer対話launcher・Claude operation issue/recover・rtk委譲。**stdout に出さない**＝通信を汚さない）/ `src/claude-stop-hook.ts`（Claude Stop result分離）/ `src/runtime-error-store.ts`（explicit opt-in・固定 allowlist aggregate・strict validation・child orchestration）/ `src/runtime-error-worker.ts`（bounded isolation）/ `src/runtime-errors-cli.ts`（factory snapshot/ack）/ `src/rtk.ts`（コマンド別 reducer）/ `src/aiterm-wait-cli.ts`（親向け完了push用の純リーダー waiter。`core.observeAgentDone()` を呼ぶ薄い殻）。`npm run build` → `dist/`。`package.json` の bin は `aiterm-mcp` と `aiterm-runtime-errors` と `aiterm-wait`。
- 削減と完了検出: `read` 既定で制御除去・反復圧縮・head+tail＋復元ヒント・メタ併記。`read rtk:true` は直前コマンド別の自前 reducer、`send rtk:true` は rtk バイナリへ委譲（rtk 不在は素通し）。完了検出は dead / `until` / quiescence(出力静止∧シェル復帰) / nested(ネスト中∧until無しで出力静止→確証不能ゆえ未確定で早期返却) / timeout。SSH/docker はツール化せず `send "ssh ..."` で入る（ネスト）。tmux 常駐ゆえプロセスをまたいで永続し、人は戻り値の `tmux -S … attach` で覗ける。
- 出力削減の自前移植 `src/rtk.ts`（要件C: rtk ファイル非複製・自作。**pytest は rtk 0.42.0 と一致**。ただし `FAILED` 要約行の理由は可読性優先で全文保持＝意図的に rtk と相違／grep／git status・log／簡易フィルタ）。
- `docs/00_overview.md` — docs の入口。正典級文書と ADR の地図。
- `docs/01_design-plan.md` — 設計の目的・判断・決定/未決事項の source of truth。**作業前に必ず読む。**
- `docs/02_mcp-plan.md` — MCP 化計画の履歴文書。現状の正は CLAUDE.md と README.md。
- `prototype/python/` — 旧 Python 実装（最初の MVP・CLI＋FastMCP）。設計と reducer の**移植元／検証基準**（pytest reducer は rtk **0.42.0** と一致。ただし `FAILED` 要約行の理由は可読性優先で**全文保持**＝意図的に rtk と相違）。成果物は Node 版で、こちらは参照専用。lint は未整備。
- `test/` — **Node 版の回帰テスト**（`node:test`、`npm test` で build→実行・tmux 必須）。`test/rtk.test.mjs`（pytest は実機 rtk 0.42.0 採取の golden と一致を `test/fixtures/pytest/*` で固定。`proj_ra` の `FAILED` 要約行のみ理由全文保持＝意図的に rtk 非一致／grep・git・filters は Python プロトタイプ生成の `test/fixtures/reducers.json` で固定／classify・truncate・stripShellFrame）、`test/core-pure.test.mjs`（stripControl・reduceOutput・agent_done screen settle fake・早期安定防止・TUI ready gate 判定）、`test/core-readoutput.test.mjs`（readOutput の full/range/lines/offset/raw/rtk を tmux 非依存で）、`test/core-tmux.test.mjs`（破壊ゲート10種・サニタイズ・sendKey・完了検出。専用ソケットで隔離）、`test/smoke.test.mjs`（stdout が JSON-RPC のみ・10 ツール・`pty_send.wait` schema）、`test/core-space-path.test.mjs`（空白入り一時パスでも pipe-pane が出力を捕捉＝tmux 内部 /bin/sh のクオート回帰）。クロスプラットフォーム対応に伴い session 名検証（トラバーサル/インジェクション遮断・全入口）・`toWslPath`・offset クランプの回帰も追加。`test/core-resolve.test.mjs`（POSIX の tmux 解決負経路: `AITERM_TMUX` 不正時に空 stderr でなく明確な code2＝Windows は WSL ブリッジ経由のため skip）も追加。`test/core-agent.test.mjs`（openAgent の前提検証・残骸ゼロ保証、Codex/Grok/Composer agent_done managed home、Codex managed home allowlist、Grok OAuth `GROK_AUTH_PATH`正本検証（no-follow/hardlink/mode/size/JSON/API-key分岐）、managed home credential非生成、cleanupが通常auth/configを変えないこと、core cleanup が root symlink を辿らないこと、緩い state root でも stale metadata を掃除してから再作成すること、fake event wait、stale/初回 prompt done 誤認防止、起動時 prompt pending 拒否、TUI ready 前の送信前拒否、同時 wait busy reject、cross-process wait lock、即時 event race、`launch_id`/`vendor_session_id` 不一致、bind 後の vendor_session_id 欠落、bind 前 vendor_session_id 混在、partial/malformed/oversized JSONL、done後 offset consume、普通PTY/enter:false拒否、model 引数（codex `-m`／grok・composer `--model` 上書き・空 model 拒否）、grok/composer effort 拒否、managed config ピン上書き）、`test/codex-stop-hook.test.mjs`（Codex/Grok Stop payload 正規化、env 無し no-op、存在しない `XDG_RUNTIME_DIR` の fallback、任意 path env 無視、symlink/hard link event file 拒否、secure root/dir 負系）、`test/release-metadata.test.mjs`（`package.json` と `server.json` の version 同期）で計 **183 件**。CI は `.github/workflows/ci.yml`（**ubuntu-latest と macos-latest** の Node 18/20/22 で build+test、tag で publish --provenance。**windows-latest（Node 20/22）を非ブロッキング（continue-on-error）で追加＝純粋層を検証**。WSL ブリッジ統合経路は手動 Windows 検証ゲートに残す）。
- `rag/` — **調査資産の RAG コーパス**。一次資料を MarkItDown で Markdown 化して蓄積する。`rag/ingest.py` が取り込みツール、`rag/INDEX.md` が総目次、`rag/manifest.json` が機械可読索引。詳細は後述「調査資産: RAG コーパス」。
- `.vscode/tasks.json` — Throughline が自動生成した token-monitor 自動起動設定。このプロジェクトの成果物ではなく編集対象外。
- `docs/*.md:Zone.Identifier` は WSL の Windows 由来メタデータ。中身に関係しないノイズ。
- `.claude/settings.json` は端末固有のため作らない。必要な端末で Claude Code の fewer-permission-prompts を使って生成し、`.claude/` 配下のローカル設定として保持する。

## このプロジェクトが作ろうとしているもの

AI がローカル/SSH/コンテナを問わずターミナルを**永続セッションとして**直接操作するための薄いツール層。現状の「コマンド 1 個ずつの細切れ往復」を解消する。

設計の核心（design-plan の §3–§9 を要約。詳細は必ず原典を参照）:

- **「ツールゼロの生直結」は採らない。** AI は stdout を読んでから次入力を決めるため、`stdin←AI出力` / `AI入力←stdout` の双方向観測ループは原理的に消せない。消せるのは JSON 組み立ての重さと接続し直しコストのみ。
- **プリミティブは「ローカル PTY を 1 個握る」だけ。** SSH・docker・wsl・tmux は専用ツールにせず、**その PTY の中へ `send` する 1 コマンド**へ格下げする。セッション種別をツールレベルで区別しない。
- **起点となる 4 ツール**: `pty_open()` / `pty_send(id, text)` / `pty_read(id, timeout)` / `pty_close(id)`。SSH 接続は `pty_send(id, "ssh home\n")` のように表現する。
- **バックエンド第一候補は tmux**（`capture-pane` で画面スナップショット・差分・再接続が得られる）。
- **完了境界の検出は quiescence 方式が第一候補**: 画面出力が一定時間変化しなくなったら完了とみなす。プロンプト文字列マッチは弱い（PS1 カスタマイズ・ネストで層ごとにプロンプトが変わる・誤検出）ため採らない。
- **適用対象は POSIX（Linux / WSL2 / macOS）を第一**とし、**Windows ネイティブも対応**（tmux が無いため全 tmux 呼び出しを `wsl.exe -e tmux` 経由へ橋渡しする。design-plan §9.6・§11 参照）。

## 実装時に必ず踏む難所（design-plan §7・§10）

正面から来る本質的課題。着手前にどれに触れるか意識すること。

- **完了境界の検出（最難関）**: quiescence の閾値設計（静止判定時間と長時間コマンドの両立）が未決。
- **状態追跡**: 今どの層（local/remote/container）・どの cwd か。PTY 内シェルの状態は外から見えにくく、ネストで複雑化。未決。
- **ANSI エスケープのノイズ**: 色・カーソル制御や全画面アプリ（vim/top）の再描画がトークンを食う。read 側で間引くか、生/整形を用途で切り替える層が要る。未決。
- **安全性ガード**: 生テキスト直送は部分実行・改行タイミングによる意図しない実行のリスク。構造化ツールが持っていた「明示的コマンドにガードを挟める」利点が薄れる。未決。

これらの未決事項（A〜F）に関わる実装・判断をするときは、design-plan の §10 を更新し、「決定事項（§9）」と整合させること。

## 調査資産: RAG コーパス (rag/)

**思想**: 設計判断は推測でなく一次資料の根拠で行う（design-plan も「実測」を重んじる）。だから調査で参照したソースは**読み捨てない**。参照資料は Microsoft **MarkItDown** で忠実に Markdown 化し（要約ではなく全文保全）、`rag/` に再利用可能な資産として蓄積する。

**構造**:

- `rag/sources/<topic>/<slug>.md` — 一次資料。冒頭に YAML front-matter（`title` / `source_url` / `source_type` / `fetched` / `topic` / `tags` / `summary` / `relevance` / `chars`）。topic は `prior-art` / `completion-detection` / `backends` / `ansi-handling` / `safety`。
- `rag/INDEX.md` — 人間可読の総目次（topic 別・1行要約・各 doc へのリンク）。**まずここを読む。**
- `rag/manifest.json` — 機械可読インデックス（chunk/embed 用。将来のベクタ索引の素体）。
- `rag/briefs/` — 一次資料を統合した分析（出典は sources/ を参照）。
- `rag/ingest.py` — 取り込みツール（RAG 化の唯一の経路）。

**取り込み手順**（新しく調べたら必ず同じ方式で追記）:

1. ソース1件ごとに `{url, slug, topic, title, source_type, tags, summary, relevance}` を JSON 配列にする（GitHub は raw README URL、論文は arXiv PDF を URL にする）。
2. `python3 rag/ingest.py <sources.json>` → 各ソースを取得し MarkItDown 変換、front-matter 付きで `rag/sources/` に保存、`manifest.json` をマージ更新。失敗ソースはスキップして報告。
3. `INDEX.md` を manifest から更新。

MarkItDown は専用 venv（`/home/kite/.local/share/markitdown/venv`）に導入済み。PDF は `pdfplumber`、Office 系は `[all]` 拡張で対応済み。

**活用法**（調査・設計・実装の前に必ず）:

- **まず `rag/INDEX.md` を読む**。該当資料を `rag/sources/` から取り出して再利用し、同じソースを再フェッチしない。
- 設計判断（特に未決事項 A〜F）は rag の出典を引いて行う。「なんとなく」で決めない。
- 新規に調べた資料は、その場で上記手順でコーパスに追加してから次へ進む。

## 実行主体の区別（重要・混同しやすい）

- **このチャット環境（claude.ai/アプリ）**: 外部 SSH 不可。`bash_tool` の許可ドメインが npm/github/pypi 等に限定され、自宅サーバーには届かない。
- **自宅サーバーを実際に操作する実体**: Claude Code 側（WSL2）。チャットとは別プロセス・別コンテキストで状態を共有しない。

→ 効率化・新設計を適用・実機検証する対象は **WSL2 側**。

## ドキュメントの扱い

design-plan は「議論継続中のスナップショット（叩き台）」と明記された生きた文書。議論が進んだら §9（決定）/§10（未決）を追記・改訂する前提で書かれている。設計判断を変えたら、コードだけでなくこの文書も同期させる。

## 2026-07-14 Grok OAuth 正本

Grok/Composer の managed `GROK_HOME` と fake `HOME` は隔離のまま維持する。認証は vendor の `GROK_AUTH_PATH` に通常正本を明示し、managed home へ auth/lock を symlink・copy しない。aiterm は lock/copy-back を所有しない。親の `GROK_AUTH_PATH` は絶対安全pathのみ尊重し、未指定時だけ通常auth不在を `XAI_API_KEY` で許す。

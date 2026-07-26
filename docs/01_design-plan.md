# AIターミナル直接操作 設計計画書（作業版 v0.1）

## 0. このドキュメントの位置づけ

議論継続中のスナップショット。確定ではなく叩き台。
「決定事項」と「未決事項」を末尾で分離している。議論が進んだら追記・改訂する前提。

略語は初出で展開する:
- PTY (pseudo-terminal / 疑似端末): プロセスに端末を提供するカーネルの仕組み
- TTY (teletypewriter): 端末デバイス。プロセスが「対話的な端末につながっているか」の判定対象
- MCP (Model Context Protocol): AIに外部機能を提供するツール接続規格
- ANSI エスケープシーケンス: 色・カーソル移動などを表す制御文字列
- quiescence (静止): 画面出力が一定時間変化しなくなった状態
- fail2ban: ログイン試行を監視し、閾値超過のIPを遮断するツール
- MOTD (Message of the Day): ログイン時に表示される案内文

---

## 1. 目的

AIが SSH・ローカルを問わずターミナルを直接操作できる構造を作る。
現状の「ツール経由でコマンドを1個ずつ投げて結果を受け取る」細切れ往復を解消し、持続するセッションを握れるようにする。

---

## 2. 現状分析

### 2.1 今のClaude実行環境（実証済み）

このチャット環境の `bash_tool` は非対話バッチ実行。実測:
- `tty` → `not a tty`
- stdin / stdout ともに NOT a TTY
- 各コマンドは `sh -c` 経由の独立プロセス（PPID=1）

つまりコマンド文字列を1回投げる → 非対話シェルで実行 → プロセス終了後に stdout/stderr がまとめて返る、というリクエスト/レスポンス型。状態を持った端末セッションを握っていない。

### 2.2 SSH一発実行の問題

各操作が独立プロセスのため、`ssh host "cmd"` をN回投げると毎回フルで「TCP接続 → 鍵交換 → 認証 → 実行 → 切断」を繰り返す。発生コスト:
- 認証が毎回走る（ハンドシェイクのオーバーヘッド）
- 接続確立レイテンシが毎回乗る → 速度低下
- サーバーのauthログにログイン/ログアウトが大量記録
- fail2ban や `MaxStartups`・接続レート制限による遮断
- ログインのたびのMOTD等が出力トークンに乗る → トークン浪費

### 2.3 実行主体の区別（重要）

- このチャット環境（claude.ai/アプリ）: 外部SSH不可。bash_toolのネットワーク許可ドメインが npm・github・pypi 等に限定。自宅サーバーには届かない。
- 自宅サーバーを実際に操作している実体: Claude Code 側のインスタンス（WSL2環境で動作）。このチャットとは別プロセス・別コンテキストで状態を共有しない。

→ 効率化/新設計を適用する対象は WSL2 側。

---

## 3. 設計判断の核心：何が消せて何が消せないか

### 3.1 消せる無駄

- 構造化ツールコール（JSON）の組み立て・パースの重さ
- セッションが毎回切れること（接続し直しコスト）
- コマンド単位の細切れ往復

### 3.2 消せないもの：双方向チャネル＝観測ループ

「AIが文字を吐くのが速いのだから、そのままターミナルに流せばいい」は半分正しいが、落とし穴がある。
AIは「次に何を打つか」を stdout を読んでからでないと決められない。エラーが出たか、対話プロンプト（`[y/N]` 等）が出たか、コマンドが何秒かかっているか——これを観測せずに打ち続けるのは盲目操作で、想定外が1個出た瞬間に破綻する。

AIは常時ストリームを監視する常駐リアルタイムプロセスではなく、呼ばれたときに動く。したがって「出力を読む → 次を生成」のループは原理的に必須。`stdin ← AI出力` と `AI入力 ← stdout` の双方向チャネルは消せない。これを「ツール」と呼ぶか「パイプ」と呼ぶかは形式の差にすぎず、機能としては必ず要る。

### 3.3 結論

理想は「ツールゼロの生直結」ではなく「永続セッションを握る薄いツール」。
消せるのは JSON の重さと細切れ往復。消せないのは観測ループ。

---

## 4. 一般化：SSHはターミナルの特殊例ではない

ローカルターミナル（WSL2のbash、PowerShell、zsh）もSSHも、プロセスから見れば「PTYにstdinを流してstdoutを読む」だけで同一構造。SSHが特別なのは接続・認証・切断コストがある点のみ。

さらに一段下げると:

**SSHは「ローカルPTYの中で打つ1コマンド」にすぎない。**

- ローカルにPTYを1個開く（これがプリミティブ）
- 中で `bash` が動けばローカルシェル
- 中で `ssh home` を打てばリモートシェル
- 中で `docker exec -it x bash` を打てばコンテナ内
- 中で `wsl` / `tmux` でも同様

→ プリミティブは1個でよい。「ローカルにPTYを握る」だけ。SSH・docker・wsl は全部「そのPTYの中で send するコマンド」に格下げされる。セッションの種類をツールレベルで区別しない。

---

## 5. 最小インターフェース（案）

```
pty_open()            → PTYを1個起動しシェルをアタッチ、id を返す
pty_send(id, text)    → stdin に生テキストを流す（改行含む）
pty_read(id, timeout) → stdout を読む
pty_close(id)
```

SSH接続は `pty_send(id, "ssh home\n")`、コンテナ侵入は `pty_send(id, "docker exec -it x bash\n")` のように、すべて send で表現する。

---

## 6. バックエンド：tmux（案）

tmux をバックエンドにする利点:
- 画面スナップショットを取れる（`capture-pane`）
- セッションがクラッシュしても再接続できる
- 画面の差分が取れる
- 後述の完了境界検出（quiescence方式）と相性が良い

---

## 7. 一般化で共通化される技術課題

SSH特有ではなく「ターミナルの本質的な難しさ」として全環境に共通する。1個解けば全環境に効く反面、正面から来る。

### 7.1 完了境界の検出（最難関）

出力が「いつ終わったか」の判定。
- プロンプト文字列で判定する方式は弱い: `PS1` はカスタマイズされ得る／`ssh home` で中に入った瞬間リモート側プロンプトに変わりローカルの検出ロジックが効かない／出力中にプロンプトらしき文字列が出る誤検出
- ネスト（local → ssh → docker）で「どのプロンプトを待つべきか」が層ごとに変わり悪化
- 対策案: tmux の画面スナップショットを使い「一定時間変化しなくなったら完了とみなす」(quiescence検出)。プロンプトの形にもネスト深さにも依存しない。

### 7.2 状態追跡

今ローカルか・どのリモートか・どのコンテナか・カレントディレクトリはどこか。
PTY内のシェルは状態を持つが、外から見えにくい。ネストすると追跡が複雑。→ 未決。

### 7.3 ANSIエスケープのノイズ

PTY出力に色・カーソル移動の制御文字が混入。生でAIに渡すとトークンを食う。`vim`・`top` 等の全画面アプリは画面再描画でさらに増える。→ read 側でエスケープを間引くか、生/整形を用途で切り替える層が要る。

### 7.4 安全性

生テキスト直送は、コマンド途中までの部分実行や改行タイミングによる意図しない実行のリスクがある。構造化ツールコールが持っていた「コマンドが明示的でガードを挟める」利点が薄れる。→ ガード設計は未決。

---

## 8. 代替・フォールバック案（記録用）

PTY設計を採らない場合の小手先効率化として、SSH接続多重化を記録しておく。
WSL2側 `~/.ssh/config`:

```
Host home
    HostName <自宅サーバーのアドレス>
    User <ユーザー名>
    Port <ポート>
    IdentityFile ~/.ssh/id_ed25519
    ControlMaster auto
    ControlPath ~/.ssh/cm-%C
    ControlPersist 600
    ServerAliveInterval 30
```

最初の1回でマスター接続を張り、以降の `ssh home` を同一TCP接続に多重化。認証1回・以降ハンドシェイクゼロ。加えてサーバー側ユーザーホームで `touch ~/.hushlogin` によりMOTDを抑制、`config` に `LogLevel QUIET`。
ただしこれはセッション持続の代替であり、対話アプリ（vim/top等）や本計画の本筋（直接操作）は解決しない。

---

## 9. 決定事項（現時点）

1. 「ツールゼロ生直結」は採らない。観測ループは原理的に必須。
2. プリミティブは「ローカルPTYを1個握る」に最小化。SSH/docker/wsl は中で起動するコマンド扱い。
3. ツールは pty_open / pty_send / pty_read / pty_close の4個を起点とする。
4. バックエンド第一候補は tmux。
5. 完了境界は quiescence 検出を第一候補とする。
6. 適用対象は POSIX（Linux / WSL2 / macOS）を第一とし、**Windows ネイティブも全 tmux 呼び出しを WSL 経由へ橋渡しして対応**する（Windows にネイティブ tmux が無く、`/mnt` の 9p 上では AF_UNIX ソケットが使えないため、ソケットは WSL ネイティブ fs に置き、ログは `/mnt` 経由で Windows と共有する）。詳細は §11。
7. （2026-07-18 追記・v0.18.0）agent TUI への prompt 投入は「submit の成立」を保証できない（非ブロック dispatch の原理的帰結。実被弾: 子 vendor の startup ハング中に prompt が composer へ未 submit で座礁）。対処は D（安全性ガード）の一部として3層で確定: ①投入は tmux bracketed paste（pane negotiation）で原子化し、キー解釈由来の文字化け・Enter 取り落としを抑える ②ready gate は busy 表示中（esc to interrupt・実機根拠のある vendor のみ）を ready と数えない ③投入後に composer 残存の**陽性証拠だけ**を有界観測し receipt（`submit_residue`）で報告する——auto-retry・例外化はしない（観測と操作の分離。false は成立の保証ではないと契約に明記）。
8. （2026-07-19追記）通常PTYでPOSIX shellが前面にいる時のsanitize済み複数行は、改行を含まない単一の`eval`入力へ可逆変換してからsubmitする。全行をPTY queueへ先行投入すると、途中で起動したpager／REPLが後続行の先頭をキー入力として消費し、別commandへ変形する実障害が起きたため。単一行、`raw:true`、非shell前面は1 PTYの透過性を維持して直接pasteする。

## 10. 未決事項（次の議論）

- A. 状態追跡（今どの層・どのcwdにいるか）をどこで・どう持つか
- B. quiescence の閾値設計（静止判定の時間、長時間コマンドとの両立）
- C. ANSIエスケープの間引き方針と、生/整形の切り替え基準
- D. 安全性ガード（部分実行・破壊的コマンドの扱い）
- E. PTY1個プリミティブ＋中で何でも起動 という階層モデルの是非の最終確認
- F. 実証: Pythonの `pty` で「PTY1個を握り、中でbash、さらに別プロセスをネスト起動」が透過的に効くことの実機確認

---

## 11. 実装状況（MVP・2026-06-01）

`src/aiterm.py`（Python・外部依存は tmux のみ）として MVP を実装・E2E 検証済み。CLI 先行（後で MCP 化）。設計根拠は調査資産（`rag/` の 74 資料 + `rag/briefs/`）。

- §9 の追認: ツールは `open`/`send`/`read`/`close` + `key`（send_control 相当）。tmux バックエンド・quiescence・「SSH/docker は send で格下げ」を実装に反映。
- **F（実証）→ 解決**: tmux `send-keys` + `pipe-pane` ログで、bash → 中で Python REPL を握り `2**100` を継続対話、を**呼び出しプロセスをまたいで**実証。ssh/docker も同一機構（`send "ssh ..."`）。
- **B**: quiescence は固定 ms でなく「出力静止(≈2ポーリング) ∧ `pane_current_command` がシェルに復帰」で判定。`--until`(sentinel/prompt) と timeout を併用（4層）。長時間コマンドは pane が子プロセスのままなら誤完了しない。
- **C**: `read` は pipe-pane ログ→ 制御除去 / `\r`畳み / 反復圧縮 / head+tail 折りたたみ＋復元ヒント + メタ併記（RTK 由来）。TUI 向けに `--screen`(capture-pane) も用意。
- **D**: `send` 前に破壊的コマンドゲート（`--force` で越える）＋ペイロードの ESC・ブラケットペースト終端除去。POSIX shell前面のsanitize済み複数行は単一の改行なし`eval`入力へ符号化し、途中の対話programへの後続行誤帰属を防ぐ。`read` は制御文字を無害化して返す。
- **A（状態追跡）**: 層スタックの自動追跡は未実装（送った ssh/docker を呼び出し側で記録する方針。今後）。
- **MCP 化（2026-06-01）→ 完了。Node/TS の npm パッケージ `aiterm-mcp` へ移行し、2026-06-02 に npm 公開（`aiterm-mcp@0.1.0`・provenance 付き、リポジトリ `kitepon-rgb/aiterm-mcp`）**: 実装は `src/index.ts`（`@modelcontextprotocol/sdk`/stdio で 6 ツール公開）/ `src/core.ts`（ロジック・stdout 非汚染）/ `src/rtk.ts`（reducer）。`npx -y aiterm-mcp` で起動、ユーザースコープ global 登録（絶対パス・venv なし）。ローカル/ネスト(192.168.1.2)/永続/削減を実機検証。回帰テスト `test/`（`node:test` 77 件、CI で Node 18/20/22）。旧 Python 実装は `prototype/python/`（移植元・検証基準）。
- **`send rtk:true`（委譲）＋ `read rtk:true`（自前 reducer）→ 実装**: `src/rtk.ts`（rtk ファイル非複製・自作。**pytest は rtk 0.42.0 と一致**、ただし `FAILED` 要約行の理由は可読性優先で全文保持＝意図的に rtk と相違／grep／git status・log／簡易フィルタ）。`send` が last-cmd を記録し `read rtk:true` が直前コマンド別に適用。
- **クロスプラットフォーム（2026-06-02）→ Windows ネイティブ対応を追加（WSL2/macOS は維持）**: `src/core.ts` を OS 判定（`isWin`）で分岐。Windows は全 tmux 呼び出しを `wsl.exe -e tmux …` へ橋渡しする（`-e`＝ログインシェル非経由で `$`/`$?`/backtick/クオートが無損失。これが無いと wsl interop が `$` を展開して送信テキストを壊す）。ソケットは WSL ネイティブ fs（`/tmp/aiterm-<sha1(SOCKDIR)[:12]>.sock`。9p 上では AF_UNIX 非対応のため）、ログ／offset／lastcmd は Windows 一時領域に置き、pipe-pane が `/mnt/c` 経由で書いて Node が直接読む（9p の書込遅延 ≈150ms は完了判定前の `settleWinLog` で吸収）。POSIX 経路は完全に不変（WSL2・Windows ともに回帰テスト 91/91・skip 0、敵対的レビューで POSIX byte 一致を確認）。あわせてセッション名を全入口で `^[A-Za-z0-9_-]{1,64}$` に検証し、パストラバーサルと pipe-pane（tmux 内部 /bin/sh）へのインジェクションを遮断（pipe-pane のパスは単一引用符＋`'\''` エスケープ）。Windows からは `npm i -g`＋素の `aiterm-mcp` 登録で動作し、PowerShell は `pty_send "powershell.exe"` で入れ子に握れる（実機検証済み）。
- **macOS ネイティブ検証＆対応強化（2026-06-02）→ `aiterm-mcp@0.3.0` 公開**: macOS は従来 POSIX 経路（`isWin=false`）で「対応」扱いだったが実機未検証だった。実機（Apple Silicon・Homebrew tmux 3.6b）で回帰 92/92＋ライブ E2E（open/send/quiescence/uname/mark+until/screen/list/close）を確認し、macOS 固有の運用ギャップを `src/core.ts` の tmux 解決層で解消。`resolveTmux()` は `AITERM_TMUX`（明示指定）→ PATH → Homebrew 既定（`/opt/homebrew/bin`・`/usr/local/bin`）の順に解決しキャッシュ。GUI 起動（`launchctl` の既定 PATH に Homebrew bin が無い）でも tmux を発見し、使用時は stderr に告知（黙ったフォールバックを禁ずる）。tmux 不在時は空 stderr の握り潰しでなく `brew install tmux` を促す明確診断（`tmux()` の ENOENT も区別）。bash 3.2 の zsh 移行バナーは `new-session -e BASH_SILENCE_DEPRECATION_WARNING=1` で抑止（`-e` は tmux≥3.2 必須＝古い Linux tmux で落ちるため **darwin 限定**）。CI に `macos-latest`（Node 18/20/22・`brew install tmux`）を追加し `publish` を `needs: [test, test-macos]` 化。ソケットパス長（macOS 標準 TMPDIR で 80字 < 104 限界）・tmux フラグ（3.6b で Linux と同一）・reducer の BSD 出力非破損は 21 エージェントの監査で安全確認。POSIX/Windows 経路は不変。
- **完了検出にネスト早期返却を追加（2026-06-02・`aiterm-mcp@0.4.0`）**: ネスト中（前面が ssh/docker/REPL 等＝シェル集合外）かつ `until` 未指定では quiescence の「シェル復帰」条件が原理的に満たせず、従来はフル `timeout` を空費していた（批判①: until 付け忘れ→timeout 空費→`is_complete=False`→追加往復）。`waitCompletion` は出力静止時点で `[false, "nested"]` を**早期返却**する（待っても until/dead/quiescent いずれも発火し得ず確証は増えないため＝所要時間のみ短縮・確証は不変で過剰主張なし）。`is_complete` は確証層（until/dead/quiescent）のみ True とする whitelist に整理し、`nested` は False＋`until`/`mark` を促す注記を添える。`fg===""`（前面取得失敗）は早期返却せず従来どおり timeout まで待つ。回帰テスト `test/core-tmux.test.mjs` に nested 早期返却（前面 `cat` で再現）を追加（計93）。§10(C 完了境界)の改善で、根本の「ネスト越え完了判定の不可能性」自体は未決のまま（until/mark が引き続き確証手段）。
- **外部委譲 `delegate` の追加と撤去（2026-06〜・`aiterm-mcp@0.5.0`–`0.6.0` で追加、`0.7.0` で撤去）**: 非対話ワンショットで実装/レビューを外部AI(Codex)へ委譲する `delegate` を 0.5.0 で追加、0.6.0 で `backend`(codex|grok)＋出力整形。しかし非対話ワンショットは aiterm の対話パラダイムと不整合のため 0.7.0 で撤去（非対話委譲は codex-sidecar の責務、aiterm は対話端末に専念）。
- **対話エージェント起動ツール（2026-07-04・`aiterm-mcp@0.7.0`）→ 計 9 ツール**: `codex_agent`/`grok_agent`/`composer_agent` を追加（決定は ADR 0002）。各ベンダー CLI の対話 TUI を新しい永続 PTY 内に起動し `session_id` を返す＝以後は通常の `pty_read`/`pty_send` で駆動（新しい操作モデルは足さない・ADR 0001 の 1 PTY モデルの上に乗る）。あわせて名前なし open の自動採番の TOCTOU 競合を並行安全化。
- **エージェント起動の堅牢化（2026-07-04・`aiterm-mcp@0.7.1`）→ 回帰計 97**: 前提検証を effort→bin→cwd の順で session 作成前に完了させ失敗時の残骸ゼロを保証（cwd 不存在の偽成功を解消）。`reasoning_effort` を grok/composer で enum 強制、`pipe-pane` 失敗を検知、自動採番を高並行で nonce 名へフォールバック。`test/core-agent.test.mjs` 4 本追加。MCP サーバの wire バージョンを package.json から実行時取得（旧 `"0.4.0"` ハードコードの乖離を是正）。
- **agent_done（2026-07-07・`aiterm-mcp@0.9.0`/`0.9.1` 公開）**: `*_agent(agent_done:true)` と `pty_send(wait:"agent_done")` を追加。公開ツール数は増やさず、vendor Stop hook を完了境界に使う。Codex は managed `CODEX_HOME` を launch ごとに作り、通常 `~/.codex/hooks.json` は触らず、Stop chain を aiterm が単独所有する。v0.9.1 で Codex managed home は allowlist 化し、通常 Codex home からは `auth.json` だけを symlink、`config.toml` は managed home へ private copy、その他の state/cache/session entry は共有しない。Grok/Composer は managed `GROK_HOME` + fake `HOME` + `HOME/.grok -> GROK_HOME` symlink で compat hook/plugin 混入を抑える。OAuth は通常 Grok home の `auth.json` と `auth.json.lock` をセットで共有した（0.9.1当時）。この方式は2026-07-14に廃止し、現在は検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡し、managed homeへauth/lockを置かない。event file は secure state root 配下の `<session>.<launch_id>.events.jsonl`、現在ターン境界は送信直前 EOF。Codex/Grok/Composer は実 smoke 済み。Grok/Composer は `grok login` 後に Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smokeも通過。同一 cwd の Codex/Grok/Composer 並列 agent_done smoke、普通PTYの Python REPL smoke、security/schema/screen-settle/release-metadata 回帰も通過。MCP stdio server を実起動した JSON-RPC `tools/call` 経由 smoke でも、3 vendor同時 agent_done と普通PTY Python REPL が通過。v0.9.1 の npm publish、Official MCP Registry 登録、global install smoke、GitHub Release 反映まで完了済み。
- **managed Codex custom role継承（2026-07-18・v0.18.2公開）**: allowlistへsource `CODEX_HOME/agents/*.toml`の起動時snapshotを追加する。定義ファイルsymlinkは実体をprivate regular fileへ複製し、session/cache等は引き続き共有しない。aiterm所有Stop hookはprocess-localの`--dangerously-bypass-hook-trust`で実行するためhook trust stateの別copyは不要。project directory trustは別の安全gateであり、private `config.toml` snapshotから既存状態を継承する一方、未trust cwdは自動承認しない。
- **launcher 初回 prompt wait（2026-07-09・`aiterm-mcp@0.10.0` 公開）**: `codex_agent` の起動時 `prompt` に `wait:"agent_done"` を追加。これは `codex_run` 系 runner ではなく、永続 TUI session を作ったうえで初回 prompt だけを TUI ready 後に送り、その初回ターンの Stop hook を待つ convenience route。`wait:"agent_done"` は `prompt` と `agent_done:true` が必須で、暗黙に hook を有効化しない。prompt は shell command line に載せず TUI に後送するため、複数行日本語 prompt の shell continuation 表示を避ける。TUI がログイン画面などで ready にならない場合は prompt を送らず `initial_prompt=not_sent` を返し、session を残す。起動時 prompt が `pending`/`sent` の間は通常 `pty_send` を拒否し、後続入力の混入を防ぐ。通常 `pty_read` は agent 補助 metadata（`agent_event_seen` / `completion_attribution=none` / `initial_prompt` など）を出すが、stale Stop hook を通常 read の `is_complete=True` には昇格しない。Codex は単一行・長文日本語・複数行日本語で実 smoke 済み。Grok/Composer の同 route は OAuth browser approval で停止し、prompt 未送信の安全側挙動を確認したため、公開 schema には出さず、ログイン承認後の再 smoke を残す。
- **Claude対話launcher（2026-07-16・実装済み／live受入完了）**: `claude_agent`をAiterm所有の永続PTYへ追加した。`claude -p`のcompleted-turn反復ではなく、利用者がattachできる同じClaude Code TUI sessionへ初回／follow-upを送り、managed Stop hook、bounded result、timeout後回収、`pty_key(C-c)`／closeを既存PTY操作へ接続する。promptless managed launchは任意の`launch_operation_id`でsession／provider／launch引数digestへ相関でき、同一要求のresponse lossをCLI再起動なしのstructured receiptへexact replayする。Aitermはtransportだけを所有し、Observer／Throughline／Mailboxを内包しない。設計は[ADR 0003](adr/0003-claude-agent-launcher-contract.md)と[ADR 0013](adr/0013-claude-agent-exact-launch-replay.md)、受入履歴は[15_claude-agent-plan.md](15_claude-agent-plan.md)を正とする。
- **managed Claude approval relay（2026-07-19・v0.19.0 source）**: isolated settingsの正常な権限確認とactive operation入力拒否が組み合わさるデッドロックを、専用`claude_approval`で解消する。inspectはactive operationと現在画面のSHA-256 digestを返し、respondは同じoperation・同じdigestをsend lock内で再検証して単発Yes／Noだけを送る。任意文字列・恒久許可・未知UIは拒否し、operation markerは維持、本文を含まないowner-only receiptだけを保存する。設計は[ADR 0015](adr/0015-managed-claude-approval-relay.md)を正とする。
- **GPT-5.6/Grok 4.5 世代モデル整合（2026-07-11・`aiterm-mcp@0.11.0` 公開）**: dotagents 再配線からの改修依頼4件（docs/10 が正本・全消化）。3ツールに `model` 引数を追加（codex=`-m`・grok/composer=`--model` 上書き。空/空白は session 前拒否）。`grok_agent` 既定をライブカタログ実測に合わせ `grok-build`→`grok-4.5` へ。codex managed `CODEX_HOME` の config copy は引数の `model`/`reasoning_effort` に対応する top-level ピンを上書き（未指定キーと `[table]` 以降は原文保持）＝端末の ultra ピン等が対話子へ黙って波及しない。codex 起動応答は実効 model/effort と出所（引数/端末config継承/CLI既定）を常時明示し、実効 effort=ultra は proactive 自動委譲 ON を警告。grok/composer への `reasoning_effort` 指定は起動前に明示エラー（grok CLI `--effort` は headless 専用・対話 TUI では警告の上無視されるため。旧 enum 撤去）。前提検証順は model/effort→bin→cwd。実起動検証（codex 引数 terra が端末ピン sol を無視・grok footer `Grok 4.5 (high)`・composer OK）と回帰183件 green まで確認。
- **factory runtime error projection（2026-07-13・v0.12.2公開済み）**: aiterm-mcp 自身が offline aggregate store と schema を所有し、schema-exact canonical dotagents factory config の `collection.enabled === true` だけを収集opt-inとする。core の PTY dependency・persistence・vendor launcher owner layer が固定 code だけを一度記録し、typed telemetry-owned error により上位vendor/cleanupで再計上しない。JSON-RPC adapter も重複記録しない。保存は固定 template、SHA-256 fingerprint、count/first/last、open/resolved、monotonic sequence に限定し、raw exception/stderr/stack/prompt/PTY/transcript/event/path/context は API で拒否する。保存JSONはexact field・固定定義・fingerprint再計算後のDTOだけを公開。MCP側の収集/diagnosticsはtimeout付きchild processへ隔離し、FIFO/停止filesystemでも本体を止めない。lockはPID＋process start identity＋tokenで、stale/ambiguousはABA回避のため明示削除。POSIXはevery readでowner/mode、Windowsはcurrent SID-only DACLを再構築/readbackする。store failure は元の PTY/MCP result を変えず固定 stderr のみ。`aiterm-runtime-errors snapshot|ack|resolve|reopen` を dotagents consumer 入口とし、unacknowledged record は retention で削除しない。Windows native は path/DACL/timeout の純粋テストのみで、この変更では実機統合成功を主張しない。
- **Grok OAuth 正本（2026-07-14）**: managed `GROK_HOME`/fake `HOME` は維持する一方、Grok公式 `GROK_AUTH_PATH` を通常auth正本へ渡す。managed homeへauth/lockは置かず、aitermはlock・copy-back・credential優劣判定を行わない。正本はowner/regular/no-link/0600/サイズ/JSON objectを起動前検証し、親指定は絶対pathのみ尊重する。未指定の通常auth不在だけを`XAI_API_KEY`で許す。
- 残課題: 状態追跡(A)・ネスト層の完了判定（ssh 中は前面コマンドが ssh でシェル復帰判定が効かない＝`--until` で代替）、`ls`/`git diff` の自前版（再実行型ゆえローカルは委譲がカバー）、フィルタ拡充、Windows 専用分岐（`wsl.exe` 橋渡し・preflight・settle）は CI の必須 windows-latest job で純粋層を検証し、WSL ブリッジ統合は手動 Windows 検証に依存する。
- **B方式統一と親向け完了push（2026-07-18・`aiterm-wait` 実装済み／live E2E待ち）**: オーナー裁定により子agent呼び出しの使い方を「投げっぱなし→後で回収」（B方式）へ統一し、完了通知は新bin `aiterm-wait`（`dist/aiterm-wait-cli.js`）が担う。`core.observeAgentDone()`（新規export）はevents.jsonlの**純リーダー**として完了eventを待ち、`aiterm.agent-wait-result.v1` receipt（outcome `done`/`timeout`/`closed`）を1行出してexitする。lock・PTY・metadata書込・dispatch状態には一切触れないため、MCPサーバ・複数waiter・close/killAllと無競合（launch_id単位の隔離で多重同時呼び出しも誤帰属なし）。dispatchは`claude_turn issue(timeout:0)`／`pty_send(wait:"agent_done", timeout:0)`でready gate・submit分離を通した上で即返る（timeout=0受理は実ソース反証済み）。親がClaude Code系harnessならwaiterをbackground起動→exit時のre-invokeがpush通知になる。Codex親は上流に受け口が無く（`notify`は人間向け・MCP notificationはtracing行き。openai/codex#17543/#18056）、条件「確認行為ゼロ」のみ上流待ちと明記。回帰は`test/aiterm-wait.test.mjs`の16件（observe純リーダー保証・stale境界・operation相関・closed・lock無干渉・metadata不変・CLI envelope）。実Claude Code親のlive E2Eは2026-07-18に通過: 実codex子で waiter background起動→`sendAndWaitAgentDone(timeout:0)` dispatch→親ターン終了→waiter exitでharness re-invoke→receipt（outcome=done・turn_id一致）→`readAgentTranscript` で本文回収→close まで確認。
- **待たない照会の語彙分離（2026-07-26・v0.20.0 source）**: `aiterm-wait --timeout 0` は以前から「待たずに一度だけ観測する照会」として動いていたが、未完了を`timeout`（既定600秒待って終わらなかった）と同じ語で返していたため、軽い照会の答えが失敗・異常として親へ届いていた。`outcome`へ`running`（exit 5）を足し、`timeout=0`の未完了だけをこれに割り当てる。1秒以上の待機の未完了は`timeout`のまま＝待ち方の意味は変えない。outcome→exit codeの対応表は全outcomeを型で網羅強制する（語を足して表を直し忘れると`undefined`からexit 0になり、未完了が完了として親へ届くため）。`closed`と未知sessionは`running`へ倒さない。照会はreceipt・tool descriptionで宣伝せず、押し込み機構を持たない親向けの逃げ道としてREADMEにだけ置く＝[ADR 0017](adr/0017-non-blocking-dispatch-guidance.md)で排した「親が子のお守りをする」誘惑を戻さない。MCPの公開toolとschemaは不変で、影響は`aiterm-wait`のreceiptだけに閉じる。設計は[ADR 0018](adr/0018-agent-wait-running-outcome.md)を正とする。
- **非ブロック案内の反転とホスト別起動形の名指し（2026-07-26・v0.19.3 source）**: v0.16.0でパラメータからwaitを構造的に消した後も、実運用では親がブロックする使い方へ流れた。残っていたのはパラメータでなく**案内の文型**である。全descriptionが「即返る」の直後に完了待ち手順を続けてdispatch→waitを一続きの手順に見せ、「待たなくてよい」という許諾がどこにも無く、起動形も「ホストのバックグラウンドタスクとして実行」という抽象名詞だけだったため、具体形を知らない親がforeground実行へ落ちて既定600秒ターンを塞いだ。オーナー裁定「Aitermでサブエージェントを呼ぶ時、並行以外あり得ない」により、「子の答えに依存する時は親が待つのが正しい」を棄却する。背景プロセスのexitで親を再invokeするharnessでは「待つ以外できない」局面が存在せず、子が1体でも親は制御を返すべきで、並行とは子同士だけでなく**親と子の並行**を指す。対処は①案内の第一文を「投げっぱなしでよい＝ここで待たない」の宣言へ反転しforeground禁止を本文へ含める、②MCP initializeの`clientInfo.name`から親ホストを判別し、receiptがそのホストの実際の呼び出し形（`claude-code`なら`Bash(command: ..., run_in_background: true)`）を名指しする、③tool descriptionは`registerTool`時＝initialize前に固定されるためホストを名指しできず汎用の断定形を持つ（ホスト別の具体形はreceiptが所有・descriptionの動的差し替えはしない）、④復旧案内も同文型へ揃え`--cursor 0`は維持。**待つ主体はwaiterプロセスであって親ではない**が分界で、`aiterm-wait`の既定timeout・exit契約・outcome語彙・公開schema・完了判定は不変。設計は[ADR 0017](adr/0017-non-blocking-dispatch-guidance.md)を正とする。`--timeout 0`の一発照会に`running` outcomeを足す案は、公開enum追加が消費者のexhaustive switchを壊すため本変更へ混ぜず別タスクとして残す。
- **wait全廃・dispatch統一（2026-07-18・v0.16.0 source）**: オーナー裁定「waitする運用は親を止めるのでありえない。引数を減らし使い方のパターンを減らす」。`pty_send(wait:"agent_done")`・launcher の agent_done/wait/timeout・`claude_turn issue` の timeout を全廃し、①launcher は常に managed 起動、②agent session への `pty_send` は非ブロック dispatch（`aiterm.pty-send-result.v1` の event_cursor が相関境界）、③完了待ちは `aiterm-wait --cursor` へ一本化（純リーダー・起動順序非依存）、④回収は `pty_read(agent_transcript)`／`claude_turn recover`。誘惑構造（同期オプションがあると orchestrator が吸い寄せられて親が最遅の子に人質化する）をパラメータ削除で構造的に封じた。core は sendAndWaitAgentDone 系と wait lock 取得を削除（close/killAll の他プロセス lock 検査は残置）。

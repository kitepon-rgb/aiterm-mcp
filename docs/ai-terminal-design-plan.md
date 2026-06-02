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
- **D**: `send` 前に破壊的コマンドゲート（`--force` で越える）＋ペイロードの ESC・ブラケットペースト終端除去。`read` は制御文字を無害化して返す。
- **A（状態追跡）**: 層スタックの自動追跡は未実装（送った ssh/docker を呼び出し側で記録する方針。今後）。
- **MCP 化（2026-06-01）→ 完了。Node/TS の npm パッケージ `aiterm-mcp` へ移行し、2026-06-02 に npm 公開（`aiterm-mcp@0.1.0`・provenance 付き、リポジトリ `kitepon-rgb/aiterm-mcp`）**: 実装は `src/index.ts`（`@modelcontextprotocol/sdk`/stdio で 6 ツール公開）/ `src/core.ts`（ロジック・stdout 非汚染）/ `src/rtk.ts`（reducer）。`npx -y aiterm-mcp` で起動、ユーザースコープ global 登録（絶対パス・venv なし）。ローカル/ネスト(192.168.1.2)/永続/削減を実機検証。回帰テスト `test/`（`node:test` 77 件、CI で Node 18/20/22）。旧 Python 実装は `prototype/python/`（移植元・検証基準）。
- **`send rtk:true`（委譲）＋ `read rtk:true`（自前 reducer）→ 実装**: `src/rtk.ts`（rtk ファイル非複製・自作。**pytest は rtk 0.42.0 と一致**、ただし `FAILED` 要約行の理由は可読性優先で全文保持＝意図的に rtk と相違／grep／git status・log／簡易フィルタ）。`send` が last-cmd を記録し `read rtk:true` が直前コマンド別に適用。
- **クロスプラットフォーム（2026-06-02）→ Windows ネイティブ対応を追加（WSL2/macOS は維持）**: `src/core.ts` を OS 判定（`isWin`）で分岐。Windows は全 tmux 呼び出しを `wsl.exe -e tmux …` へ橋渡しする（`-e`＝ログインシェル非経由で `$`/`$?`/backtick/クオートが無損失。これが無いと wsl interop が `$` を展開して送信テキストを壊す）。ソケットは WSL ネイティブ fs（`/tmp/aiterm-<sha1(SOCKDIR)[:12]>.sock`。9p 上では AF_UNIX 非対応のため）、ログ／offset／lastcmd は Windows 一時領域に置き、pipe-pane が `/mnt/c` 経由で書いて Node が直接読む（9p の書込遅延 ≈150ms は完了判定前の `settleWinLog` で吸収）。POSIX 経路は完全に不変（WSL2・Windows ともに回帰テスト 91/91・skip 0、敵対的レビューで POSIX byte 一致を確認）。あわせてセッション名を全入口で `^[A-Za-z0-9_-]{1,64}$` に検証し、パストラバーサルと pipe-pane（tmux 内部 /bin/sh）へのインジェクションを遮断（pipe-pane のパスは単一引用符＋`'\''` エスケープ）。Windows からは `npm i -g`＋素の `aiterm-mcp` 登録で動作し、PowerShell は `pty_send "powershell.exe"` で入れ子に握れる（実機検証済み）。
- **macOS ネイティブ検証＆対応強化（2026-06-02）→ `aiterm-mcp@0.3.0` 公開**: macOS は従来 POSIX 経路（`isWin=false`）で「対応」扱いだったが実機未検証だった。実機（Apple Silicon・Homebrew tmux 3.6b）で回帰 92/92＋ライブ E2E（open/send/quiescence/uname/mark+until/screen/list/close）を確認し、macOS 固有の運用ギャップを `src/core.ts` の tmux 解決層で解消。`resolveTmux()` は `AITERM_TMUX`（明示指定）→ PATH → Homebrew 既定（`/opt/homebrew/bin`・`/usr/local/bin`）の順に解決しキャッシュ。GUI 起動（`launchctl` の既定 PATH に Homebrew bin が無い）でも tmux を発見し、使用時は stderr に告知（黙ったフォールバックを禁ずる）。tmux 不在時は空 stderr の握り潰しでなく `brew install tmux` を促す明確診断（`tmux()` の ENOENT も区別）。bash 3.2 の zsh 移行バナーは `new-session -e BASH_SILENCE_DEPRECATION_WARNING=1` で抑止（`-e` は tmux≥3.2 必須＝古い Linux tmux で落ちるため **darwin 限定**）。CI に `macos-latest`（Node 18/20/22・`brew install tmux`）を追加し `publish` を `needs: [test, test-macos]` 化。ソケットパス長（macOS 標準 TMPDIR で 80字 < 104 限界）・tmux フラグ（3.6b で Linux と同一）・reducer の BSD 出力非破損は 21 エージェントの監査で安全確認。POSIX/Windows 経路は不変。
- **完了検出にネスト早期返却を追加（2026-06-02）**: ネスト中（前面が ssh/docker/REPL 等＝シェル集合外）かつ `until` 未指定では quiescence の「シェル復帰」条件が原理的に満たせず、従来はフル `timeout` を空費していた（批判①: until 付け忘れ→timeout 空費→`is_complete=False`→追加往復）。`waitCompletion` は出力静止時点で `[false, "nested"]` を**早期返却**する（待っても until/dead/quiescent いずれも発火し得ず確証は増えないため＝所要時間のみ短縮・確証は不変で過剰主張なし）。`is_complete` は確証層（until/dead/quiescent）のみ True とする whitelist に整理し、`nested` は False＋`until`/`mark` を促す注記を添える。`fg===""`（前面取得失敗）は早期返却せず従来どおり timeout まで待つ。回帰テスト `test/core-tmux.test.mjs` に nested 早期返却（前面 `cat` で再現）を追加（計93）。§10(C 完了境界)の改善で、根本の「ネスト越え完了判定の不可能性」自体は未決のまま（until/mark が引き続き確証手段）。
- 残課題: 状態追跡(A)・ネスト層の完了判定（ssh 中は前面コマンドが ssh でシェル復帰判定が効かない＝`--until` で代替）、`ls`/`git diff` の自前版（再実行型ゆえローカルは委譲がカバー）、フィルタ拡充、Windows 専用分岐（`wsl.exe` 橋渡し・preflight・settle）は CI（ubuntu/macos を実行）では実行されないため手動 Windows 検証に依存（CI に windows-latest を足すのは将来課題）。

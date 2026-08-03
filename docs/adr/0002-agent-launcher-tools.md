# 0002. 対話エージェント起動ツール（Codex / Grok / Composer）

> 2026-07-16追補: Claudeの追加契約は[ADR 0003](0003-claude-agent-launcher-contract.md)を正とする。
> 本文の3 launcher／tool countはADR 0002採用時の履歴であり、現行sourceはagent launcher 4、全11 toolsである。

## Context

ADR 0001 で「セッション種別（SSH / docker / REPL）ごとにツールを分岐させず、1個の PTY へ送る通常テキストとして扱う」と決めた。一方で、外部コーディングエージェント（Codex CLI・Grok Build）の対話 TUI を永続端末の中で起動して駆動したい需要が出た。

これらは素の `pty_send "codex"` でも起動できるが、素のネストだと摩擦がある:

- 起動前の前提検証（`reasoning_effort` の値域・CLI バイナリの所在・`cwd` の実在）が効かず、cwd 不存在などが `cd` のシェル内失敗として黙って通り「起動したフリ」の偽成功になる。
- バイナリ解決（`CODEX_BIN`/`GROK_BIN` → 既定パス → `PATH`）やモデル / effort の指定を毎回手で組む必要がある。
- 起動に失敗しても作成済みの PTY セッションが残骸として残る。

（v0.5.0–0.6.0 では非対話ワンショットの `delegate` ツールを試したが、aiterm の対話パラダイムと不整合のため v0.7.0 で撤去した。非対話委譲は codex-sidecar の責務とし、aiterm は対話端末に専念する。）

## Decision

- ベンダー別に薄い対話エージェント起動ツールを追加する: `codex_agent`（Codex CLI）・`grok_agent`（`grok-build`）・`composer_agent`（`grok-composer-2.5-fast`）。モデルごとに 1 ツール＝ツール名を見ればどのモデルか分かる。
- 各ツールは新しい永続 PTY を開いてその中でベンダー CLI の TUI を起動し、`session_id` を返す。以後は通常の `pty_read` / `pty_send` で駆動する＝**新しい操作モデルは導入しない**（ADR 0001 の 1 PTY モデルの上に乗る）。
- 前提はすべて **session 作成前**に、`reasoning_effort` → CLI バイナリ → `cwd` の順で検証する。不正な effort（grok/composer は `low`/`medium`/`high`/`xhigh`/`max` の enum。codex は CLI 側の値域が版で変わるため縛らず自由文字列）・CLI 不在・`cwd` 不存在は明示エラーで弾き、失敗時にセッションの残骸を残さない。
- 2026-07-07 追補: `agent_done:true` を opt-in として追加する。これは起動ツールを増やさず、既存 `pty_send` に `wait:"agent_done"` を追加して vendor Stop hook の turn done まで待つための metadata/hook route を起動時に準備するもの。Codex/Grok/Composer は実 smoke 済み。Codex managed `CODEX_HOME` は v0.9.1 で allowlist 化し、通常 Codex home からは `auth.json` だけを symlink、`config.toml` は private copy、その他の state/cache/session entry は共有しない。Grok の OAuth は per-launch isolation を維持したまま、通常 Grok home の `auth.json` と `auth.json.lock` をセットで共有した（0.9.1当時）。この方式は2026-07-14に廃止し、現在は検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡す。Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke でも login 再要求なしを確認した。同一 cwd の3 vendor並列 smoke、MCP `tools/call` 経由の3 vendor同時 agent_done smoke、普通PTY Python REPL、hook/security/schema/screen-settle/release-metadata 回帰も通過済み。
- 2026-07-18 追補（v0.18.2）: Codex managed homeのallowlistへcustom role discoveryに必要な`agents/*.toml`を追加する。source symlinkは実体を起動時snapshot-copyし、managed homeからsource定義へリンクしない。aiterm所有Stop hookは`--dangerously-bypass-hook-trust`で当該processだけ実行するためhook trust stateは別copyせず、project directory trustは別安全gateとしてprivate `config.toml` snapshotから継承する。
- 2026-07-09 追補: `codex_agent` launcher に起動時 `prompt` 専用の `wait:"agent_done"` を追加する。これは `codex_run` / `grok_run` のような非対話 runner ではなく、永続 TUI session を残したまま、初回 prompt だけを TUI ready 後に送り、その初回ターンの Stop hook を待つ convenience route。`wait:"agent_done"` は `prompt` と `agent_done:true` が必須で、暗黙に managed hook を有効化しない。TUI ready failure では prompt を送らず `initial_prompt=not_sent` を返して session を残す。起動時 prompt が `pending`/`sent` の間は通常 `pty_send` を拒否し、後続入力の混入を防ぐ。通常 `pty_read` は agent event を補助 metadata として表示できるが、stale event を `is_complete=True` へ昇格しない。Grok/Composer launcher の初回 prompt wait は post-OAuth smoke が通るまで公開しない。
- 2026-08-02 追補: `codex_agent` / `grok_agent` / `composer_agent` は任意の`write_scope`（`"read-only"`または書込み許可パスの説明）を受け、指定値をlaunch receiptとagent metadataへそのまま記録し、`pty_list`にも表示する。Codex CLIはローカル`codex --help`で`--sandbox <SANDBOX_MODE>`の`read-only`値を確認済みなので、`codex_agent(write_scope:"read-only")`だけは`--sandbox read-only`を付与して実効的に書込みを禁止する。Grok/Composerは対話起動に対応するsandbox機構が無く、Codexのパス説明も同等のallowlist引数が無いため、これらは`write_scope_enforcement:"declaration_only_unsupported"`を返す宣言記録だけとする。省略時は既存のargv・receipt・metadata表示を変えない。
- 2026-08-03 追補: Codexの完了正本をmanaged Stop hookからroot rollout transcriptの`task_complete.turn_id`へ変更する。dispatchは毎turnのidle gate後にtranscript byte境界を`event_cursor`として返し、`aiterm-wait`はその境界以後だけを読む。Codex managed homeへ`hooks.json`を生成せず、`--dangerously-bypass-hook-trust`も渡さない。理由は、長寿命serverがHomebrew Cellarの版付きNode実体をhook設定へ固定し、更新後の`exit 127`で完了通知全体が失われた実障害と、Codex自身の構造化`task_complete`がhookより先に永続化される実測である。画面推定は代替正本にしない。
- これは ADR 0001 の「セッション種別ごとにツールを足さない」を破る例外ではなく、**対象が違う**。SSH / docker / REPL といった session *kind* は引き続きネスト（`pty_send`）で扱う。エージェント起動ツールは「ベンダー CLI の前提検証つきブートストラップ」という別カテゴリであり、PTY プリミティブの表面（6個）は薄いまま保つ。

## Consequences

- 公開ツールは PTY 6 + エージェント起動 3 = 計 9。PTY プリミティブの表面は 6 個で不変。
- ベンダー CLI の導入・認証はユーザー責任。未導入・未認証の環境では session 作成前に明示エラーになり、公開レジストリの他利用者を壊さない。
- モデル固定はしない（codex は CLI の既定、grok/composer は core が固定モデル名を渡す）。将来モデル選択が要るなら `model` 引数を足す余地を残す。
- 「ツールを絶対に増やさない」という以前の言い回しは設計原則ではなかった（撤回）。判断軸は「PTY プリミティブを薄く保ちつつ、ネストで届かない価値（前提検証つき起動）だけをツール化する」。
- `agent_done:true` は通常の vendor hook file を書き換えない。launch ごとの managed home で Stop chain を aiterm が単独所有し、hook wrapper は secure state root へ JSONL event を追記する。Codex では `auth.json` と private copy の `config.toml` だけを持ち込み、通常 `~/.codex` のその他 entry は共有しない。Grok/Composer では `GROK_HOME` 全体共有を避ける。0.9.1当時のcredential/lock symlink共有は2026-07-14に廃止し、現在はhook/config/session隔離を維持したまま検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡す。
- 2026-08-03以降、前項のStop chain所有はGrok/Composerに適用し、Codexはroot rolloutだけを完了正本にする。Codexの`event_cursor`はevent fileでなくtranscriptのbyte境界である。
- 2026-07-14 改訂: Grok/Composer はcredential/lockもmanaged homeへ共有しない。隔離homeを維持したまま、検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡す。lock/atomic replace/copy-backはvendor責務である。
- `pty_send(wait:"agent_done")` は普通PTY・`mark:true`・`rtk:true`・`enter:false` では送信前エラーにする。done はタスク成功ではなく turn 終了として表示する。
- `codex_agent` の起動時 `prompt + wait:"agent_done"` は session 作成後に TUI ready を待つため、prompt なし launcher より戻りが遅い。ready にならない場合でも失敗を隠さず、prompt 未送信の session を残して利用者が `pty_read(screen:true)` で確認できるようにする。
- ClaudeはADR 0003により同じ永続PTYモデルへ追加する。`claude -p`の反復は対話launcherの代替にしない。

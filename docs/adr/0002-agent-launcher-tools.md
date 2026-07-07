# 0002. 対話エージェント起動ツール（Codex / Grok / Composer）

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
- 2026-07-07 追補: `agent_done:true` を opt-in として追加する。これは起動ツールを増やさず、既存 `pty_send` に `wait:"agent_done"` を追加して vendor Stop hook の turn done まで待つための metadata/hook route を起動時に準備するもの。Codex/Grok/Composer は実 smoke 済み。Grok の OAuth は per-launch isolation を維持したまま、通常 Grok home の `auth.json` と `auth.json.lock` をセットで共有する。Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke でも login 再要求なしを確認した。同一 cwd の3 vendor並列 smoke、MCP `tools/call` 経由の3 vendor同時 agent_done smoke、普通PTY Python REPL、hook/security/schema/screen-settle 回帰も通過済み。
- これは ADR 0001 の「セッション種別ごとにツールを足さない」を破る例外ではなく、**対象が違う**。SSH / docker / REPL といった session *kind* は引き続きネスト（`pty_send`）で扱う。エージェント起動ツールは「ベンダー CLI の前提検証つきブートストラップ」という別カテゴリであり、PTY プリミティブの表面（6個）は薄いまま保つ。

## Consequences

- 公開ツールは PTY 6 + エージェント起動 3 = 計 9。PTY プリミティブの表面は 6 個で不変。
- ベンダー CLI の導入・認証はユーザー責任。未導入・未認証の環境では session 作成前に明示エラーになり、公開レジストリの他利用者を壊さない。
- モデル固定はしない（codex は CLI の既定、grok/composer は core が固定モデル名を渡す）。将来モデル選択が要るなら `model` 引数を足す余地を残す。
- 「ツールを絶対に増やさない」という以前の言い回しは設計原則ではなかった（撤回）。判断軸は「PTY プリミティブを薄く保ちつつ、ネストで届かない価値（前提検証つき起動）だけをツール化する」。
- `agent_done:true` は通常の vendor hook file を書き換えない。launch ごとの managed home で Stop chain を aiterm が単独所有し、hook wrapper は secure state root へ JSONL event を追記する。Grok/Composer では `GROK_HOME` 全体共有ではなく OAuth credential/lock だけを通常 Grok home と共有し、hook/config/session の隔離を維持する。
- `pty_send(wait:"agent_done")` は普通PTY・`mark:true`・`rtk:true`・`enter:false` では送信前エラーにする。done はタスク成功ではなく turn 終了として表示する。

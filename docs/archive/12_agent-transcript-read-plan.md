# 12 — agent transcript 読取（B5: 長い TUI 回答の構造的回収）

> **2026-08-04現行追補（v0.22.0）**: 本文の`pty_send(wait:"agent_done")`、managed vendor home、
> Codex Stop event joinは実装当時の履歴。現行sendは非ブロックdispatchで、Codexは通常`CODEX_HOME`の
> root rollout、Grok/Composerは通常`GROK_HOME`のsession historyを読む。Claudeは通常settingsへ加算した
> launch固有Stop hookのbounded resultを使いprivate transcriptを読まない。通常config／historyはcopy・filter・
> cleanupせず、環境境界は[ADR 0025](../adr/0025-shared-agent-environment-and-lineage.md)を正とする。

<!-- 前提: Fable 級統括（2026-07-11 時点）。docs/11 の確定指摘 B5 の設計正本＝実装 TODO を兼ねる -->

## 問題（docs/11 B5）

`pty_send(wait:"agent_done")` の返りは描画済み screen の tail（pane 高さ ≒ 24行）のみ。エージェントの回答が長いと切れる。pipe-pane ログは絶対座標再描画の soup（実測 raw ~27.5万 tok）で `line_range` でも実用にならない。実運用の回避は「本人に再掲させる」多ターン＝トークンと往復の無駄。

## 方針

各 vendor CLI はvendor home配下に**構造化された session transcript（JSONL）**を書く。v0.22.0では
その通常homeを直接使い、aitermは`vendor_session_id`、`cwd`、launch markerから自分が起動したroot sessionだけを
束縛して**直近ターンの最終assistantメッセージを平文で返す**。新ツールは足さず、既存readへopt-inを1個加える。

## 実測した transcript 構造（2026-07-11・実起動で採取）

### Codex（実測時はmanaged、現行は通常`CODEX_HOME`）
- パス: `<codex_home>/sessions/YYYY/MM/DD/rollout-<ISO時刻>-<vendor_session_id>.jsonl`
  （`vendor_session_id` はファイル名末尾に入る＝session 単位で一意特定できる）
- 最終回答レコード（いずれかを使う。両方確認済み）:
  - `{"type":"event_msg","payload":{"type":"agent_message","message":"<平文>","phase":"final_answer",...}}`
  - `{"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"<平文>"}],"phase":"final_answer","internal_chat_message_metadata_passthrough":{"turn_id":"<UUID>"}}}`
- **turn_id 完全一致 join が可能**: `response_item` assistant の`turn_id`と、同じroot rolloutに後続する
  `event_msg.payload.type="task_complete"`の`turn_id`が一致する。現行実装はStop eventを使わず、この
  vendor-owned completion recordで完了と最終回答を同じturnへ帰属する。

### Grok / Composer（実測時はmanaged、現行は通常`GROK_HOME`・同一構造）
- パス: `<grok_home>/sessions/<URLエンコード cwd>/<vendor_session_id>/chat_history.jsonl`
  - cwd の URL エンコードは `/` → `%2F`（実測: `%2FUsers%2Fkite%2FDeveloper%2Faiterm-mcp`）。`encodeURIComponent(cwd)` 相当。
- 各行: `{"type":"system|user|reasoning|assistant","content":...}`
  - assistant 行: `{"type":"assistant","content":"<平文文字列>","model_id":...,"model_fingerprint":...}`（content は**文字列**。codex の配列と異なる）
  - user 行のうち `synthetic_reason` を持つものは合成（実ユーザー入力でない）
- **per-row の turn_id は無い**。ターン境界は「最後の非 synthetic user 行より後ろの assistant 行群」で判定する。

## API 設計（最小サーフェス・新ツールなし）

`pty_read` に **`agent_transcript: true`**（boolean・既定 false）を追加する。

- 意味: session の vendor transcript から**直近の完了ターンの最終 assistant メッセージ**を平文で返す。
- 対象ターンの決定: vendorごとの構造化完了正本を使う。
  - Codex: bound済みroot rollout JSONLの最新`task_complete.turn_id`を採り、同じturnのassistant
    `output_text`を全収集してjoinする（複数ブロック対応）。Stop eventや画面文字列へfallbackしない。
  - Grok/Composer: chat_history.jsonl の「最後の非 synthetic user 行より後の assistant 行」の content を全収集して join。
- 返り: 抽出テキストを既存 `reduceOutput` に通して bound（行構造は本物の改行なので 60行 elide＋行内ガードが正しく効く＝screen tail の dumb な下24行切りより厳密に良い）。メタ行に `vendor` / `turn_id` / 生文字数を出す。
- 排他: `agent_transcript:true` は `screen`/`full`/`rtk`/`line_range`/`wait` と併用不可（明示エラー）。`lines` のみ許容（末尾 N 行）。
- 失敗系（フォールバック禁止＝黙って空を返さない）:
  - 非 agent session → 明示エラー（既存 loadAgentMetadata の文言を流用）。
  - transcript ファイル不在（まだ1ターンも完了していない等）→ 「transcript がまだありません。ターン完了後に再取得してください」明示エラー。
  - assistant メッセージ抽出ゼロ → 「最終 assistant メッセージを特定できませんでした（vendor=...）」明示エラー＋screen 併用を促す。

### 併記の利便（任意・実装が軽ければ）
`pty_send(wait:"agent_done")` / codex launcher の返りに、既存 screen tail はそのまま残し、末尾へ `agent_transcript` の抽出結果を1ブロック追記する `transcript:true`（既定 false）は**将来拡張として起票のみ**。まず read 側 opt-in を入れ、実運用で screen tail が切れたら `pty_read(agent_transcript:true)` で回収、の2手で足りるかを見てから判断する。

## 実装計画（チェックボックス＝TODO）

- [x] core.ts: `readAgentTranscript(name, {lines?}) : Promise<string>` を追加。
  - metadata から kind/cwd/codex_home|grok_home/vendor_session_id を取得。
  - Codex: managed homeで最初に作られたroot rolloutを`session_meta.payload.id`でbindし、後発sub-agent
    rolloutを除外する。最新`task_complete.turn_id`でassistant textを収集する。
  - Grok/Composer: `sessions/<encodeURIComponent(cwd)>/<vendor_session_id>/chat_history.jsonl` を読む。最後の非 synthetic user 以降の assistant content を収集。
  - 抽出テキスト→ reduceOutput でメタ付与して返す。
- [x] index.ts: `pty_read` に `agent_transcript` boolean を追加。併用禁止の検証。describe を書く。
- [x] test/core-agent.test.mjs: fake codex home（rollout JSONL 合成）と fake grok home（chat_history 合成）で、(a) 単一ブロック回収、(b) 複数 assistant ブロックの join、(c) 複数ターンで最新ターンのみ、(d) 非 agent session エラー、(e) transcript 不在エラー、(f) 巨大回答が reduceOutput で bound される、を回帰化。**上記「実測した構造」の record 形状を忠実に写した最小合成 fixture** を使う（実 35KB ダンプは環境詳細を含むので使わない）。
- [x] index.ts smoke: `agent_transcript` が schema に出る（ツール数は 9 のまま）。

## やらないこと（スコープ確定）

- 過去の任意ターン指定（turn_id 引数）は入れない＝直近完了ターン固定（「切れたから今すぐ回収」が主用途）。将来必要なら turn_id 引数で拡張。
- transcript 全履歴のページング・検索は入れない（session ログの責務でない）。
- `pty_send` 側の `transcript:true` 併記は起票のみ（上記）。
- vendor transcript フォーマットは外部仕様＝バージョンで変わり得る。**壊れたら黙って劣化させず明示エラー**にし、フォーマット前提を caveat 化する。

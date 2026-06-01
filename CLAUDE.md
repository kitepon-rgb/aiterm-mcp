# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 現状: Node/TS の npm パッケージ `aiterm-mcp`（stdio MCP サーバ）

OSS / NPM 公開前提で **Node/TypeScript の npm パッケージ**として実装（2026-06-01）。`npx -y aiterm-mcp`（または `npm i -g` 後に `aiterm-mcp`）で起動でき、**絶対パス・venv 依存はゼロ**。WSL2 の Claude Code に**ユーザースコープ（global）**で登録済み（`~/.claude.json`、command=`aiterm-mcp`、開発中は `npm link`）。`pty_open`/`pty_send`/`pty_read`/`pty_key`/`pty_close`/`pty_list` の 6 ツール。ローカル / ネスト(`ssh 192.168.1.2`) / 再起動跨ぎ永続 / 出力削減を実機検証済み。設計は `docs/ai-terminal-design-plan.md`、MCP 化の計画は `docs/mcp-server-plan.md`。

- **実装は Node/TS**（要件: Node>=18 + tmux）。`src/index.ts`（`@modelcontextprotocol/sdk` で 6 ツール公開・stdio）/ `src/core.ts`（tmux 制御・出力削減・完了検出4層・安全ガード・rtk委譲・last-cmd。**stdout に出さない**＝通信を汚さない）/ `src/rtk.ts`（コマンド別 reducer）。`npm run build` → `dist/`。`package.json` の bin=`aiterm-mcp`→`dist/index.js`。
- 削減と完了検出: `read` 既定で制御除去・反復圧縮・head+tail＋復元ヒント・メタ併記。`read rtk:true` は直前コマンド別の自前 reducer、`send rtk:true` は rtk バイナリへ委譲（rtk 不在は素通し）。完了検出は dead / `until` / quiescence(出力静止∧シェル復帰) / timeout の4層。SSH/docker はツール化せず `send "ssh ..."` で入る（ネスト）。tmux 常駐ゆえプロセスをまたいで永続し、人は戻り値の `tmux -S … attach` で覗ける。
- 出力削減の自前移植 `src/rtk.ts`（要件C: rtk ファイル非複製・自作。**pytest は rtk 0.42.0 と厳密一致**／grep／git status・log／簡易フィルタ）。
- `docs/ai-terminal-design-plan.md` — 設計の目的・判断・決定/未決事項の source of truth。**作業前に必ず読む。**
- `prototype/python/` — 旧 Python 実装（最初の MVP・CLI＋FastMCP）。設計と reducer の**移植元／検証基準**（pytest reducer は本家 rtk **0.42.0** と byte 一致）。成果物は Node 版で、こちらは参照専用。lint は未整備。
- `test/` — **Node 版の回帰テスト**（`node:test`、`npm test` で build→実行・tmux 必須）。`test/rtk.test.mjs`（pytest は実機 rtk 0.42.0 採取の golden と byte 一致を `test/fixtures/pytest/*` で固定／grep・git・filters は Python プロトタイプ生成の `test/fixtures/reducers.json` で固定／classify・truncate・stripShellFrame）、`test/core-pure.test.mjs`（stripControl・reduceOutput）、`test/core-readoutput.test.mjs`（readOutput の full/range/lines/offset/raw/rtk を tmux 非依存で）、`test/core-tmux.test.mjs`（破壊ゲート10種・サニタイズ・sendKey・完了検出。専用ソケットで隔離）、`test/smoke.test.mjs`（stdout が JSON-RPC のみ・6 ツール）。CI は `.github/workflows/ci.yml`（Node 18/20/22 で build+test、tag で publish --provenance）。
- `rag/` — **調査資産の RAG コーパス**。一次資料を MarkItDown で Markdown 化して蓄積する。`rag/ingest.py` が取り込みツール、`rag/INDEX.md` が総目次、`rag/manifest.json` が機械可読索引。詳細は後述「調査資産: RAG コーパス」。
- `.vscode/tasks.json` — Throughline が自動生成した token-monitor 自動起動設定。このプロジェクトの成果物ではなく編集対象外。
- `docs/*.md:Zone.Identifier` は WSL の Windows 由来メタデータ。中身に関係しないノイズ。

## このプロジェクトが作ろうとしているもの

AI がローカル/SSH/コンテナを問わずターミナルを**永続セッションとして**直接操作するための薄いツール層。現状の「コマンド 1 個ずつの細切れ往復」を解消する。

設計の核心（design-plan の §3–§9 を要約。詳細は必ず原典を参照）:

- **「ツールゼロの生直結」は採らない。** AI は stdout を読んでから次入力を決めるため、`stdin←AI出力` / `AI入力←stdout` の双方向観測ループは原理的に消せない。消せるのは JSON 組み立ての重さと接続し直しコストのみ。
- **プリミティブは「ローカル PTY を 1 個握る」だけ。** SSH・docker・wsl・tmux は専用ツールにせず、**その PTY の中へ `send` する 1 コマンド**へ格下げする。セッション種別をツールレベルで区別しない。
- **起点となる 4 ツール**: `pty_open()` / `pty_send(id, text)` / `pty_read(id, timeout)` / `pty_close(id)`。SSH 接続は `pty_send(id, "ssh home\n")` のように表現する。
- **バックエンド第一候補は tmux**（`capture-pane` で画面スナップショット・差分・再接続が得られる）。
- **完了境界の検出は quiescence 方式が第一候補**: 画面出力が一定時間変化しなくなったら完了とみなす。プロンプト文字列マッチは弱い（PS1 カスタマイズ・ネストで層ごとにプロンプトが変わる・誤検出）ため採らない。
- **適用対象は Claude Code (WSL2) 側**のインスタンス。

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

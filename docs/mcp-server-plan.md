# MCP サーバ化 計画書 兼 TODO チェックリスト（作業版 v0.1）

> **注記（2026-06-01 追補 / 2026-06-02 更新）**: 本計画は Python MVP 時点の計画/TODO スナップショット。MCP 化は完了し、その後
> **Node/TS の npm パッケージ `aiterm-mcp` へ移行し npm 公開済み**（`aiterm-mcp@0.1.0`、リポジトリ `kitepon-rgb/aiterm-mcp`。実装は `src/*.ts`、旧 Python は `prototype/python/`）。
> 本文中の `src/aiterm_*.py` / `.mcp.json` / venv 等の記述は移行前のもの。**現状の正は [CLAUDE.md](../CLAUDE.md) と [README.md](../README.md)**。

## 0. このドキュメントの位置づけ

`src/aiterm.py`（動作・E2E 検証済みの MVP）を **WSL2 ローカルで動く stdio MCP サーバ**に包み、
WSL2 側の Claude Code から `pty_open`/`pty_send`/`pty_read`/`pty_key`/`pty_close`/`pty_list`
として使えるようにするための計画。各項目は末尾 §12 のチェックリストに `[ ]` で対応する。

- 設計の source of truth は [ai-terminal-design-plan.md](ai-terminal-design-plan.md)（特に §9 決定 / §10 未決 / §11 実装状況）。
- 設計判断の根拠は調査資産 [rag/INDEX.md](../rag/INDEX.md) と [rag/briefs/](../rag/briefs/)。
- **この文書は「叩き台」。実装はユーザー確認（GO）後に着手する。** §6（RTK 取り込み方針）は
  ユーザー判断により **reducer の Python 全面移植を主軸 ＋ 委譲(`send --rtk`)を併設**で確定（2026-06-01）。

---

## 1. ゴールと「完成」の定義

**最終ゴール**: WSL2 の Claude Code が、ローカル端末を 1 個の永続セッションとして直接握り、
細切れ往復なしに send/read で操作できる。リモート（`192.168.1.2` 等）へは
**そのローカル端末の中で `ssh 192.168.1.2` と打って入る**（ネスト）。192.168.1.2 には何もデプロイしない。

**完成の定義（受け入れ条件 = §8 検証と対応）**:

1. Claude Code から `pty_open` で session が立ち、`pty_send "uname -a"` → `pty_read` でローカル応答が返る。
2. `pty_send "ssh 192.168.1.2"` → `pty_send "uname -a"` → `pty_read` で **192.168.1.2 のカーネル名**が返る（ネスト実証）。
3. Claude Code を再起動しても同じ session が生存している（tmux サーバ常駐ゆえ）。
4. 出力削減が効いている（同一コマンドで before/after のトークン数を提示）。

---

## 2. 現状の到達点（流用できる資産）

`src/aiterm.py`（414 行・標準ライブラリ + tmux のみ）に以下が**実装済み**。MCP 化はこの上に薄く被せる。

- ツール群: `open`/`send`/`read`/`key`/`list`/`close`/`kill-all`/`attach-cmd`。
- 永続: 専用 socket 上の tmux セッション。呼び出しプロセスをまたいで生存（[§11](ai-terminal-design-plan.md#L186) で実証）。
- 完了検出 4 層: dead / `--until`(sentinel) / quiescence(出力静止 ∧ `pane_current_command` がシェル復帰) / timeout。
- 出力削減（RTK の **汎用 4 戦略**を移植済み）: 制御除去・`\r` 畳み・連続重複圧縮・head+tail 折りたたみ＋復元ヒント＋メタ併記。
- 安全: send 前の破壊コマンドゲート（`--force` で越える）＋ ESC/ブラケットペースト終端のサニタイズ、read 後の制御文字無害化。

**未実装（本計画で埋める）**: MCP ラッパ / **コマンド別 reducer の Python 全面移植（要件C 主軸）** / `send --rtk` 委譲（併設）/ 状態追跡A（範囲外）。

---

## 3. 方式（要件A）— ローカル stdio MCP

- サーバは **WSL2（ローカル）で動かす**。トランスポートは **stdio のローカル MCP**。HTTP 不要・ネット非公開・トークン認証不要。
- 握るのは**ローカル端末**だけ。リモートは `pty_send "ssh ..."` で中に入る（ネスト）。サーバ自体はリモートを知らない。
- **永続性は tmux に委ねる**。MCP サーバプロセスはステートレスでよい（状態は tmux サーバ + ログファイルが保持）。
  サーバが落ちて再起動しても session は生きている。
- **トランスポート規約（重要・落とし穴）**: stdio MCP は **stdout が JSON-RPC 専用**。
  既存 `aiterm.py` は `print` で stdout に出すため、そのまま import すると通信が壊れる。
  → コアロジックを**文字列を返す純粋関数**に切り出し、診断・ログは **stderr** にのみ出す（§5 参照）。

根拠: MCP 公式（[modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk),
[build-server](https://modelcontextprotocol.io/docs/develop/build-server)）、Claude Code MCP（[docs](https://code.claude.com/docs/en/mcp)）。

---

## 4. MCP ツール設計（要件B）— 既存ロジックを包むだけ

`aiterm.py` の `cmd_*` を「副作用（print）」から「戻り値（文字列/構造体）」へ薄く変換し、`@mcp.tool()` で公開する。

| MCP ツール | 由来 | 主な引数 | 返すもの |
| --- | --- | --- | --- |
| `pty_open` | `cmd_open` | `name?`, `shell="bash"` | `session_id`（+ attach コマンドのヒント） |
| `pty_send` | `cmd_send` | `session_id`, `text`, `enter=true`, `mark=false`, `force=false`, `rtk=false`, `raw=false` | 送信結果サマリ |
| `pty_read` | `cmd_read` | `session_id`, `wait=false`, `until?`, `timeout=10`, `screen=false`, `full=false`, `lines?`, `range?`, `raw=false` | 削減済み出力 + メタ（+ `is_complete`/検出層） |
| `pty_key` | `cmd_key` | `session_id`, `key`（`C-c`/`Enter`/`Up`…） | 送信結果 |
| `pty_close` | `cmd_close` | `session_id` | 結果 |
| `pty_list` | `cmd_list` | （なし） | session 一覧（current command / attached / サイズ） |

- **read の出力削減はそのまま使う**（制御除去・反復圧縮・head+tail 折りたたみ＋復元ヒント・メタ）。
- **SDK 方針**: **FastMCP**（`from mcp.server.fastmcp import FastMCP` + `@mcp.tool()`）を採用。
  6 個の単純ツールなら型ヒント + docstring から入力スキーマ・説明が自動生成され、低レベル `Server` の手書きは過剰。
- **大出力の注意**: MCP ツール出力は既定 25k トークンで頭打ち（>10k で警告）。`pty_read` は端末ダンプで膨らみ得るが、
  既定の増分 + 削減で通常は収まる。`full=true` は明示時のみ。必要なら `MAX_MCP_OUTPUT_TOKENS` で緩和（§9 メモ）。

---

## 5. ファイル構成・依存・リファクタ方針（外科的）

```text
src/
  aiterm_core.py   # 新規: tmux 操作・出力削減・完了検出・安全ガードの「純粋ロジック」。
                   #       stdout に print しない。各操作は文字列/dataclass を return する。
  aiterm.py        # 既存 CLI を core 呼び出しの薄い層に整理（print は CLI 側でのみ行う）。
                   #       既存サブコマンド・E2E 挙動は不変（後方互換）。
  aiterm_mcp.py    # 新規: FastMCP サーバ。@mcp.tool() が aiterm_core を呼び、結果を return。
.mcp.json          # 新規: プロジェクトルート。ローカル stdio サーバ "aiterm" を登録（§9）。
requirements.txt   # 新規: mcp（TOML 読取は Python 3.11+ の tomllib で追加依存なし）。
```

- **外科性**: `reduce_output` / `_wait_completion` / tmux ヘルパは既に純粋に近い。`cmd_*` の「組み立てて print」部分を
  「組み立てて return」に割り、CLI は `print(core.fn())`、MCP は `return core.fn()`。挙動は変えない（同じテストが通る）。
- **依存の変化**: 現状の「外部依存は tmux のみ」は MCP 化で `mcp` SDK が加わる。venv 推奨。
  CLI 単体（`aiterm.py`）は引き続き `mcp` 非依存で動かせるよう、import を MCP 側に閉じる。

---

## 6. トークン削減の強化: RTK 取り込み（要件C）— ★要確認の設計判断★

### 6.1 調査でわかった事実（根拠）

- **`git`/`ls`/`grep`/`pytest` の reducer はすべて Rust 実装**（`rtk/src/cmds/**`）で、TOML ではない。
  これらは構造的リフォーマット（再グルーピング・ハッシュ畳み・失敗のみ抽出）で、宣言的 TOML では表現できないため。
  → **Python への全面移植は高コスト**（Rust ロジックの逐語移植が必要）。
- **rtk は「コマンドを実行して出力を削減する」道具**。外部プロセスからの**委譲の正準形は次の 2 つ**:
  - (A) verb を知っている: `rtk git log -10` … rtk が実ツールを実行し削減出力を stdout、exit code は子の code。
  - (B) 自由形式コマンド: **`rtk rewrite "<cmd>"` → 出力された `rtk ...` 文字列を実行**（rewrite-then-exec）。
    exit `0`=書換あり/許可, `3`=書換あり/要確認, `1`=該当なし(元を実行), `2`=deny。
    **これが唯一、任意のコマンド行から reducer を自動判定するモード。** 参照グルー: `rtk/hooks/claude/rtk-rewrite.sh`。
- **移植可能な資産は 59 個の TOML フィルタ**（make/gradle/df/ps/ssh/systemctl 等の二次ツール）。
  8 段パイプライン（strip_ansi → replace → match_output → strip/keep_lines → truncate_lines_at → head/tail_lines →
  max_lines → on_empty）で、`tomllib` + `re` で**ほぼそのまま Python に移植可能**（要・小プリミティブ 4 つ再実装と `$1`→`\1` 変換）。

### 6.2 方針（確定: reducer の Python 全面移植 主軸 ＋ 委譲 `send --rtk` 併設）

ユーザー判断（2026-06-01）により、**外部バイナリ非依存・削減ロジックを自前で全部持つ**ことを理想とし、
reducer を **Python へ全面移植**する。要件C 原文の「移植」と「委譲」は排他でないため両立させる
（移植を主軸、委譲を未移植層・リモートの補完として併設）。

- **主軸 = 全面移植（reducer を Python で自前実装）**:
  - 第一弾（ユーザー名指し）: `git` / `ls` / `grep` / `pytest` の reducer を Python で自前実装。
    これらは構造的リフォーマット（再グルーピング・ハッシュ畳み・失敗のみ抽出）。
    **rtk のファイルは複製しない**（`rtk/` を gitignore した方針を堅持・2026-06-01 決定）。`rtk/src/cmds/**` は
    アルゴリズムの参照として読むだけで、実装は自分のコードとして書き起こし、出力は実 rtk と突き合わせて検証する。
  - 二次ツール: rtk の TOML を**複製せず**、同等の 8 段ライン整形エンジンを自作し、主要コマンドの
    フィルタ規則を自分で記述して順次拡張する（最終的に網羅は rtk と同等へ到達可能。差は手間だけ）。
  - 段階的: 残るコマンド群を優先度順に第二弾以降で追加。
- **併設 = 委譲 `pty_send(rtk=true)`（rewrite-then-send。要件B の `--rtk`）**:
  ローカルで `rtk rewrite "<cmd>"` → exit 0/3 なら書換後文字列、1/2 なら元文字列 → tmux セッションへ send。
  役割: **未移植コマンドの補完** と、リモート/実行先に rtk がある場合の活用。rtk 不在なら自動で素通し。
  安全順序: サニタイズ（元）→ 破壊ゲート（元）→ `rtk rewrite`（元→rtk 形）→ send（rtk 形）。

> **統合方式（確定）**: 自前 reducer は **read 側で「直前に送ったコマンド」に紐づけて適用**する。
> `pty_send` が last-cmd を記録し、`pty_read(rtk=true)` がそのコマンド用 reducer で増分出力を縮約する
> （`aiterm_rtk.py` に分離。rtk バイナリ不在でも効く）。
> **工数注意**: 第一弾（`git`/`ls`/`grep`/`pytest` ＋主要フィルタ数個）を区切りに、実 rtk と出力比較で検証してから拡張（§11-G）。

---

## 7. 安全（要件D）— ローカルでも維持

既存ガードを MCP 経由でも**そのまま維持**する（`aiterm_core` に集約し、CLI/MCP 双方が通る）。

- [ ] send 前 破壊コマンドゲート（`force=true` で越える）。
- [ ] send 前サニタイズ（ESC・ブラケットペースト終端 `ESC[201~` 等の除去）。
- [ ] read 後の制御文字無害化（カーソル移動上書き・タイトル読み戻し等の表示欺瞞対策）。
- [ ] `rtk=true` 時も、ゲート/サニタイズは**書換前の元コマンド**に対して評価（rewrite はコマンドを `rtk ...` に変えるだけ）。

根拠: [rag/briefs/technical-building-blocks.md](../rag/briefs/technical-building-blocks.md) §4（Terminal DiLLMa 脅威モデル）。

---

## 8. 検証（要件E）

WSL2 の Claude Code（MCP クライアント）から、登録した `aiterm` サーバ経由で実施する。

- [ ] **ローカル応答**: `pty_open` → `pty_send "uname -a"` → `pty_read(wait=true)` で WSL2 のカーネル行が返る。
- [ ] **ネスト実証**: `pty_send "ssh 192.168.1.2"` → `pty_read(until="\\$ ")` で接続確認 →
      `pty_send "uname -a"` → `pty_read(wait=true)` で **192.168.1.2 のカーネル名**が返る。
- [ ] **永続性**: 上記 session を残したまま Claude Code を再起動 → `pty_list` に残存 → `pty_read` で続きが取れる。
- [ ] **削減（before/after 提示）**: 冗長コマンド（例 `ls -laR /usr`, `git log`, `dmesg`）で
      `raw tok` vs `reduced tok` をメタ表示し、削減率を記録（目標: 代表ケースで 50%+）。
- [ ] **rtk 委譲**: 同コマンドで `rtk=false` と `rtk=true` を比較し、`rtk=true` で更に縮むことを提示
      （`git log`/`pytest` 等、Rust reducer が効くもの）。

---

## 9. `.mcp.json` 登録手順と再起動（要件A）

プロジェクトルートに `.mcp.json` を置く（コミット対象 = プロジェクトスコープ）。

```json
{
  "mcpServers": {
    "aiterm": {
      "type": "stdio",
      "command": "python3",
      "args": ["${CLAUDE_PROJECT_DIR:-.}/src/aiterm_mcp.py"],
      "env": {}
    }
  }
}
```

- 等価 CLI: `claude mcp add --scope project --transport stdio aiterm -- python3 <abs>/src/aiterm_mcp.py`。
- **再起動で有効化**: 実行中セッションには反映されない。**Claude Code を再起動**すると認識される。
- **初回承認**: プロジェクトスコープの `.mcp.json` サーバは安全のため**初回に承認プロンプト**が出る（承認するまで Pending）。
  選択のリセットは `claude mcp reset-project-choices`、状態確認は `/mcp`。
- venv を使う場合は `command` を venv の `python3` 絶対パスにする（`mcp` SDK を解決するため）。
- メモ: 大出力対策が要れば `env` に `MAX_MCP_OUTPUT_TOKENS` を設定可。サーバ名 `workspace` は予約済み（`aiterm` は可）。

---

## 10. 依存準備（rtk）

`rtk/` は参照専用 clone。本計画では主に**移植の参照元として読む**。委譲(`send --rtk`)を併設で使う場合のみ実バイナリが PATH に要る（任意）。

- [ ] 移植: `rtk/src/cmds/**`（reducer ロジック）と `rtk/src/filters/*.toml`（59 件）を読み、Python へ移植。
- [ ] 委譲を使うなら: `rtk` をビルド/インストール（`rtk/INSTALL.md`、Rust 製）し PATH 確認、`rtk gain` で同定（同名別ツールと衝突しないこと）。
- [ ] 委譲時に `rtk` が無ければ `pty_send(rtk=true)` を**自動で素通し**にフォールバック（エラーにしない）。

---

## 11. リスク・未決

- **G（確定）**: §6.2 = reducer の Python 全面移植を主軸、委譲(`send --rtk`)を併設。**工数大**のため、
  第一弾（`git`/`ls`/`grep`/`pytest` + 59 TOML）で一旦出力比較検証し、段階的に拡張する。
- **stdout 汚染**: コアから print を排し stderr/log へ（§3）。1 箇所でも stdout に漏れると MCP 通信が壊れる。最優先で守る。
- **リモートの削減**: SSH 先に rtk が無い層では、構造的削減（git 等）は効かず read 側 TOML 委譲に限られる。
- **状態追跡（未決A）**: 層スタック（今どの層・cwd）の自動追跡は本計画の範囲外（設計 §10-A のまま）。
- **大出力 × MCP 25k 上限**: `full=true` や TUI ダンプで超過の可能性。既定は増分 + 削減で回避。
- **自動テスト不在**: 現状 E2E は手動。MCP 化を機に最小の自動検証（§8 をスクリプト化）を別途検討（任意）。

---

## 12. TODO チェックリスト（工程順）

### A. 準備・設計確定

- [x] §6.2 方針確定（reducer 全面移植 主軸 + 委譲 `--rtk` 併設）／2026-06-01
- [ ] §5（ファイル構成）と実装着手のユーザー GO
- [ ] `mcp` SDK の導入（venv 作成 → `pip install mcp`）
- [ ] 委譲を使う場合のみ: `rtk` 実バイナリの用意（ビルド/インストール、PATH 確認、`rtk gain` で同定）

### B. コア切り出し（外科的リファクタ・挙動不変）

- [ ] `src/aiterm_core.py` を新設し、tmux 操作・`reduce_output`・`_wait_completion`・安全ガードを移設
- [ ] コア関数は **stdout に print せず**文字列/dataclass を return（診断は stderr）
- [ ] `src/aiterm.py` を core 呼び出しの薄い CLI に整理（既存サブコマンド・出力を不変に保つ）
- [ ] 既存 E2E 手順で CLI 後方互換を確認（open/send/read/key/list/close）

### C. MCP サーバ実装（要件A・B）

- [ ] `src/aiterm_mcp.py` を FastMCP で実装（`FastMCP("aiterm")` + `mcp.run(transport="stdio")`）
- [ ] `pty_open`/`pty_send`/`pty_read`/`pty_key`/`pty_close`/`pty_list` を `@mcp.tool()` 公開（§4 の引数）
- [ ] 各ツールの型ヒント + docstring を整備（入力スキーマ・説明の自動生成のため）
- [ ] stdout 非汚染をローカルで検証（手動 JSON-RPC or `mcp` の inspector）

### D. 登録（要件A）

- [ ] プロジェクトルートに `.mcp.json`（§9）を作成
- [ ] Claude Code 再起動 → 初回承認 → `/mcp` で `aiterm` が接続済みになることを確認

### E. RTK 取り込み（要件C・全面移植 主軸 ＋ 委譲 併設）

- [x] 自前 reducer モジュール `src/aiterm_rtk.py` を新設（rtk ファイル非複製・自作）
- [x] 第一弾移植: `pytest`（**rtk 0.42.0 の出力と厳密一致**）/ `grep` / `git status` / `git log`
- [x] 自前ライン整形 engine ＋ 主要フィルタ（df / free / make / systemctl）
- [x] read 側統合: `pty_send` が last-cmd 記録 → `pty_read(rtk=true)` が直前コマンド別 reducer で縮約、非該当は汎用へフォールバック
- [x] 委譲併設: `pty_send(rtk=true)` の rewrite-then-send（`rtk rewrite` exit 0/3→書換, 1/2→素通し）＋ rtk 不在時の自動フォールバック
- [ ] 設計上の注記: `git diff`/`ls` は rtk が `--porcelain`/`ls -la` で**再実行**して整形する型。read 側（観測のみ）では再実行できないため、ローカルは委譲がカバー。自前版は観測出力向けに別途実装（段階的）
- [ ] 拡張（段階的）: フィルタ規則を主要コマンドへ拡充し網羅を rtk と同等へ

### F. 安全（要件D）

- [ ] 破壊ゲート / 送信前サニタイズ / 読取後無害化が MCP 経路でも通ることを確認
- [ ] `rtk=true` 時にゲート/サニタイズが**元コマンド**に対して効くことを確認

### G. 検証（要件E）

- [ ] ローカル応答（`uname -a`）
- [ ] ネスト実証（`ssh 192.168.1.2` → `uname -a` で 192.168.1.2 応答）
- [ ] 永続性（Claude Code 再起動を跨いで session 生存）
- [ ] 削減 before/after トークン数を提示（代表 50%+）
- [ ] `rtk=true` で追加削減を提示

### H. 仕上げ

- [ ] [ai-terminal-design-plan.md](ai-terminal-design-plan.md) §11 / §9・§10 を実装結果に同期
- [ ] [CLAUDE.md](../CLAUDE.md) の現状記述（MVP→MCP）を更新

---

## 付録: 主な根拠

- 設計: [ai-terminal-design-plan.md](ai-terminal-design-plan.md) §3–§11
- 先行事例 / 収束点: [rag/briefs/prior-art.md](../rag/briefs/prior-art.md)
- 完了検出 / 安全 / ANSI: [rag/briefs/technical-building-blocks.md](../rag/briefs/technical-building-blocks.md)
- RTK 取り込み: `rtk/src/core/toml_filter.rs`（8 段エンジン・RUST_HANDLED_COMMANDS）、`rtk/src/discover/{registry,rules}.rs`（コマンド分類）、`rtk/hooks/claude/rtk-rewrite.sh`（委譲グルー）、[rag/sources/ansi-handling/rtk-token-reducer-cli.md](../rag/sources/ansi-handling/rtk-token-reducer-cli.md)
- MCP: [python-sdk](https://github.com/modelcontextprotocol/python-sdk) / [build-server](https://modelcontextprotocol.io/docs/develop/build-server) / [Claude Code MCP](https://code.claude.com/docs/en/mcp)

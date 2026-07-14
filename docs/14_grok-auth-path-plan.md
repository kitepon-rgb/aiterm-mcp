# Grok OAuth 永続化修正計画

## 目的

`grok_agent(agent_done:true)` / `composer_agent(agent_done:true)` が per-launch の
managed `GROK_HOME` を使っても、Grok Build の OAuth refresh とブラウザ承認結果を
通常 Grok 認証正本へ永続化し、次回起動で同じ承認を要求しないようにする。

## 確認済みの原因

- aiterm-mcp 0.12.2 は通常 Grok home の `auth.json` と `auth.json.lock` を managed
  `GROK_HOME` へ symlink していた。
- Grok Build 0.2.99 は認証更新を atomic replace する。2026-07-14 の実機再現では、
  managed 側 `auth.json` の symlink が通常ファイルへ置き換わり、ブラウザ承認後の
  credential は一時 home にだけ残った。一方、通常 Grok home の認証正本は更新されなかった。
- Grok Build 0.2.99 のローカル一次バイナリには `GROK_AUTH_PATH` の正規解決、同パスに
  対する auth lock、兄弟プロセスの更新採用、refresh-token 二重消費防止、atomic write が
  実装されている。aiterm 側で終了時 copy-back / 独自 lock / last-writer-wins を実装する必要はない。

秘密値・raw auth JSON は調査出力、テスト名、ログ、metadata に出していない。auth の絶対pathは
vendorへ渡すため owner-only agent metadata とローカルPTYの起動commandには保持するが、factory
diagnostics、固定エラー、agent一覧・完了suffixには公開しない（既存の `HOME` / `GROK_HOME` と同じ境界）。

## 契約

1. per-launch managed `GROK_HOME` と fake `HOME` は維持し、hook/config/session/plugin の
   隔離契約を変えない。
2. OAuth の正本は、親プロセスに `GROK_AUTH_PATH` があればその絶対パス、無ければ
   通常 Grok home の `auth.json` とする。
3. Grok/Composer 子プロセスへ `GROK_AUTH_PATH=<正本>` を明示する。managed home には
   `auth.json` / `auth.json.lock` の symlink も copy も作らない。
4. 正本は起動前に owner、通常ファイル、symlink/hardlink 不可、size 上限、JSON object、
   owner-only mode を検証する。さらに字句正規化した絶対 path と realpath の一致（中間 symlink 不可）と、
   canonical な祖先 directory chain の実ディレクトリ・current uid/root 所有を検証する。group/other
   writable は原則拒否し、Unix標準の一時領域を安全に使えるよう root 所有 + sticky bit の共有祖先だけは許可する。
   秘密フィールドの値は一切出さず、auth pathは前項のprivate境界に限定する。
5. lock の生成・取得・refresh 競合・atomic write は Grok Build 自身へ委ねる。aiterm は
   credential を解析して優劣判定したり、終了時に copy-back したりしない。
6. `XAI_API_KEY` 経路では auth file 不在を許す既存契約を維持し、不要な空 auth fileを作らない。
7. 認証正本の検証失敗は session 作成前に明示エラーとし、別 credential や通常 home 全体共有へ
   silent fallback しない。

## TODO

- [x] 変更前 baseline `npm test` を 227/227 green で確認する。
- [x] Grok 0.2.99 の atomic replace により symlink が通常ファイル化する実機証拠を採取する。
- [x] ローカル一次バイナリから `GROK_AUTH_PATH`、auth lock、兄弟更新採用、atomic write 契約を確認する。
- [x] 承認済み credential の一時copyを使う隔離 `grok models` probeで、`GROK_AUTH_PATH` 指定時に再認証なし・managed homeへauth生成なしを確認する。
- [x] auth 正本 path の解決・安全検証（canonical path・祖先 directory chain を含む）を characterization test で固定する。
- [x] managed home に auth/lock を置かず、子プロセスへ `GROK_AUTH_PATH` を渡す実装へ変更する。
- [x] atomic replace を模した偽 Grok で、更新先が正本だけになり managed home に credential が残らないことを固定する。
- [x] auth 不在、symlink、hardlink、緩い mode、oversize、不正 JSON、相対 `GROK_AUTH_PATH` を session 前に拒否する。
- [x] root 所有 + sticky bit の共有一時領域配下にある本人所有private authは許可し、stickyなしのgroup/other writable祖先は拒否する回帰を固定する。
- [x] Grok/Composer は同じ正本 path と vendor lock 契約を使い、aiterm 独自 copy-back が無い実装へ統一する。
- [x] README、CLAUDE、design plan、ADR、RAG の旧「auth/lock symlink 共有」記述を新契約へ同期する（歴史記述は0.9.1当時・2026-07-14廃止を同じ段落で明記）。
- [x] `npm test`（235/235）、`git diff --check`、公開 package の隔離 install smokeをgreenにし、tgzからMCP 0.12.3・10 tools・diagnostics 0.12.3を確認する。
- [x] 現在の承認済み managed credential を秘密非表示・backup付きで正本へ一度だけ収容する。既存記録の収容前backup/scope確認に加え、収容後のdefault正本を0.12.3実行で独立再検証した。
  - [x] 収容前に旧正本・lock・承認済み候補を owner-only tar（0600）へ退避し、scope/identity一致・候補が古くないことを値非表示で確認した。
  - [x] 現在のdefault正本がcanonical通常file・single-link・current UID・owner-only・JSON object・安全な祖先であり、下記4回の実行が同じ正本で再認証なしに成立することを値非表示で確認した。
- [x] 隔離installした0.12.3 MCPから実GrokとComposerを各連続2回起動し、4/4で期待token・`agent_done`・再認証要求なし・session closeを確認する。
- [x] 独立refuterでauth/metadata/versionとruntime typed分類を反証し、修正後にP0/P1が残らないことを確認する。
- [x] macOS CIで再現した長いagent起動commandの途中欠落を修正する。`send-keys -l`
  の偽成功を廃し、tmux buffer経由の完全送信と6,000文字の実PTY回帰を固定する。
  tmux 3.4/3.7bの一次sourceで制御文字契約を確定し、BEL/ESC/DEL/tab/LFの9byte回帰も追加。
  独立refuter P0/P1なし、ローカル237/237とtgz隔離MCP smoke（10 tools・diagnostics 0.12.3）はgreen。
- [ ] 上記修正後にLinux/macOS/Windowsの全CIをgreenにし、公開ゲートを再開する。
- [ ] patch release・npm・MCP Registry・BugHub/dotagents台帳を同期する（publish/tag/pushはH承認後）。

## 非目標

- Grok Build の認証 schema や refresh-token の優劣を aiterm が解釈しない。
- 通常 `GROK_HOME` 全体を共有せず、ユーザーの hook/config/plugin/session を managed 実行へ戻さない。
- API key、OAuth、外部 auth provider の優先順位を変更しない。
- 認証失敗を再ログインの自動操作や別 provider で隠さない。

## Rollback

公開前は本変更を revert し、承認済み credential の収容前に作る owner-only tar backup から
`auth.json` / `auth.json.lock` を復元する。公開後は直前の npm 0.12.2 へ明示 downgrade できるが、
symlink atomic-replace の既知欠陥が戻るため BugHub へ rollback 理由と再修正待ちを記録する。

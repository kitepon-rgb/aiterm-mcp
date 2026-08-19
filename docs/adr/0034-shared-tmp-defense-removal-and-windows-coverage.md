# ADR 0034: 共有/tmp前提の安全設備の全面撤去とWindowsテスト覆域の回復

- 状態: 承認済み（オーナー裁定 2026-08-19）
- 関連: docs/31（campaign計画正本）、design-plan §9 決定6/10、ADR 0025（環境共有）

## 背景

Windows基盤をWSL橋からnative psmuxへ置換した`e3f5fc8`の受入は、自前差し替えビルドの
psmux（3.3.7＋fork修正）を前提としていた。fork修正3件はupstream貢献 psmux/psmux#577 と
してmergeされ、psmux v3.3.8（2026-08-18）に収録された。公式版での再受入の過程で、
テスト側の述語`typeof process.getuid === "function"`がWindowsで155件を無条件skipして
おり、branchの目玉であるWindows挙動に自動テストの裏付けが無いことが判明した。

覆域を回復した結果、次の2つの実欠陥が露出した:

1. `grok-stop-hook`はWindowsで`uid()`が即failし、Grok/Composerの完了eventが一度も
   書かれず`aiterm-wait`が600秒timeoutまで返らなかった（claude-stop-hookだけが
   修理され、同型のgrok側が取り残されていた）。
2. bin受入（`isUsableAgentExecutableFile`）はWindowsでshebang scriptを正式に許すのに、
   control command（`claude auth status --json`）は`spawnSync(bin)`直接でscriptを実行
   できず、受入が通したbinの起動が必ず失敗した。

また、覆域回復で走り出したテスト群の失敗を切り分ける中で、agent state系の防御検査
（symlink・hard link・owner uid比較・mode bit検査・`O_NOFOLLOW`）がWindowsで一部
成立しない（`O_NOFOLLOW`不在等）ことが判り、その存在意義自体がオーナーの検分対象に
なった。

## 決定

1. **共有/tmpの敵対的同居主体を前提とした安全設備は、全プラットフォームで撤去する。**
   対象はagent state（`aiterm-mcp-<uid>/agents/`配下のevent・result・marker・receipt）に
   対するsymlink検査・hard link（nlink）検査・owner uid比較・mode bit（0o077）検査・
   `O_NOFOLLOW`。根拠: state rootの置き場は`XDG_RUNTIME_DIR`（0700）または各OSの
   per-user一時領域であり、「他ユーザーが同居する共有/tmp」という脅威の前提が対応OSの
   既定配置で成立しない。成立しない脅威に対する検査は、複雑さと偽陽性（Windowsでの
   挙動差による誤拒否）だけを残す。
2. **撤去しないもの**とその理由:
   - 短書き込み検出（ftruncate巻き戻し）: 書込整合性であって防御ではない。
   - `dev`/`ino`同一性（operation marker消費時）: 「先にstatしたのと同じ実体か」＝
     operation相関の正しさそのもの。
   - size上限（marker 1KiB等）: parse入力の上限。
   - 作成時の0o600/0o700: 検査ではなく妥当な既定値。
   - **Grok auth正本の検証**（`~/.grok/auth.json`の実在・型・サイズ・nlink・realpath）:
     読む対象が資格情報であり、置き場もHOME配下＝脅威モデルが別。
   - **send/wait lock**の生存・同一性判定: 並行制御の正しさが主目的。
3. **受入契約とcontrol経路の整合**: 受入が「使える」と判定したbinはcontrol commandでも
   実行できなければならない。Windowsではshebang scriptをGit Bash
   （`resolveWinPaneShell`）経由、`.cmd`/`.bat`をshell経由で実行する。
4. **テストのgetuid述語の禁止**: テストのskip条件に`process.getuid`の有無を使わない。
   state rootのuid成分は製品側`currentUid()`と同規則のヘルパ（Windows=0）で組み立てる。
   POSIX固有の断言（mode bit等）は、suiteを止めずその断言だけをguardする。
5. **撤去された挙動のテストは削除する**（skipで残すと「機能はあるが未検証」と偽る）。
   撤去と無関係に成り立つ不変条件（envで渡された任意pathへ書かず導出pathにだけ書く）は
   独立したテストとして残す。

## 受入証跡の訂正

`e3f5fc8`コミット文の「full npm test green（連続2回・Windows skipは…1件のみ）」は
実測と不一致（当時のWindows実態はskip 155件）。コミットは改変せず、本ADRと
AGENTS.md v0.27.0注記を訂正の正本とする。本版の実測: full regression 344件・
pass 299・fail 0・skip 45（内訳22件=Windowsのnative grok.exe強制によりfake grok binが
起動不可＝同経路はPOSIX 3環境が検証、他はPOSIX固有fixture・環境要因）。

## 帰結

- Windowsの`grok_agent`/`composer_agent`完了通知が初めて実際に機能する。
- npm shim（`.cmd`）やscript wrapperをCLAUDE_BINへ指定した構成が起動できる。
- 防御検査の偽陽性でhookが完了eventを落とす経路が消えた。
- POSIX側は、撤去された検査の分だけ挙動が単純化した（検査由来の明示エラーは
  OSエラーの自然な露出へ置き換わる）。

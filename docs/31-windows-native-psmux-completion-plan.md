# 31. Windows native psmux 移行の完成 campaign 計画正本

**状態**: P1〜P5完了・P6（dotagents戻し）のみ残（2026-08-19）
**対象 branch**: `feat/windows-native-psmux`（main から1コミット先行・`e3f5fc8`）
**レーン**: 統括レーン（複数repo書込み調整＋多段連鎖受入＋H操作を含む）

## 0. この campaign が閉じる条件

Windows native psmux 基盤を、上流 psmux の正規リリース版の上で「完璧な形」に着地させる。
着地とは、コード・テスト・記述・公開物・工場配備がすべて同じ事実を指している状態を言う。

## 1. 前提として確定した事実（2026-08-19 実測）

### 1.1 上流 psmux 側

quolu 名義で提出した3件の忠実度修正は upstream へマージ済み。

- PR psmux/psmux#577 = MERGED（merge commit `0fc0720`）、issue #576 = CLOSED
- maintainer が review 修正 `0509351` を上乗せ（chained sink の socket 継承／`nul:` device gap／C-c teardown）
- 上記すべてが **psmux v3.3.8**（2026-08-18 公開）に収録

### 1.2 この端末の psmux

自前差し替えビルド 3.3.7（`1271472`）から**公式 v3.3.8 へ更新済み**。

- winget manifest は本日時点で 3.3.7 のまま（v3.3.8 の PR が未着地）のため、
  公式 GitHub Release の `psmux-v3.3.8-windows-x64.zip`（7,893,888 bytes）を
  WinGet Packages ディレクトリへ配置した
- sha256 は公式 zip 内容と一致（psmux `54e5c54d…`／pmux `0f01bddb…`／tmux `efe95c01…`）
- 旧 3.3.7 ビルドは scratchpad へ退避済み
- **[罠]** winget が 3.3.8 を拾った時点で `winget upgrade` が同一の公式ビルドで上書きし、
  管理が自然に正常化する。それまでは winget 上の表示バージョンと実体がずれる

### 1.3 修正3面の正規版での実測

| 検証 | 結果 |
|---|---|
| pipe-pane ファイル sink | 実バイト書込（210 bytes）・マーカー検出 |
| 開けないパス | `can't open …(os error 3)` で exit 1（loud failure） |
| device 名 `NUL`／`nul:` | 拒否・exit 1 |
| paste 逐語 | 62→62 bytes バイト完全一致（引用符・TAB・連続空白・`\`） |
| pane_current_command | idle=`pwsh` → ping 走行中=`PING` |

### 1.4 aiterm 実 E2E（正規 v3.3.8 上）

global install の dist と repo の dist はバイト一致を確認済み（`index.js`／`core.js`／
`claude-stop-hook.js`／`grok-stop-hook.js`／`aiterm-wait-cli.js`）。

`claude_agent` 起動（`submit_residue:false`）→ `aiterm-wait --cursor 0` が `outcome=done`／exit 0
→ transcript を逐語回収（引用符・連続空白・バックスラッシュ保存）→ `pty_close`
→ 残骸ゼロ・`agents/` 掃除済み、まで全通し。

### 1.5 ベースライン full regression

`npm test` = 347件 / **pass 192 / fail 0** / skipped 155。

## 2. 発見済みの欠陥（この campaign が直す対象）

### A. テストが Windows 挙動をほぼ覆っていない【重】

skip 155件のうち **129件が単一原因**——テスト側の述語が `typeof process.getuid === "function"`
にハードコードされており、Windows の Node に getuid が存在しないため常に全件 skip する。

| ファイル | skip | 述語 |
|---|---:|---|
| `test/core-agent.test.mjs` | 91 | `hasTmux && typeof process.getuid === "function"`（:74） |
| `test/aiterm-wait.test.mjs` | 26 | `const posix = typeof process.getuid === "function"`（:10、**理由文字列なし**） |
| `test/managed-stop-hooks.test.mjs` | 12 | `typeof process.getuid === "function"`（:12） |

製品側は `currentUid()`（`src/core.ts:383`）が Windows で 0 を返して owner 比較を通すよう
`e3f5fc8` で修理済みなのに、テスト側だけが getuid で自分を止めている。
結果として、このブランチの目玉である「Windows Stop hook の修理」と
「親向け完了通知 `aiterm-wait` の契約」に自動テストの裏付けが無い。

**[罠]** 述語を外すと、この 129件の中に紛れている本物の POSIX 固有検証
（mode bits・symlink owner・lstat）は Windows で落ちる。一括除去ではなく
「差し替え→落ちたものを正しい理由で個別 skip へ仕分け」が必要。

### B. WSL 撤去後の記述が残っている

`e3f5fc8` は WSL 橋を撤去したが、説明が追随していない箇所がある。

- `src/core.ts:19-20` — 「Windows ネイティブには tmux が無い。その場合だけ全 tmux 呼び出しを WSL 経由へ橋渡しする」
- `src/core.ts:5016-5018` — 「Windows は起動コマンドが WSL 内 bash で走る（tmux ブリッジ）。bin/cwd を /mnt/c/... 形へ変換して渡す」（実装は native で、記述が真逆）
- テスト skip 理由 6件 — 「Windows は WSL bridge の実機境界」「Windows の rtk は WSL 側で起動する」等
- **rtk の実態**: この端末の `rtk` は `C:\Users\kite_\bin\rtk.exe` の**ネイティブ exe**。
  `src/core.ts:862` は素の `spawnSync("rtk", …)` で WSL を経由しない。skip 理由が事実と異なる

### C. WSL 遺物の孤児ファイル

`%TEMP%\aiterm-mcp-0\interop-anchor.json` = `{"socket":"/run/WSL/246237_interop","pid":246238}`。
撤去済み機構の残骸で、現行コードは `src/`・`dist/` とも一切参照しない＝掃除する主体がいない。

### D. 受入証跡の記述が実態より強い

`e3f5fc8` のコミットメッセージは「full npm test green（連続2回・Windows skip は
MSYS2 の PPID 切断による前面プロセス検出不可1件のみ）」と記録しているが、
実測は skip 155件。述語がハードコードである以上、1件だったことはあり得ない。
コミットは改変しないが、正本（AGENTS.md／本計画／ADR）へ実測値を記録して訂正する。

## 3. フェーズと順序

**順序の根拠**: 工場CIは4環境で同じ `npm test` を必須 gate にしている。
Windows arm が 155 skip のまま release すると **CI green が空洞のまま公開される**。
したがって覆域回復は公開より前に置く。また記述同期を覆域回復より後に置くのは、
正確な skip 件数と理由文字列が仕分けの結果としてしか確定しないためである。

| Phase | 内容 | 受入 |
|---|---|---|
| P1 | A の根治（テスト覆域回復） | 129件の仕分け完了・回復件数を実測・full regression fail 0 |
| P2 | B・C・D の同期（記述・孤児・証跡） | 実装と記述の一致・実測値の正本反映 |
| P3 | main 合流 | README／CLAUDE.md／AGENTS.md／design-plan／ADR 同期 → merge |
| P4 | 工場CI | Windows native runner へ psmux 3.3.8 導入 → 4環境 full green |
| P5 | release（**H操作**） | npm provenance／GitHub Release＋MCPB／Official Registry／global install |
| P6 | dotagents 戻し | `deployment-contract.mjs` win32 除外と `cron-env.sh` 期待値を復旧 |

## 4. 非目標（この campaign でやらないこと）

- psmux 本体への追加貢献（未対応 nit 2件＝旧 server の hex 保存、`hex_encode` の per-byte
  allocation は upstream の follow-up 候補として残す。こちらから出さない）
- POSIX 側（macOS／Linux／WSL2）の挙動変更。P1 の述語差し替えは POSIX で挙動不変であること
- 新機能追加。公開ツール面（14 tools）は不変
- MSYS2 の PPID 切断・csh 未導入など、環境要因で正当な skip の解消
- Lattice 工程管理の適用（オーナー明示指示がないため）

## 5. 既知の罠

1. **述語一括除去は禁止**（2-A の罠）。POSIX 固有検証が Windows で落ちる
2. **psmux `__warm__` server は残骸ではない**。psmux が持つ warm server 機構で、
   aiterm の session leak と誤認しない
3. **3.3.7 server + 3.3.8 client の混在禁止**。旧 server は新 CLI の `set-buffer -H <hex>` を
   literal hex として保存する（maintainer が nit として明示）。psmux 更新時は
   稼働中の全 server を先に落とす
4. **release commit は `origin/main` の祖先であること**（憲法の publish 規定）。
   `git merge-base --is-ancestor` で確認してから公開する
5. **P6 の戻し忘れ**。P5 完了まで dotagents の win32 除外は戻さない。
   戻すまでは毎回の報告へ注意を含める

## 6. 検証方法

- 各 Phase は focused test で閉じ、Phase 最終確認でのみ full regression を1回実行する
- P1 の回復は「skip 件数の減少」と「pass 件数の増加」を実測値で記録する
- P4 は4環境すべてが同じ full `npm test` を実行した結果だけを gate とする
  （OS別の縮小 suite や GitHub-hosted runner を最終 gate の代用にしない）
- P5 は registry 由来の global install から version・bin 3種・14 tools・stderr 0 を確認する

## 6.5 P1 進行記録（2026-08-19・セッション途中バトン）

**裁定（オーナー 2026-08-19）**: 共有 /tmp の敵対的同居主体を前提とした安全設備
（symlink・hard link・owner uid 比較・mode bit 検査・`O_NOFOLLOW`）は**全プラットフォームで撤去**。
対応 OS の既定配置は per-user runtime dir であり前提が成立しないため。
残すもの＝短書き込み検出（書込整合性）、`dev`/`ino` 同一性（operation 相関の正しさ）、
size 上限（parse 入力）、作成時 0o600/0o700（検査でなく既定）。
**B（Grok auth file 検証・core.ts 1872-1900 付近）と C（send/wait lock）は撤去対象外**——
B は資格情報で脅威モデルが別、C は並行制御の正しさが主。

**発見した実バグ（修理済み）**: `src/grok-stop-hook.ts` の `uid()` が Windows で即 fail し、
Grok/Composer の完了 event が一度も書かれず `aiterm-wait` が timeout まで返らなかった。
`e3f5fc8` は claude-stop-hook だけ修理して grok 側を見落としていた。テスト全 skip が隠していた。

**suite 別状況**:

| suite | 着手前 | 現在 |
|---|---|---|
| aiterm-wait | 0 pass / 26 skip | 26 pass / 0 fail / 0 skip |
| managed-stop-hooks | 0 pass / 12 skip | 9 pass / 0 fail / 0 skip（撤去済み挙動のテスト3件削除、env任意path不変条件は残して書換） |
| core-agent | 20 pass / 99 skip | 60 pass / 48 fail / 11 skip（述語差し替え済み・fail は全て fixture 移植性） |

**core-agent の fail 48 の内訳（製品バグゼロ）**:
- 29件: fake claude bin（POSIX `.sh`）が Windows で実行不可 → `claude auth status` preflight で失敗
- 7件: `GROK_BIN=/bin/echo` 等の POSIX 固定パス
- 7件: Windows native grok.exe 強制による正しい拒否 → 既存の `skipGrokFakeBin` を適用すべき
- 2件: Throughline CLI 不在（環境）
- 3件: POSIX mode 断言（0o700=448 等）

**コード側の完了分（未 commit）**:
- `src/grok-stop-hook.ts`: uid 修理＋検査撤去（`secureAgentsDir`→`agentsDir`）
- `src/claude-stop-hook.ts`: 検査撤去（marker の dev/ino 同一性と size 上限は残す）
- `src/core.ts`: `ensureSecureStateRoot`→`ensureStateRoot`（検査撤去）、`existingAgentsDir` を
  存在判定だけへ、`createEmpty0600NoFollow`→`createEmpty0600`、operation marker read の検査を
  size 上限だけへ、dispatch receipt の EEXIST 判定を存在だけへ
- テスト: aiterm-wait / managed-stop-hooks / core-agent の述語差し替え、
  managed-stop-hooks へ TEMP/TMP 隔離（Windows の os.tmpdir() は TMPDIR を見ない）

**P1 完了（2026-08-19）**: fixture 移植は「fake bin の Windows 実行形を作る」のではなく、
製品側の整合性欠陥の修理で解決した——受入（`isUsableAgentExecutableFile`）が Windows で
shebang script を許すのに、control command（`claude auth status --json`）の `spawnSync(bin)` が
script を実行できず、受入が通した bin の起動が必ず失敗していた。`spawnAgentControlCommand` を
script=Git Bash 経由／`.cmd`・`.bat`=shell 経由へ修理した結果、fake claude fixture（.sh）が
そのまま動き 29 件が回復。ほか、Throughline fixture を `.cmd`＋`.ps1` 対（製品が正式に受ける
npm shim 形）へ、grok fake-bin 系 16 件へ `skipGrokFakeBin` 適用、POSIX mode 断言 2 件を
guard、撤去済み挙動のテスト 3 件を削除・1 件を不変条件だけへ書換。
**最終実測: full regression 344 件・pass 299・fail 0・skip 45**（着手前 pass 192・skip 155）。
skip 45 の内訳: 22=native grok.exe 強制（POSIX 3 環境が検証）、他=POSIX 固有 fixture・環境要因。

**P2 完了（2026-08-19）**: core.ts の WSL 橋記述 4 箇所・index.ts ヘッダ・テスト skip 理由
4 ファイルを実態（native psmux／AITERM_PSMUX／native rtk exe）へ同期。孤児
`%TEMP%\aiterm-mcp-0\interop-anchor.json` を削除。README（status・correlated completion・
attach 形・Requirements・CI runner）と design-plan §9（決定 6 改訂・決定 9 改訂・決定 10 追加）、
AGENTS.md v0.27.0 注記（受入証跡の訂正込み）、CHANGELOG 0.27.0、ADR 0034 を追加。
version 0.26.0→0.27.0（package.json／package-lock／server.json）。

## 7. F/A/H

- **F（統括が直接裁定）**: P1 の仕分け判断、P3 の合流、P5 の公開対象 commit の祖先確認
- **A（仕様固定の実装物量）**: P1 の述語差し替えと理由文字列の付与、P2 の記述同期
- **H（人の明示承認が必要）**: P4 の CI runner への psmux 導入、P5 の release 実行、
  P6 の dotagents 書込み

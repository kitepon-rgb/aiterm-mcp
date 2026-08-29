# AGENTS.md

このファイルが aiterm-mcp の運用・設計・履歴の正本です（全 host 共通。Claude Code は CLAUDE.md の `@AGENTS.md` 経由で同じ内容を読む）。設計の詳細は `docs/00_overview.md` から辿り、特に `docs/01_design-plan.md` と関連 ADR を読む。

> **v0.29.4（2026-08-29・公開工程）**: Windows psmux 3.3.8で複数席への`pty_send`が`no buffer`になり、親から担当席へ指示不能になる欠陥を修理。Windowsだけ壊れたCLI paste-buffer/send-keys経路を使わず、session serverの認証済みTCP commandへ256byte単位の`SendBytes`を順次投入し、server処理完了とConPTY drain後にだけsession send lockを解放する。agent dispatchは同じbyte streamへbracketed-paste wrapperを含める。POSIX tmuxの`paste-buffer -p` negotiationは変更しない。6,000文字・同一席別process・8席×8周並行・platform別bracketed pasteを実機回帰で固定。

> **v0.29.3（2026-08-29・公開工程）**: Grok／Composer／Cursorの起動時promptをargvへ載せただけで`event_cursor`を返し、実ターン未開始を実行中と申告する欠陥を修理。全harnessをTUI ready確認後のdispatchへ一本化した。Grokは現在画面の`Waiting for response`等をbusyとして拒否し、安定したidle composerはtranscriptの`mcp_init_completed`を待たずに受け付ける。LiveTR Peertableの実Grok席で`initial_prompt=pending`の偽成功を再現し、修正後は実ランプbusyまで確認。

> **v0.29.2（2026-08-29・公開工程）**: 0.29.1のblocking UI即時返却が、scrollbackに残った古い`Hooks need review`を現在のblocking UIと誤認し、描画済みidle composerへのdispatchを拒否した回帰を修理。現在のidle readyを先に判定し、readyでない時だけblocking UIを検査する。実blocking UIの即時返却は維持。LiveTR Peertable Codex席で再現。ADR 0045を補足。

> **v0.29.1（2026-08-29・公開工程）**: agent初回prompt ready gateがCodexのupdate／directory trust／hooks、ClaudeのMCP consentを入力欄readyになるまで待ち続け、WindowsのCodex trust UIが先に終了してsessionを失う欠陥を修理。既知のblocking UIを1回目のsampleで検出したら、自動承認せず0.29.0の`initial_prompt=not_sent`明示エラーへ即座に流し、sessionを生かしたままcallerへ制御を戻す。Mac等の通常ready経路は11回安定確認を維持する。LiveTR Peertable実席で再現。DecisionはADR 0045。

> **v0.29.0（2026-08-25・公開完了）**: 起動時promptのready gate失敗を成功形receiptから
> 明示エラーへ変更（実被弾: Codexのupdate確認ダイアログでprompt未送信のまま40分停滞）。
> `codexLaunchBlockingDialog`が起動前modal（update確認／directory trust確認／種別未特定）を
> 実機capture逐語で検知し、エラーにsession_id・復旧手順（pty_read→pty_key→pty_send）を含める。
> ダイアログの自動応答はしない。full 358 pass、release commit `d7ec7de`、main CI `32795532630`、
> tag CI／npm publish `32795769494`、Registry `32796078246` success、Release＋MCPB、
> global install後initialize smoke 0.29.0。公開受入はADR 0044を正とする。
>
> **v0.28.4（2026-08-25・公開完了）**: Windowsの対話shellをPowerShell 7へ統一。`pty_open`の
> Windows既定を`pwsh`にし、明示`powershell`も検証済みPowerShell 7絶対pathへ正規化する。
> runtime error DACL／process identity／Throughline shimも同じOS adapterを使い、5.1／PowerShell 6／
> `cmd.exe` fallbackを持たない。psmuxはshellでなくAiterm所有のmultiplexer backend、Git Bashは
> harness launcherの明示内部shellである。focused Windows実測は日本語・`rg`・mark成功/失敗、
> runtime store、PS6負例。release commit `5e4c154`、main CI `32770777293`、tag CI／npm publish
> `32771142404`、Registry workflow `32771580848`はsuccess。npm 0.28.4、GitHub Release＋MCPB、
> Official Registry、global install後の公開MCP 15 tools・既定`pwsh`・Core 7・日本語・`rg`・mark rc=0・
> stderr 0まで確認した。公開受入はADR 0043を正とする。

> **v0.28.3（2026-08-24・公開完了）**: campaign 32 queueの重複解消。stop hook 2本とagent-sharedの
> `uid()`/`runtimeStateBase()`三重実装を、builtin依存だけの最下層`src/state-root.ts`へ一本化
>（agent-sharedはre-export・stop hookのbuiltin-only設計は維持）。挙動不変。full 355 pass、
> main CI `32675470468`、tag CI/npm publish、Registry `32675999886` success、MCPB添付Release、
> global install後initialize smoke 0.28.3。公開受入はADR 0042を正とする。
>
> **v0.28.2（2026-08-24・公開完了）**: 内部用語をvendorからharnessへ統一する挙動不変patch
>（オーナー裁定のharness用語統一campaign）。`src/vendors/`→`src/harnesses/`、内部識別子・
> コメント・現役文書を置換し、wire互換field（`vendor`／`vendor_session_id`／`vendor_dependencies`／
> `AITERM.VENDOR_LAUNCHER_FAILED`）は据え置いた。macOS full 355 pass、release commit `b06e1a1`、
> main CI `32672609610`、tag CI／npm publish `32672803173`、Registry workflow `32673122066`は
> success。npm provenance、GitHub Release＋MCPB（staged initialize smoke 0.28.2・harnesses 4ファイル
> 同梱確認）、global install後のMCP initialize smoke 0.28.2・stderr 0。公開受入はADR 0041を正とする。
>
> **v0.28.1（2026-08-24・公開完了）**: npm配布物へ入るREADMEを含め、現行正典をv0.28の実装へ全同期する
> 文書patch。Windows nativeを廃止済みWSL bridgeで説明していたCONTRIBUTING／SECURITY／AGENTS／
> design planをpsmux 3.3.8以上＋Git for Windowsのnative契約へ直し、15 tools、標準`agent_launch`、
> 旧4 alias、Cursor通常transcript完了、harness／OSのコード所有境界を英日READMEと正典へ揃えた。
> archive、過去版ADR、RAG rawは当時の証跡として不変。ランタイムコードと公開APIは0.28.0から不変で、
> npm-visible文書を届けるため再公開不能な0.28.0は動かさず0.28.1へpatch bumpした。
> release commit `987dfd6`、main CI `32671378001`、tag CI／npm publish `32671592943`、Registry workflow
> `32671592614`はsuccess。4環境は各358 test・fail 0。npm provenance、GitHub Release＋MCPB、
> Official Registry active/latest、標準global install 0.28.1、3 bins、15 tools、4 harness、stderr 0、
> installed runtime JS 18/18一致、npm同梱READMEの現行文言を確認した。公開受入はADR 0040を正とする。
>
> **v0.28.0（2026-08-24・公開完了）**: agent起動を単一の`agent_launch({harness, model?, ...})`へ標準化し、
> harness（agent loop・認証・hook・session・transcriptを所有する実行基盤）とmodelを別軸にした。
> `claude-code`／`codex-cli`／`grok-cli`／`cursor-cli`を選べ、Cursor harness上でGPT／Claude／Grokを
> 選んでも完了相関はCursor方式のまま。Composerは別harnessでなくGrok CLIのmodel preset。
> 旧4 launcherはdeprecated thin aliasとして共通実装へ流す。Cursorは公式`cursor-agent`だけを解決し、
> 通常`~/.cursor`を共有し、初回user recordのlaunch IDで通常agent transcriptを一意にbindする。
> 末尾`turn_ended(status:"success")`を完了、同じturnのassistant textを回答正本とし、follow-upで末尾eventが
> 書き換わるため`event_cursor`はuser turn数を使う。`write_scope:"read-only"`は公式`--mode ask`で実効化。
> model＋effortは現行`model-effort` IDへ変換してlive catalog照合し、起動中変更は標準model pickerを使う。
> 公式installerでこの端末へ導入済みで、
> 更新は`agent update`を正とする。起動・agent dispatch・`aiterm-wait`・`agent_configure`・`pty_list`は
> 同じ`harness`を返し、旧vendor/provider/agent fieldは互換用に残す。設計はADR 0038、公開面は15 tools。
> 公開前MCPB smokeで、stagingが`dist`直下だけをcopyし`dist/vendors/*.js`を欠いた起動不能archiveを
> validatorが通す既存欠陥を検出した。runtime JavaScriptの再帰copyへ直し、staged serverの15 tools／
> `cursor-cli` schema／stderr 0を確認、release-metadata testで同梱集合を固定した。
> release commit `26ac8cb`、main CI `32664712823`、tag CI／npm publish `32664978268`、Registry workflow
> `32664978093`はsuccess。npm provenance、GitHub Release＋MCPB、Official Registry active/latest、
> npm由来global install 0.28.0、3 bins、15 tools、installed runtime JS 18/18一致を確認した。公開版の
> Cursor実席は`cursor:1`回収→同一sessionをLuna highへ変更→follow-up `cursor:2`回収→close→残骸ゼロ、
> stderr 0まで通過。公開受入はADR 0039を正とする。
>
> **v0.27.9（2026-08-23・公開済み）**: Windows native の PowerShell pane で
> `pty_send(mark:true)` がPOSIX用`printf`を連結し、コマンド本体成功後にsentinelを生成できず
> timeoutしていた欠陥を根治。前面が`powershell`／`pwsh`ならPowerShell構文を使い、成功`rc=0`／
> 失敗`rc=1`を実行時生成する。command echoは`rc={0}`のままなので数字アンカーの早期誤完了防止を
> 維持する。POSIX形式は不変、fish/csh/tcshは従来どおり送信前に拒否。Windows native focused
> regressionでPowerShellの遅延成功・失敗とPOSIX既存2経路を確認した。最終実装はPowerShell固有処理を
> `tmux-runtime.ts`だけに置き、runtime純粋testでPOSIX byte不変とWindows分岐を固定。日本語READMEに残っていた
> 廃止済みWSL bridge要件もnative psmux 3.3.8+契約へ訂正。release commit `ee1f069`、main CI
> `32617127573`、tag CI／npm publish `32617554934`、Registry workflow `32617776592`はsuccess。
> npm 0.27.9、GitHub Release＋MCPB、Official Registry、global install 0.27.9、公開MCP 14 tools、
> installed runtime JS 17/17 byte一致まで成立。registry由来global processのPowerShell live smokeだけは、
> この端末のpsmux 3.3.8が新session processをclientへ登録できない外部runtime状態により`pty_open`で未完。
> tag CIのclean Windows namespaceでは同じlive regressionがpassしているが代替成功には数えない。
> 公開受入と未完条件はADR 0037を正とする。

> **v0.27.0（2026-08-19・source）**: Windows基盤をWSL橋からnative psmuxへ置換した`e3f5fc8`の完成形。
> 前提だったpsmux忠実度修正3件（pipe-pane直接ファイルsink・paste逐語hex wire・前面
> `#{pane_current_command}`）はquolu名義のupstream貢献 psmux/psmux#577 としてmergeされ、
> **psmux v3.3.8**（2026-08-18公開）へ収録された。maintainerはreview修正`0509351`を上乗せ
> （chained sinkのclient socket継承除去・`nul:` device gapの閉鎖・CI teardownのpid化）。
> この端末は公式v3.3.8バイナリ（sha256一致確認済み）へ差し替え、psmux単体で3修正を再実測、
> aiterm実E2E（claude_agent起動→`aiterm-wait` done→逐語transcript回収→close→残骸ゼロ）を
> 正規版上で通過した。オーナー裁定（2026-08-19）により、共有/tmpの敵対的同居主体を前提とした
> 安全設備（agent state系のsymlink・hard link・owner uid比較・mode bit検査・`O_NOFOLLOW`）を
> 全プラットフォームで撤去（詳細はdesign-plan §9決定10・docs/31）。テスト側のgetuid述語を
> 製品側`currentUid()`と同規則へ揃えてWindows覆域を回復した結果、`grok-stop-hook`がWindowsで
> 即failしGrok/Composerの完了eventが一度も書かれない実バグ（e3f5fc8がclaude側だけ修理した
> 取り残し）と、受入契約が通したscript binをcontrol command（`claude auth status`）が実行
> できない整合性欠陥を検出し、どちらも根治した。**受入証跡の訂正**: `e3f5fc8`コミット文の
> 「Windows skipは…1件のみ」は実測と不一致（当時の実態はskip 155件）。本版の実測はfull
> regression 344件・pass 299・fail 0・skip 45（22件はWindowsのnative grok.exe強制による
> fake bin不可＝POSIX 3環境が同経路を検証、残りはPOSIX固有fixture・環境要因）。Windows
> nativeの前提はpsmux ≥ 3.3.8とGit for Windows。工程正本はdocs/31、公開はP4（4環境CI）〜
> P5（release）で完遂する。
>
> **v0.26.0（2026-08-15・公開完了）**: Windows hostの`grok_agent`／`composer_agent`はWindows nativeの
> `grok.exe`だけを起動する（オーナー裁定: WindowsネイティブはWindowsネイティブで完結させ、WSL2へ
> vendor状態を持ち込まない。ClaudeやCodexと同じ整列）。WSL側grokを起動するとsession記録がWSL home側へ
> 分裂し`agent_transcript`／`aiterm-wait`完了帰属が回収不能だった実被弾（olc-plan-review-grok2）の根治。
> 非native解決先はsession作成前に明示エラー、既定候補へ`~\.grok\bin\grok.exe`を追加、0.25.3の
> `GROK_AUTH_PATH`の`/mnt/c`変換は撤回（native前提ではWindowsドライブ形が正）。pane内`.exe`起動は
> paneが継承した死んだ`WSL_INTEROP`で`accept4=110`になるため、aiterm所有の長寿命interop anchorの
> 生きたsocketを起動envへ供給し、注入envは`WSLENV`(/w)で搬送する（根因・対処とも実測で固定・
> caveat記録済み）。あわせて`existingAgentsDir()`がgetuid不在のWindowsで常にnullとなり
> close／killAll／同名再起動のstate掃除がno-opだった欠陥を根治し、grok既定modelをdotagents規範
> どおり`grok-4.6`へ更新した。Windows実機受入は実MCP境界で起動→`aiterm-wait` outcome=done→
> transcript回収→close→state掃除まで2回全通し。ready判定はnative描画の`>`も受ける。
> 公開受入はADR 0033を正とする。

> **v0.25.2（2026-08-14・公開完了）**: PeertableのGrok 4.6実席で、`/model`成功通知が再描画で消えた後も
> footerは要求した`Grok 4.6 (high)`へ変わっているのに、`agent_configure`が3秒後に失敗を返す
> 再現を確認した。変更前には無かった要求model／effortが常駐footerへ現れた場合も完了とする。
> transient通知だけへ依存せず、caller側のretry／成功丸めは追加しない。focused regressionと
> Peertable実席の4.6→4.5→4.6で固定した。npm provenance、GitHub Release＋MCPB、Official MCP
> Registry active/latest、registry由来global installまで公開済み。受入DecisionはADR 0031を正とする。

> **v0.25.1（2026-08-14・公開完了）**: 正規repositoryは`kitepon/aiterm-mcp`、Official MCP
> Registry名は`io.github.kitepon/aiterm-mcp`。移転前ownerを新しい設定例・badge・manifest・公開手順へ
> 書かない。工場CIはself-hostedのmacOS native・Linux native・Windows native・WSL2で同時に開始し、
> 4環境すべてが同じ`npm test`を実行する。OS別の縮小suiteやGitHub-hosted runnerを最終CIへ使わない。
> npm publishは4環境full green後だけ実行し、release commitの`origin/main`祖先gateとOIDC Trusted
> Publisherを必須とする。失敗済み`v0.25.0`は移動・再利用せず、修正版`v0.25.1`をnpm provenance、
> GitHub Release＋MCPB、Official Registry active/latest、registry由来global installまで公開済み。
> 3 bins、14 tools、4 launcher schema、stderr 0、Grok実席、Composer fail-loud／残骸ゼロを確認した。
> 詳細は`docs/30-factory-ci-repository-transfer-release-plan.md`、受入DecisionはADR 0030を正とする。

> **v0.25.0（2026-08-13・source）**: Grok／Composerを共通launcher制御へ同等化する。
> 起動時`reasoning_effort`を`--reasoning-effort`へ渡し、`write_scope:"read-only"`は
> `--sandbox read-only`で実効禁止する。`agent_configure`は同じPTYと会話contextを維持したまま
> `/model <model> [effort]`または`/effort <effort>`を送る。明示Grok／Composer modelとComposer既定
> `grok-composer-2.5-fast`はPTY作成前に現在の`grok models` catalogへ照合し、不在時はvendorの
> 別model fallbackを許さず明示失敗する。現行catalogにComposer modelが無い場合、Composer既定起動も
> 正しく失敗する。設計・受入は`docs/29-grok-composer-agent-parity-plan.md`とADR 0029を正とする。

> **v0.24.3（2026-08-13）**: 4つのagent launcherへ任意`env_vars`を追加。値をtool引数へ
> 渡すのでなく環境変数名だけをallowlistし、起動時の現在のMCP processから存在する値だけをshell quoteして
> vendor commandへ加える。MCP processより先に永続tmux serverが起動していても、古いserver環境に
> 席identity／workflow値を失わない。全環境copy、tmux server更新・再起動、retry／fallbackは追加しない。
> 値はPTY起動コマンドと`.lastcmd`へ到達するためsecret transportではない。不正名はsession作成前に失敗。
> あわせてCodex v0.147の`medium fast ·` footerをfrontendとして認識し、idle実席への
> `agent_configure`誤拒否を根治。focused regressionと実席soraの同一session Luna→Terra変更で確認。
> env継承はfocused 2/2、最終full 342/342、Peertable実席9席のactor値で根治を確認。公開工程は
> `docs/28-agent-env-vars-release-plan.md`を正とする。公開commit
> `6ccb1a3add62e183d321e1ad97cd008da31026a2`、main CI `31664655592`、tag CI／Trusted Publishing
> `31664795704`、Registry workflow `31664974149`はsuccess。npm latest、SLSA provenance、
> GitHub Release＋MCPB、Official Registry active/latest、registry由来global install 0.24.3、3 bins、
> 14 tools、4 launcher schema、stderr 0、installed dist一致、env／`fast`の公開後smokeを確認済み。

> **v0.24.2（2026-08-13）**: 長寿命Codexで起動時の`OpenAI Codex` headerが直近45行の
> capture範囲外へ流れると、idleでも`agent_configure`がreadyを誤拒否した欠陥を根治。
> Codexの常駐model／effort footerと入力欄をfrontend根拠へ加え、caller側の再描画・再試行・再起動は
> 追加していない。pure regressionとPeertable実席のLuna medium→Terra highで確認済み。
> v0.24.1 tag CI `31610402851`はruntime error storeのmacOS高競合でpublish前に停止した。原因は
> bakery queueの1.5秒を総待ち時間として測り、各pollの外部`ps`が自らqueueを遅らせたこと。
> 0.24.2では同じ先頭ownerの無進捗時間だけを期限とし、通常pollは`kill(pid, 0)`で生存確認、
> process-start identityはstall時にだけ照合する。失敗tagは動かさず、公開成果を0.24.2へ継承する。
> 公開commit `9febb994370a270acd0d38a80be508318d481060`、main CI `31611936274`、
> tag CI／Trusted Publishing `31612206338`、Registry workflow `31612570435`はsuccess。
> npm latest、GitHub Release＋MCPB、Official Registry active/latest、registry由来global install 0.24.2、
> 3 bins、14 tools、`agent_configure` schema、stderr 0、installed dist一致、長寿命Codex ready根治を確認済み。

> **v0.24.0（2026-08-12）**: 起動中のCodex／Claudeを再起動せずmodel／effort変更する
> `agent_configure`を追加。vendor標準操作だけを使い、PTY・vendor session・会話contextを維持する。
> Codex 0.147.0でLuna low→Terra high、Claude Code 2.1.228で
> Sonnet low→Opus high→Sonnet lowを同一Aiterm session内で実測。公開面は14 tools。
> main CI `31587209848`、tag CI／npm Trusted Publishing `31587248091`はsuccess。
> npm latest、global install、公開MCPのversion 0.24.0／14 tools／`agent_configure` schema／stderr 0、
> installed distとrelease commitのバイト一致まで確認。設計・release受入は
> `docs/27-agent-configure-release-plan.md`を正とする。

> **v0.23.0（2026-08-04）**: 4つのagent launcherへ任意の`throughline_source_session`を追加。
> 指定時だけローカルの`throughline handoff-context --session <id> --json`をPTY作成前に呼び、
> 読み取り専用contextを新ミッションの前へそのまま注入する。元sessionのDB所属は変更しない。
> `prompt`必須、`launch_operation_id`併用不可、Throughline不在／不正／空はfallbackせず失敗する。
> 省略時は従来どおりclean launch。335/335回帰、main CI `30919026450`、tag CI `30919295270`、
> Registry workflow `30919622861`、npm／GitHub Release／Official Registry／global install、
> Codex source→Claude targetの実smokeまで完了。設計は`docs/26-throughline-portable-fork-plan.md`、
> 公開受入はADR 0027、工程正本はLattice `throughline-portable-fork`。

> **v0.22.0（2026-08-04）**: 4つのagent launcherを通常project／user環境の完全共有へ移行。
> `HOME`、vendor home、project/user/local設定、MCP、plugin、skill、permission、trust、memory、historyを
> 直接CLI起動と同じ正本から読む。fake home、private vendor home、設定snapshotは廃止し、aitermは
> launch相関ID、完了event/cursor、bounded result、cleanup metadataだけを所有する。子へ
> `role=subagent`、親session、delegation depth、lineage、`delegation_allowed=true`を非user instructionと
> 環境変数で注入する。再委譲は禁止せず固定depth capも設けない。4vendor depth 1とClaude nested depth 2の
> live smokeを通過。公開commit `90e2b1265ac5c9269e31ae9b65799c596df63ca2`、main CI `30880757338`、
> tag CI `30880912526`、Registry workflow `30880912702`はsuccess。npm provenance、GitHub Release、
> Official Registry active/latest、registry版global installと実Claude smokeまで完了。DecisionはADR 0025、
> 公開受入はADR 0026、工程正本はLattice `shared-agent-environment`。

> **履歴の読み方**: 以下のv0.21.4以前の版別記録にあるmanaged home、fake `HOME`、設定snapshot、
> 「現在」「現行」は各release時点の事実である。v0.22.0以降の環境境界には適用せず、矛盾時は上記と
> [ADR 0025](docs/adr/0025-shared-agent-environment-and-lineage.md)を正とする。

> **v0.21.4（2026-08-04）**: managed Claudeのhook隔離がuser scope MCPまで落としていた欠陥を修理。
> `~/.claude.json`のtop-level `mcpServers`だけをlaunch単位のowner-only configへsnapshotし、Claude CLIの
> `--mcp-config`へ渡す。通常hook／plugin／permissionとproject／local MCPは継承しない。破損configは
> session作成前にfail loudし、metadata pathをsecure state rootへ再束縛してclose／killAllで削除する。
> 設計正本はADR 0024、公開工程はdocs/23。

> **v0.21.3（2026-08-03公開）**: Codexの完了正本をmanaged Stop hookからroot rollout
> transcriptの`task_complete.turn_id`へ移す。長寿命serverがHomebrew Cellarの版付き`process.execPath`を
> hook設定へ固定し、Node更新後に旧実体が消えて`exit 127`、`aiterm-wait`が600秒timeoutを反復した
> 実障害を根本修理する。Codex managed homeはStop hookを生成せず、dispatch直前のtranscript byte境界を
> `event_cursor`として返す。`aiterm-wait`と`agent_transcript`は同じturnを読み、後発sub-agent rolloutを
> root TUIへ誤帰属しない。未使用のCodex hook実装は配布物から撤去し、buildは既存`dist/*.js`を
> 消してから生成する。Claude/Grok hookは実行時PATHの`node`を使う。あわせて0.21.0の`write_scope`
> 指定時だけstructured launch receiptからscope／enforcementが消える逆条件を修理し、3 launcherの
> 指定時／省略時を実MCP境界で固定する。設計はADR 0022、公開受入はADR 0023を正とする。
> v0.21.1 tag CIはGrok fixtureの実CLI依存、v0.21.2は
> Windows process identity用PowerShellの1秒上限で失敗し、どちらもpublish jobはskipされた。
> tagを動かさず、fixtureを隔離しWindows command予算を5秒へ統一した0.21.3で完遂した。
> 公開commit `902379325c947030d5b6a8eb79e963e3f6f99c51`、main CI `30813089848`、tag CI
> `30813318513`、Registry workflow `30813724499`はsuccess。npm provenance、GitHub Release、
> Official Registryのactive/latest、この端末のglobal install 0.21.3、公開packageの3 bins・13 tools・
> stderr 0を確認済み。npm integrityは
> `sha512-Dwxpa4nk1kRxsspxVpw1cUQA7yztdx1WIxEkyzI6SLcMiZ66xatKQn8nxETN8d/3sD0yqpkjsHoBJHRj5U6KRw==`。

> **v0.21.0（2026-08-02 npm公開）**: `codex_agent`/`grok_agent`/`composer_agent`に任意の
> `write_scope`能力宣言を追加。指定値はlaunch receipt・per-launch metadata・`pty_list`へ保存する。
> Codexの`write_scope:"read-only"`だけは`--sandbox read-only`で実効書込み禁止にする。Grok/Composerと
> Codexのパス説明は`write_scope_enforcement:"declaration_only_unsupported"`で宣言記録だけと明示する。
> この版はnpmへ公開された一方、tag／GitHub Release／server.json／MCPBが0.20.3のまま残った。
> v0.21.3でreceipt欠陥、4 manifest、公開連鎖を再同期し、0.21.0の公開面分裂を解消した。

> **v0.20.3（2026-08-01公開）**: 複数のmanaged Fable／Claude session起動時、macOS Keychain等の
> vendor credential storeが未認証・利用不能でもTUIを先に作り、各sessionが再loginへ流れて認証状態と
> 残骸を増やす欠陥を修理。新しいClaude launchはtmux session作成前に同じCLIの
> `auth status --json`を5秒上限で実行し、exit 0・JSON object・`loggedIn:true`をすべて満たす時だけ進む。
> false／malformed／失敗exit／timeoutはsession・agent stateを一切作らず明示エラー。相関済みexact replayは
> CLIを再送しないためpreflightを再実行しない。認証正本はClaude Codeに所有させ、Aitermはcredentialの
> copy・symlink・lock・自動loginを行わない。managed Claudeへのexact `/login`・`/logout`は通常dispatchと
> force送信の双方で副作用前に拒否する。3 session×2波の共有認証反復起動を回帰化。実Fable smokeの
> 第2波で、done event観測直後にactive marker cleanupだけが未完了となるraceを再現したため、同じmarkerより
> 新しいresultと相関eventが揃った場合だけ回収側が最大1秒cleanupをsettleする。関連test 99/99、
> release full regression 317/317、
> 実Claude Code v2.1.220／Fable 5 low effortを独立Node/MCP相当process 3本×2波（計6 process）から
> 同時起動し、再loginなしで全件done→exact result回収→closeまで通過。公開commit `97f2c3a`、
> tag CI `30680336472`とmain CI `30680332796` success、npm provenance publish、GitHub Release、
> MCP Registry workflow `30680345129` success。npm latest=0.20.3、integrity
> `sha512-mPZ3RtuLG8eMdxvZ/ofdKYKsOSIKt8xxKuH1ye6Y+fa+j1EkNqJv+2219yYerBBR1I7toVNQ2aB/g38UHwPaZA==`。
> Official Registryは0.20.3 active/latest。この端末のglobal installを0.20.2→0.20.3へ更新し、
> registry由来binaryで3 bins、initialize version、13 tools、stderr 0 bytesを確認。設計はADR 0020、公開受入はADR 0021。

> **v0.20.2（2026-07-26公開）**: npmと各公開面で、Claude CodeからCodex CLIの対話TUI
> （スラッシュコマンド・`$imagegen`を含む）を操作できる差別化、現行README、作者帰属を前面化した。
> npm authorは`Quo / クオ at kitepon.dev`、URLは`https://x.com/QLyun35332`として公開APIで確認。
> v0.20.1では丸括弧をnpmのlegacy author parserがURL記法として再解釈しX URLを捨てたため、
> v0.20.2で括弧を使わない表記へ訂正した。npm tarballはSmithery生成物を除外し14 files、
> 382,455 bytes。runtime・MCPの13 tools・3 binsは0.20.0から不変。
> 検証: v0.20.1 local full regression 311/311、v0.20.2 focused release/server smoke 4/4、
> MCPB build/schema/icon/archive、npm pack dry-run。公開commit `3715c7a`、tag CI
> `30203465207`の全9job successとnpm provenance publish、MCP Registry workflow
> `30203465282` success。npm latest=0.20.2、integrity
> `sha512-IOlBjlrII8tbUWy0axSXjLw5T/HKUrPcIR90UVKga8qy1dQIK0u/Qn/Ygy3guVsnMUWN9pNhmacUAJ1abLCX+w==`。
> Registry由来の隔離installでversion 0.20.2、3 bins、13 tools、stderr混入ゼロを確認。
> 公開受入はADR 0019。
>
> **v0.20.0（2026-07-26公開）**: `aiterm-wait`の`outcome`へ`running`（exit 5）を追加。
> `--timeout 0`は以前から「待たずに一度だけ観測する照会」として動いていたが、未完了を
> `timeout`（既定600秒待って終わらなかった）と同じ語で返していたため、軽い照会の答えが
> 失敗・異常として親へ届き、「投げる→自分の作業→一度だけ様子見→まだなら作業へ戻る」が
> 語彙として存在しなかった。`running`は`timeout=0`の未完了だけに割り当て、1秒以上の待機の
> 未完了は`timeout`のまま＝待ち方の意味は変えない。outcome→exit codeの対応表は全outcomeを
> 型で網羅強制する（語を足して表を直し忘れると`undefined`からexit 0になり、**未完了が完了として
> 親へ届く**。不足させると実際にcompile errorになることを確認済み）。`closed`と未知sessionは
> `running`へ倒さない。照会はreceipt・tool descriptionで宣伝せず、押し込み機構を持たない親向けの
> 逃げ道としてREADMEにだけ置く＝ADR 0017で排した「親が子のお守りをする」誘惑を戻さない。
> MCPの公開toolとschemaは不変で、影響は`aiterm-wait`のreceiptだけに閉じる。設計はADR 0018。
> `aiterm.agent-wait-result.v1`のoutcome語彙が増えるためpatchでは出さずminor bump（0.19.3→0.20.0）。
> 検証: local full regression 311/311（新規4件込み）。
> 公開証跡: 公開commit `0ad1e6d`、tag CI `30199631692` の全9job success（test-windows含む）と
> npm provenance publish、MCP Registry workflow `30199631718` success、npm latest=0.20.0。
> npm integrity `sha512-S93YUspzJ/NBuVFvPlZPHADWKBuU7nzsGGIHJtbDTmqjeeORDAaph0XozdF2nVGTt8qdOlRJlJulShY+ZuXK8Q==`。
> global installのdistはlocal distとバイト一致。公開binで実codex子を走らせ、走行中の照会が
> `outcome=running`／exit 5、完了後が`done`／exit 0、未知sessionがexit 1（runningへ倒れない）、
> usageに照会の説明が出ることを実機確認した。
>
> **v0.19.3（2026-07-26公開）**: 「非ブロックdispatchが要なのに親が待つ使い方に流れる」という
> 実運用報告の還流。案内の文型が原因で、①全descriptionが「即返る」の直後に完了待ち手順を続けて
> dispatch→waitを一続きの手順に見せ、「待たなくてよい」という許諾がどこにも無かった
> ②起動形の指示が「ホストのバックグラウンドタスクとして実行」という抽象名詞だけで、
> 具体形を知らない親がforeground実行へ落ち既定600秒ターンを塞いだ。
> 対処は、案内の第一文を「投げっぱなしでよい＝ここで待たない」の宣言へ反転し、foreground実行の
> 禁止を本文へ含め、完了待ちの起動形を親ホスト別に名指しすること。MCP initializeの
> `clientInfo.name`が`claude-code`ならreceiptへ`Bash(command: ..., run_in_background: true)`を出し、
> 取れない／未知のホストは汎用の非ブロック指示へ落ちる。tool descriptionは`registerTool`時＝
> initialize前に固定されるためホストを名指しできず、汎用の断定形を持つ（ホスト別の具体形はreceiptが所有）。
> `aiterm-wait`の既定timeout・exit契約・outcome語彙・公開schema・完了判定は不変＝
> **待つ主体はwaiterプロセスであって親ではない**、が本変更の分界。設計はADR 0017。
> 検証: local full regression 307/307（新規pure 4件込み）、実物のClaude Codeから
> `clientInfo.name="claude-code"`を実測（`initialize`→`notifications/initialized`→`tools/list`の順で
> 届くため、どのtool呼び出しより先に確定する）、実codex子で launch receipt → 案内どおりの完了待ち →
> `outcome=done` → transcript回収 → close まで通した。
> 公開証跡: 公開commit `47ff318`、tag CI `30198620312` の全9job success（**test-windows含む**）と
> npm provenance publish、MCP Registry workflow `30198620296` success、npm latest=0.19.3。
> npm integrity `sha512-ao0XGC+UK/FJPfH8C8BPxDVSJMoNtbpOkoDwgssyhYvm3hyuiEr0Qwa3gftYbXTRBD6lUahr4+ZYNRvd6pC0Sw==`。
> registry由来の隔離installで version・bin 3種・13 tools・dispatch系5ツールの非ブロック規範を確認。
> この端末へglobal installし、installed distはlocal distとバイト一致。公開後smokeとして
> global installの0.19.3で実codex子を起動し、receiptが`Bash(command: "aiterm-wait --session pub_smoke
> --cursor 0", run_in_background: true)`とホスト名指しで案内すること、その案内どおりのコマンドが
> `outcome=done`で返ること、transcript回収（`PUBOK`）とcloseまでを実機確認した。
> 当時の残タスク「`--timeout 0`の一発照会に`running` outcomeを足す件」は v0.20.0 で消化済み。
>
> **v0.19.2（2026-07-20公開）**: Windows nativeでWSL側tmux serverが未起動の時、
> `diagnostics`が`pty_list.status="not_applicable"`と`session_count=0`を同時に返し、公開契約の
> status/count不変条件へ違反してdotagents factory adapterからpresence不明扱いされた欠陥を修理。
> `not_applicable`ではcountを`null`とし、一覧取得成功の`ready`時だけ非負整数を返す回帰を追加した。
> 公開commit `cd42e43`、local full regression 303/303、tag CI `29693472622`の全必須jobとnpm
> provenance publish、MCP Registry workflow `29693472240`がgreen。npm integrity
> `sha512-/jz+V746N/ShgOhs6214s6ihc6d5M81VTRsRwiyX32jJ4wxUsPl1vOCkAjL01lHI0E5+2z2FYC8p5UefeDVqyQ==`。
> 4hostへregistry版0.19.2をglobal installし、Mac installed distのsource一致とWindows dotagents
> factory post-update gate success（report `f5d34e01-1e66-4cf3-8932-f6d6fd2cbab9`）を確認した。

> **v0.19.1（2026-07-19公開）**: 通常PTYのPOSIX shellへ複数行を一括送信した際、途中で起動したpagerが後続行の先頭をキー入力として消費し、commandを変形させる欠陥を修理。sanitize済み複数行を改行なしの単一`eval`入力へ可逆変換し、shellがscript全体を所有してから実行する。単一行、`raw:true`、非shell前面は従来の直接pasteを維持する。入力窃取を行う前面programの回帰を追加。

> **v0.19.0（2026-07-19公開）**: managed Claudeのactive turn中に正規の権限確認UIが出ると、
> 通常send／`force:true`／C-c以外のkeyがすべて拒否されStopへ到達できないデッドロックを修理。
> `claude_approval`を追加し、inspectでactive operationと現在画面のSHA-256 digestを観測、respondで
> 同じoperation・同じdigestをsend lock内で再検証して`approve_once | deny`だけを送る。任意文字列、恒久許可、
> 未知UI、画面変更後の入力は拒否し、markerは維持、prompt本文なしのowner-only receiptを残す。
> 公開面は計13ツール。設計はADR 0015。local full regression 300/300、tag CI `29682309390`の全必須jobとnpm provenance publish、Registry workflow `29682448833`がgreen。公開commit `96d461c`、npm latest=0.19.0、GitHub Release公開済み。registry由来隔離installとこの端末のglobal installでversion・3 bins・13 tools・approval schema・local dist一致を確認した。実Claude model requestを使うapproval smokeも承認済みcampaignで通過し、fixture検証とは区別して扱う。

## 現状: Node/TS の npm パッケージ `aiterm-mcp`（stdio MCP サーバ）

> **2026-08-04 v0.22.0設計**: launcherは4vendorとも通常のproject／user環境を共有する。
> Claudeだけは完了相関用Stop hook settingsを通常`user,project,local` settingsへ加算し、Codexは通常rollout、
> Grok/Composerは通常session event/historyを完了・回答正本として読む。Grok/Composerは共有MCPの
> `mcp_init_completed`後かつ入力欄readyまで送信しない。旧managed home／snapshot経路はfallbackとして残さない。
> 現行Decisionは[ADR 0025](docs/adr/0025-shared-agent-environment-and-lineage.md)を正とする。

> **2026-08-03 v0.21.3設計**: Codex完了正本をmanaged Stop hookからroot rollout transcriptの
> `task_complete.turn_id`へ移した。実障害は長寿命serverがHomebrew Cellarの版付き`process.execPath`を
> hook設定へ固定し、Node更新後に旧実体が消えて`exit 127`、`aiterm-wait`が600秒timeoutを反復したもの。
> Codex managed homeはStop hookと`--dangerously-bypass-hook-trust`を作らず、既存`event_cursor`を
> dispatch直前のtranscript byte境界として使う。Claude/Grok hookは継承PATHの`node`を実行時解決する。
> `codex_agent`説明にはmodel/effort/cwd/write_scopeを揃えた委譲呼出し完全例を載せる。
> 不変Decisionと因果は[ADR 0022](docs/adr/0022-codex-rollout-completion.md)を正とする。

> **v0.12.2（2026-07-13公開）**: 公開面は `diagnostics` を加えた計10ツール。factory向けread-only診断と製品所有のoffline runtime error aggregateを追加した。
> collectionはschema-exact canonical dotagents configの`collection.enabled`がJSON boolean `true`の時だけ有効で既定OFF、network送信は行わない。raw exception/stderr/stack/prompt/PTY/transcript/event/pathはAPIで拒否する。
> 公開commit `239e7e4`、tag CI `29245251184`、npm `latest`、tag / GitHub Release、MCP Registry workflow `29245462227`、registry由来隔離installから10-tool MCP diagnosticsとruntime snapshotまで確認済み。

> **v0.18.0（2026-07-18公開・実運用障害の還流／敵対的検証済み）**: 実障害（managed Codex子がMCP initializeでハング中、初回promptがcomposerに未submitのまま2h18m座礁・文字混入・気づく手段なし）の還流4点。
> ①stale v0.15文言6箇所（`pty_send(wait:"agent_done")`案内）をv0.17実手順へ置換。初回prompt完了待ちの復旧案内は `aiterm-wait --session <id> --cursor 0` を明示（cursor省略の既定はwaiter起動時EOFで、表示〜実行の間に書かれたdone eventを読み飛ばすrace。event fileはper-launchゆえ0起点が安全）。
> ②agent dispatch経路（初回prompt＋follow-up）のpasteを `paste-buffer -p`（bracketed paste）へ。tmux negotiationによりpaneが要求時だけESC[200~/201~で包む＝チャンク投入のキー解釈による文字混入・Enter取り落としを抑制。macOSは256byte chunkごとに個別bracket。通常shell送信は不変（バイトレベル回帰で固定）。
> ③初回prompt前ready gateへbusy除外を追加: Codex/Claudeは「esc to interrupt」表示中をreadyと数えない（MCP init等がcomposer描画の裏で走る画面への投入封じ）。Grok/Composerはbusy文字列の実機根拠未採取のため対象外。`inferAgentFrontend`は旧判定のまま。
> ④submit座礁観測 `submit_residue`（additive nullable）: dispatch後、送信text正規化末尾32cpが「最後の入力欄マーカー行以降」に残存するかを有界ポーリング（最大~1.5s・成立時は~300msで早期確定）で観測し、`aiterm.pty-send-result.v1`／`aiterm.agent-launch-result.v1`／`aiterm.claude-operation-result.v1`(issue) へ載せる。true=座礁の強い疑い（警告文はscreen確認→Enter再submit/Escape破棄を案内・盲目Enter禁止）、false=残存観測せず（成立の保証ではない）、null=対象外/判定不能。観測のみでauto-retry・例外化はしない。
> refuter反証（1st pass）: P0なし、P1 2件（復旧案内の--cursor欠落＝race再導入・claude_turn issueが観測を破棄する契約矛盾）を検出し還流済み。full regression 297/297（新規6件込み）。additive schema追加のため0.18.0へminor bump（package.json／package-lock／server.json同期）。
> 公開証跡（2026-07-18）: 公開commit `1752196`、tag CI `29643046738` success（**test-windows含む全ジョブgreen**＝Windowsブロッキング化後の初通過）、npm latest=0.18.0、MCP Registry workflow `29643046586` success。隔離install（scratchpad）で version・bin 3種・12ツール・`submit_residue` schema 3面（pty_send／launcher／claude_turn）・`--cursor 0`案内・aiterm-wait エラー exit=1 を実機確認し、installed dist はローカル dist とバイト一致。
> **v0.18.1（2026-07-18公開）**: 0.18.0公開検証中に発見した stale 文言の取り残し1件（aiterm-wait の非管理セッションエラーが v0.16 で撤去済みの `codex_agent(agent_done:true)` を案内）を launcher 案内へ置換して patch 公開（prefix「agent_done 管理セッションではありません」は内部match用に不変）。
> 公開証跡（2026-07-18）: 公開commit `45f52f8`、tag CI `29643534998` success、MCP Registry workflow `29643535111` success、npm latest=0.18.1。この端末（macOS）の npm global install を 0.18.1 へ更新し、installed dist はローカル dist とバイト一致。稼働中 MCP サーバプロセスは接続時の版のまま（diagnostics 実測）で、各 host の次回 MCP 再接続から 0.18.1 が有効になる（tmux session はサーバプロセスと独立に永続＝設計どおり）。
> **v0.18.2（2026-07-18公開）**: managed Codex home が source `CODEX_HOME/agents/*.toml` を継承せずcustom role routingが `default` だけになるP1を修理。定義は起動時snapshot-copyし、source symlinkは実体をprivate regular fileへ複製する。`agents/` 不在・空は正常。auth/config/hooks以外のsession/cache隔離は維持する。hook trust stateは別途複製しない: aiterm所有Stop hookは起動時の `--dangerously-bypass-hook-trust` で当該processだけ確実に実行し、project directory trustは別安全gateとしてconfig snapshotから継承され、未trust cwdを自動承認しない。公開commit `ee015b7`、tag CI `29648775495` success、npm latest=0.18.2。0.18.2ではGitHub ReleaseとRegistry再登録が欠落し、0.19.0公開で正規の連鎖へ復帰する。
>
> **v0.17.0（2026-07-18公開）**: オーナー裁定「waitは廃止。引数を減らし使い方のパターンを減らす」による breaking 再設計（v0.16.0として内部確定）に、実運用フィードバック還流（aiterm-wait exit code=outcome連動・launch receiptのwait_command/event_cursor・完了受信手順の説明明記）を重ねて0.17.0で公開。
> ①`pty_send` から wait/timeout/screen/lines/operation_id を撤去。agent session への send は自動で**非ブロック dispatch**になり
>（ready gate・submit 分離内蔵・即返り）、`aiterm.pty-send-result.v1`（mode: sent|agent_dispatch）で **event_cursor**（送信直前の
> event file 境界）を返す。`force:true`は非Claude agent／通常PTYの手動介入用で、managed Claude active turnの相関境界は越えない。②`claude_turn issue` は timeout 撤去・dispatch-only で即 accepted。
> ③launcher 4種から agent_done/wait/timeout/screen/lines を撤去し**常に managed 起動**（手動運転は pty_open＋vendor CLI 手動起動へ）。
> 初回 prompt は ready gate 経由で送信して待たずに返る。④`aiterm-wait` に --cursor を追加＝dispatch 後起動でも取りこぼしゼロ
>（全 vendor で起動順序非依存）。完了待ちは aiterm-wait 一本（Claude 親=background、押し込み機構の無い親=foreground shell）。
> core は sendAndWaitAgentDone/waitAgentDoneEvent/wait lock 取得系を削除し dispatchAgentTurn/observeAgentDone(cursor) へ置換。
> close/killAll の他プロセス wait lock 検査は cross-version 安全弁として残置。full regression 290/290。
> 2026-07-18 追補（実運用フィードバック還流）: `aiterm-wait` の exit code は outcome を映す（0=done / 3=timeout=未完了・既定600秒 / 4=closed / 1=エラー。exit≠完了、receiptのoutcomeが正）。
> launch receipt `aiterm.agent-launch-result.v1` に additive nullable の `event_cursor`/`wait_command` を追加（初回prompt時だけ非null）。
> launcher 4種の説明に完了受信手順を明記し、transcript未完了エラーは aiterm-wait のバックグラウンド実行を指す。full regression 291/291。
> 公開証跡（2026-07-18）: v0.16.0は先行して当日npm公開済み（tag CI 29636924981）。v0.17.0公開commit `1ce7cf2`、tag CI `29638878280` success、MCP Registry workflow `29638878302` success、npm latest=0.17.0。
> 隔離install（scratchpad）で version・bin 3種・12ツール・launcher説明のwait guide・launch schemaのevent_cursor/wait_command・エラーexit 1 を実機確認し、installed dist は full regression 291/291 通過のローカルdistとバイト一致。
> 履歴注記: 旧ci.ymlの`test-windows`／`windows-latest`記述はv0.25.0以前の仕様。現行はself-hosted 4環境で同じfullを必須実行し、OS別jobや縮小suiteを持たない。
> 実機E2E通過（2026-07-18）: 実codex子でmanaged起動→dispatch即返り（cursor=0）→**dispatch後起動**の `aiterm-wait --cursor` がdone受信→harness re-invoke→transcript turn_id一致で回収→close。cursor起動順序非依存を実機確認。
>
> **v0.15.1（2026-07-18公開）**: `claude_agent`を追加し、PTY 6＋対話launcher 4
>（Claude/Codex/Grok/Composer）＋diagnostics 1＋構造化Claude caller 1＝計12ツール。Claudeは`claude -p`反復ではなく、
> 利用者がattachできる同じClaude Code TUI sessionへ初回／follow-upを送る。launch専用settingsの
> Stop hookが本文なしeventとowner-only bounded resultを分離し、timeout後もprompt再送なしで同じ
> sessionから回収する。durable callerの`operation_id`を送信→Stop event/result→回収へ相関し、古い結果の
> 誤帰属、同一ID再送、未解決operation中の別ID送信を拒否する訂正gateも受入済み。`claude_turn`は
> `issue`／`recover`を構造化statusへ固定し、完了時だけexact raw resultを返す。operation相関の関連122/122、
> full regression 262/262、独立反証の最終判定はP0/P1/P2残存なし（ADR 0006）。
> 構造化caller gateはfocused 5/5、related 126/126。親反証でrecoverへの暗黙timeout注入を除去済み
>（ADR 0009）。
> launcherは既存text互換に加え、session handleを文字列解析なしで得る`aiterm.agent-launch-result.v1`
> structured receiptを公開する。focused 4/4、related 94/94で受入済み（ADR 0011）。
> operation相関とstructured close receiptは0.14.0で内部確定し、aiterm-wait追加で0.15.0へbumpして公開した（既公開0.12.3からの次版・ADR 0007・0012）。
> Observer queue 19e実Claudeで、入力欄の単発ready直後に初回promptがstartup再描画へ消えるraceを再現した。
> 初回prompt前の4 vendor共通ready gateを11回連続pollへhardeningする修理はADR 0014／plan 15どおり完了し、
> pure 21/21、focused agent 4/4、related 113/113で受入済み。queue 19eの実managed Claude再検証待ち。
> B方式統一の完了push（2026-07-18）: 新bin `aiterm-wait`＋`core.observeAgentDone()` を追加。events.jsonlの純リーダーとして完了を待ち `aiterm.agent-wait-result.v1` receipt（done/timeout/closed）でexitする。lock/metadata/dispatch不干渉・launch_id隔離で多重waiter安全。dispatchは `claude_turn issue(timeout:0)`／`pty_send(wait:"agent_done",timeout:0)`。focused 16/16。Codex親のpush受け口は上流待ち（openai/codex#17543/#18056）。実Claude Code親のlive E2Eは2026-07-18通過（実codex子・re-invoke→receipt turn_id一致→transcript回収→close）。
> 公開手順: main push → `gh release create v<ver>` で tag 生成 → CI が npm publish --provenance（OIDC Trusted Publishing）、GitHub Release で registry.yml が MCP Registry 再登録。npm install 検証まで本セッションで実施。端末のMCP設定更新は各hostで別途。
> 実Claude model requestのlive smokeは承認済みcampaignで完了。
> 下記の10-tool記述、括弧内の旧ラベル「現行公開は0.17.0」、test件数は当時の公開済みreleaseの履歴であり、現sourceの公開面ではない。現行sourceは15 toolsで、通常環境契約は冒頭のv0.28.0／v0.22.0とREADME、ADR 0038／0025を正とする。

**直前の公開面 v0.12.2（2026-07-13・factory diagnostics / local runtime error store）＝計 10 ツール**（当時その後の公開は 0.17.0＝12 ツール＋`aiterm-wait` bin〔exit=outcome連動〕。以下は当時の公開面の履歴。v0.12.0 が全域監査の確定修正＋長い TUI 回答の transcript 回収。監査ダイジェストは docs/11、transcript 設計は docs/12。v0.11.0 は GPT-5.6/Grok 4.5 世代モデル整合）: PTY 6 ツール（`pty_open`/`pty_send`/`pty_read`/`pty_key`/`pty_close`/`pty_list`）＋**対話エージェント起動 3 ツール**（`codex_agent`/`grok_agent`/`composer_agent`、v0.7.0〜。各ベンダー CLI の対話 TUI を永続 PTY 内に起動して session_id を返し、以後 pty_read/pty_send で操作。前提検証は effort→bin→cwd の順で session 作成前・失敗時の残骸ゼロ保証は v0.7.1）。2026-07-07 に `agent_done:true` + `pty_send(wait:"agent_done")` の managed Stop hook route を実装。未 bind の初回 `pty_send(wait:"agent_done")` は vendor TUI の入力欄 ready を送信前に待ち、未 ready なら文字列を送らずエラーにする。Codex/Grok/Composer は実 smoke（OK応答・`is_complete=True via agent_done vendor=...`）まで通過。Grok/Composer は追加敵対的検証で `GROK_HOME` 全体共有案を棄却し、per-launch isolation を維持しつつ OAuth `auth.json` と `auth.json.lock` だけを通常 Grok home と共有する実装へ修正（0.9.1当時。2026-07-14に廃止し、検証済み正本を`GROK_AUTH_PATH`でvendorへ渡す契約へ置換）。v0.9.1 で Codex managed `CODEX_HOME` は `auth.json` だけを通常 Codex home へ symlink し、`config.toml` は private copy、その他の `~/.codex` エントリは共有しない allowlist に修正した。`grok login` 後に Grok TUI・Composer TUI・通常 headless `grok -p` の並行 smoke も通過し、login 再要求なしを確認。2026-07-07 に `node dist/index.js` を実起動し、JSON-RPC `tools/call` 経由でも3 vendor同時 `OK` + agent_done suffix と普通PTY Python REPL を確認済み。ready gate 実装後は、明示的な `pty_read` ready 待ちなしで起動直後に即 `pty_send(wait:"agent_done")` する smoke も通過。agent_done の負系/race は stale event・初回 prompt done・TUI ready gate・同時 wait・即時 event・`launch_id`/`vendor_session_id` 不一致・bind 後の vendor_session_id 欠落・bind 前 vendor_session_id 混在・初回 prompt pending・partial/malformed/oversized JSONL・done後 offset consume・wait file lock・wait 中 close/killAll 拒否・hook no-env・path injection・hard link 拒否・secure root・core cleanup root symlink no-follow・緩い state root での stale metadata cleanup・screen settle・MCP schema・managed home cleanup を回帰化済み。同一 cwd で Codex/Grok/Composer を並列起動して event 混線なし、普通PTYの Python REPL も実 smoke 済み。経緯: v0.5.0-0.6.0 で非対話 `delegate` を実装→対話パラダイム不整合のため v0.7.0 で撤去（非対話委譲は codex-sidecar の責務）。リリースは **tag `v*` push で CI が npm publish --provenance、GitHub Release 公開で registry.yml が MCP Registry 再登録**。回帰テストは計 **205 件**。

**v0.11.0（2026-07-11・GPT-5.6/Grok 4.5 世代整合＝docs/10 消化）**: ①3ツールに `model` 引数を追加（codex=`-m`、grok/composer=`--model` 上書き。空/空白は session 前拒否）。②`grok_agent` の既定モデルを stale な `grok-build` から **`grok-4.5`** へ更新（ライブカタログ実測に整合）。③codex managed `CODEX_HOME` の config.toml copy は、引数で渡した `model`/`reasoning_effort` に対応する top-level ピンを上書き（端末の ultra ピン等が対話子へ黙って波及しない。渡さないキーとテーブル以降は原文保持）。④grok/composer への `reasoning_effort` 指定は**起動前に明示エラー**（grok CLI の `--effort` は headless 専用・対話 TUI では警告の上無視されるため。旧 `low/medium/high/xhigh/max` enum は撤去）。⑤codex 起動応答に実効 model/effort と出所（引数／端末config継承／CLI既定）を常時明示し、実効 effort=ultra は proactive 自動委譲 ON の警告付き。前提検証順は model/effort→bin→cwd。

**2026-07-05〜07 の主な挙動変更（利用時に留意）**: ①`pty_read` の `until` は**既定でリテラル部分一致**（正規表現は `until_regex:true` でオプトイン）。②`pty_send(mark:true)` は `pty_read(wait:true)` が **until 無しでも sentinel を自動検出**して完了確定する（POSIX shellとPowerShellに対応。PowerShellは成功0／失敗1、fish/csh/tcshは拒否）。③`read rtk:true` の pytest は**収集エラーを緑/無害に偽装しない**。④破壊ゲートに `rm -rf ./*`・引用符付き root・`..`・`./` を追加。⑤`screen+wait`・`full+lines` が機能化。⑥エージェント起動フラグ・モデル ID は実 CLI で裏取り済み（`codex 'prompt'`／`-c model_reasoning_effort=`／grok `--model grok-build|grok-composer-2.5-fast --effort <lvl>`）。⑦`agent_done:true` は managed vendor home を使い、通常 hook file を触らず Stop hook を aiterm 単独所有にする。未 bind の初回送信では vendor TUI の入力欄 ready gate を通し、未 ready なら送信前エラーにする。Codex TUI では text 投入直後の Enter が submit として落ちる罠があり、agent_done 経路だけ text と Enter を分離して短い delay を挟む。Grok/Composer は `--no-auto-update`・fake `HOME`・managed `GROK_HOME` で compat hook/plugin 混入を抑え、OAuth は検証済み通常auth正本を`GROK_AUTH_PATH`でvendorへ渡し、managed homeへauth/lockを置かない。Grok/Composer 実 smoke は `grok login` 後に通過済み。

履歴メモ: v0.4.1 は発見性メタ/README 刷新のリリース、v0.7.0 は対話エージェント起動3ツール追加、v0.9.0 は `agent_done` 公開、v0.9.1 は Codex managed home allowlist hardening、v0.10.0 は Codex launcher 初回 prompt wait 公開、v0.11.0 はモデル整合（`model` 引数・`grok-4.5` 既定・effort 実態合わせ）公開、v0.12.0 は全域監査の確定修正（stale wait lock 回収・close/killAll のプロセス間ガード・出力削減の行内キャップ・UTF-8 先頭境界・pytest 証拠ガード・破壊ゲートの `--`／rtk 変換後・line_range 逆転エラー・pty_list agent 列・codex managed config 可視化）＋新機能 `pty_read(agent_transcript:true)`（長い TUI 回答を vendor transcript から回収）公開、v0.12.1 は監査 C 節の hardening 全消化（stop hook short-write ガード・agent events の 64KB tail 読み・非 agent read の negative-cache）。詳細な版別差分は `CHANGELOG.md` と `docs/archive/` を参照する。

- **実装は Node/TS**（要件: Node>=18 + tmux/psmux）。`src/index.ts`（`@modelcontextprotocol/sdk` で15ツール公開〔PTY 6＋標準agent起動1＋旧互換launcher 4＋起動中agent設定変更1＋read-only diagnostics 1＋構造化Claude caller 1＋Claude approval relay 1〕・stdio）/ `src/core.ts`（PTY制御・出力削減・完了検出・安全ガード・harness共通の進行役〔launcher/dispatch/configure/approval フロー〕・rtk委譲。**stdout に出さない**＝通信を汚さない）/ **v0.27.7-0.27.8 で vendor/OS 固有コードを分離**（docs/32。0.27.7 は `files` glob が `dist/vendors/` を同梱せず公開版が起動不能＝0.27.8 が修正版。tarball 同梱はrelease-metadata testで固定済み）: `src/harnesses/{claude,codex,grok,cursor}.ts`（各harnessの起動引数・ready/画面判定・完了検出・transcript回収・metadata生成・auth/catalog検証。composer は grok の別モデルpreset）/ `src/agent-shared.ts`（harness中立の共有プリミティブ: state path・metadata型・完了event型・lineage）/ `src/tmux-runtime.ts`（tmux/psmux の OS 差の所有者）/ `src/psmux-send-worker.ts`（Windowsのsession server認証済みbyte送信とConPTY pacing）/ `src/agent-resolver.ts`（実行ファイル解決の OS 差）。依存方向は core → harnesses → agent-shared → (tmux-runtime, errors) の一方向で、harness固有を直すなら harnesses/、OS 固有なら tmux-runtime/agent-resolver、共通なら core を触る。/ `src/claude-stop-hook.ts`・`src/grok-stop-hook.ts`（必要なharnessだけのhook本文分離。Cursor hookは持たない）/ `src/runtime-error-store.ts`（explicit opt-in・固定 allowlist aggregate・strict validation・child orchestration）/ `src/runtime-error-worker.ts`（bounded isolation）/ `src/runtime-errors-cli.ts`（factory snapshot/ack）/ `src/rtk.ts`（コマンド別 reducer）/ `src/aiterm-wait-cli.ts`（親向け完了push用の純リーダー waiter。`core.observeAgentDone()` を呼ぶ薄い殻）。`npm run build` → `dist/`。`package.json` の bin は `aiterm-mcp` と `aiterm-runtime-errors` と `aiterm-wait`。
- 削減と完了検出: `read` 既定で制御除去・反復圧縮・head+tail＋復元ヒント・メタ併記。`read rtk:true` は直前コマンド別の自前 reducer、`send rtk:true` は rtk バイナリへ委譲（rtk 不在は素通し）。完了検出は dead / `until` / quiescence(出力静止∧シェル復帰) / nested(ネスト中∧until無しで出力静止→確証不能ゆえ未確定で早期返却) / timeout。`until`／`mark`指定時はその証拠をquiescenceより優先する。長い入力はUTF-8安全な256byte単位を保ち、POSIXはtmux paste間隔、Windowsはpsmux session serverへの認証済み`SendBytes` pacingと最終drainで黙った欠落・別process交差を防ぐ。SSH/docker はツール化せず `send "ssh ..."` で入る（ネスト）。tmux/psmux 常駐ゆえプロセスをまたいで永続し、人は戻り値のplatform別attach commandで覗ける。
- 出力削減の自前移植 `src/rtk.ts`（要件C: rtk ファイル非複製・自作。**pytest は rtk 0.42.0 と一致**。ただし `FAILED` 要約行の理由は可読性優先で全文保持＝意図的に rtk と相違／grep／git status・log／簡易フィルタ）。
- `docs/00_overview.md` — docs の入口。正典級文書と ADR の地図。
- `docs/01_design-plan.md` — 設計の目的・判断・決定/未決事項の source of truth。**作業前に必ず読む。**
- `docs/02_mcp-plan.md` — MCP 化計画の履歴文書。現状の正は AGENTS.md と README.md。
- `prototype/python/` — 旧 Python 実装（最初の MVP・CLI＋FastMCP）。設計と reducer の**移植元／検証基準**（pytest reducer は rtk **0.42.0** と一致。ただし `FAILED` 要約行の理由は可読性優先で**全文保持**＝意図的に rtk と相違）。成果物は Node 版で、こちらは参照専用。lint は未整備。
- `test/` — **Node版の回帰テスト**（`node:test`、`npm test`でbuild→実行・tmux必須）。reducer、PTY、launcher、runtime error store、MCP schema、release metadataをfocused testへ分け、現行fullは`test/*.test.mjs`をすべて実行する。開発中は変更に直結するfocused testだけを回し、関連gate完了後にfullを1回実行する。GitHub Actionsはself-hostedのmacOS native・Linux native・Windows native・WSL2で同じfullを同時実行し、OS別の縮小suiteや手動検証を最終gateの代用にしない。
- **現行テスト補足**: 直前の詳細一覧にある「10ツール・`pty_send.wait` schema・183件・`test/codex-stop-hook.test.mjs`・Windows非ブロッキング」は当時の履歴。現行`test/smoke.test.mjs`は15ツール、標準`agent_launch`のharness schema、旧4alias、Cursorを含む`agent_configure`／`claude_approval`のinput/output schemaを固定する。`test/cursor-agent.test.mjs`と`test/managed-stop-hooks.test.mjs`はCursor公式binary解決、CLI引数、live model catalog、通常transcript bind／turn境界を固定し、廃止済みCursor hookを配布物へ戻さない。`test/core-agent.test.mjs`／`test/core-pure.test.mjs`は通常環境共有、起動時model／effort、read-only sandbox、同一session設定変更、Cursor model picker、Grok model catalog、aiterm所有state限定cleanup、sub-agent lineage、Grok/Composerの`mcp_init_completed` ready gateを回帰する。Codexは通常rollout、Claudeは通常settingsへ加算したlaunch固有Stop hook、Grok/Composerは通常session event/history、Cursorは通常agent transcriptを完了・回答正本にする。旧managed home／MCP snapshot生成はproduction経路へ戻さない。現行CIはself-hosted 4環境すべてで同じfull`npm test`を必須gateとし、Windows native runnerはWSL distro所有者のinteractive taskで起動する（`NETWORK SERVICE`は不可）。
- `rag/` — **調査資産の RAG コーパス**。一次資料を MarkItDown で Markdown 化して蓄積する。`rag/ingest.py` が取り込みツール、`rag/INDEX.md` が総目次、`rag/manifest.json` が機械可読索引。詳細は後述「調査資産: RAG コーパス」。
- `.vscode/tasks.json` — Throughline が自動生成した token-monitor 自動起動設定。このプロジェクトの成果物ではなく編集対象外。
- `docs/*.md:Zone.Identifier` は WSL の Windows 由来メタデータ。中身に関係しないノイズ。
- `.claude/settings.json` は端末固有のため作らない。必要な端末で Claude Code の fewer-permission-prompts を使って生成し、`.claude/` 配下のローカル設定として保持する。

## このプロジェクトが作ろうとしているもの

AI がローカル/SSH/コンテナを問わずターミナルを**永続セッションとして**直接操作するための薄いツール層。現状の「コマンド 1 個ずつの細切れ往復」を解消する。

設計の核心（design-plan の §3–§9 を要約。詳細は必ず原典を参照）:

- **「ツールゼロの生直結」は採らない。** AI は stdout を読んでから次入力を決めるため、`stdin←AI出力` / `AI入力←stdout` の双方向観測ループは原理的に消せない。消せるのは JSON 組み立ての重さと接続し直しコストのみ。
- **プリミティブは「ローカル PTY を 1 個握る」だけ。** SSH・docker・wsl・tmux は専用ツールにせず、**その PTY の中へ `send` する 1 コマンド**へ格下げする。セッション種別をツールレベルで区別しない。
- **起点となる 4 ツール**: `pty_open()` / `pty_send(id, text)` / `pty_read(id, timeout)` / `pty_close(id)`。SSH 接続は `pty_send(id, "ssh home\n")` のように表現する。
- **バックエンド第一候補は tmux**（`capture-pane` で画面スナップショット・差分・再接続が得られる）。
- **完了境界の検出は quiescence 方式が第一候補**: 画面出力が一定時間変化しなくなったら完了とみなす。プロンプト文字列マッチは弱い（PS1 カスタマイズ・ネストで層ごとにプロンプトが変わる・誤検出）ため採らない。
- **適用対象は POSIX（Linux / WSL2 / macOS）とWindowsネイティブ**。POSIXはtmux、Windowsネイティブはpsmux 3.3.8以上＋Git for Windowsを直接使い、WSL橋は使わない（design-plan §9.6参照）。

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

## 2026-08-04 agent環境共有正本

4 launcherは通常`HOME`とharness homeをそのまま使い、credential/config/MCP/plugin/skill/permission/trustを
copy・symlink・snapshot・filterしない。Grok/Composerの旧fake `HOME`／private `GROK_HOME`とCodexの旧private
`CODEX_HOME`は履歴上の契約であり現行挙動ではない。cleanupはaiterm所有の相関stateだけを削除する。

## 作業時の注意

- 目的に直結しない改善、整理、調査を勝手に足さない。
- フォールバックで失敗を隠さない。必要なら発動条件、記録、ユーザーへの見え方を明示する。
- stdout は MCP の JSON-RPC 通信路なので、サーバ実装で不用意に出力しない。
- `prototype/python/` は旧実装で、移植元・検証基準として参照専用に扱う。
- `.claude/settings.local.json`、`.vscode/tasks.json`、WSL 由来の `Zone.Identifier` など端末固有/ノイズのファイルは、目的がない限り触らない。

## 主要コマンド

```bash
npm run build
npm test
```

`npm test` は `npm run build && node --test test/*.test.mjs` です。tmux に依存するテストがあります。テストしていない場合は、最終報告でテスト未実施と明示してください。

## 工場CI

- 正規リポジトリは `kitepon/aiterm-mcp`。移転前の `kitepon-rgb/aiterm-mcp` を新しい設定、URL、manifest、公開手順に使わない。
- 開発中は変更に直結するfocused testをローカルで回し、関連gateがgreenになってから`npm test`を最終確認として1回だけ実行する。
- GitHub Actionsの最終CIはself-hostedの`macos-native`、`linux-native`、`windows-native`、`wsl2`で同時に開始し、4環境すべてが同じ`npm test`を実行する。OS別の縮小suiteやGitHub-hosted runnerを最終CIとして扱わない。
- 4台はGitHub Organization `kitepon`のDefault runner groupが全repositoryへ共有する。repoをOrganization外へ移すと4環境jobはrunner未割当でqueueに残るため、移転時はCI・Trusted Publisher・manifestを同じownerへ同時に揃える。
- tag publishは4環境full greenとrelease commitの`origin/main`祖先確認を通過した後だけ実行する。npm Trusted Publisherは`kitepon/aiterm-mcp`と`.github/workflows/ci.yml`の組を正とする。

## 変更時の同期

- 公開挙動、設計判断、未決事項、テスト方針を変えたら、コードだけでなく `AGENTS.md`、`docs/01_design-plan.md`、関連 ADR、README/CHANGELOG のどれを同期すべきか確認する。
- リリースや公開メタデータに触る場合は、`AGENTS.md` と `docs/PROMOTION.md` を先に読む。

# Brief: 技術ビルディングブロックと未決A〜Fへの暫定回答

出典は [../sources/](../sources/)（completion-detection / backends / ansi-handling / safety）。各主張は [INDEX](../INDEX.md) 記載の一次資料に対応。

## 1. 完了境界の検出（design-plan 最難関 / 未決B）

**二大方式と、ネストでの壊れ方が判断の核心。**

- **quiescence（出力/画面の静止）**: [mcp-interactive-terminal](../sources/prior-art/mcp-interactive-terminal-amol21p.md)(300ms)、[interactive-shell-mcp](../sources/prior-art/interactive-shell-mcp-lightos.md)(waitForIdle)、[pi-interactive-shell](../sources/prior-art/pi-interactive-shell-nicobailon.md)(autoExitOnQuiet)、[tui-use](../sources/completion-detection/tui-use-readme.md)(100msデバウンス+`--text`)、[iterm-mcp](../sources/prior-art/iterm-mcp-hn-design-rationale.md)(プロセスのリソース低下=settling)。**長所**: プロンプト非依存・ネスト非依存。**短所**: exit code が取れない・遅い/ストリーミング/一時停止コマンドで早期誤判定。
- **OSC 133 / shell-integration マーカー**: [Contour仕様](../sources/completion-detection/contour-osc-133-spec.md)、[iTerm2](../sources/completion-detection/iterm2-proprietary-escape-codes.md)、[WezTerm](../sources/completion-detection/wezterm-shell-integration.md)、[kitty](../sources/completion-detection/kitty-shell-integration.md)、[Windows Terminal](../sources/completion-detection/windows-terminal-shell-integration.md)、VS Code は [OSC 633](../sources/completion-detection/vscode-osc-633-shell-integration.md)（`E`で実行コマンド確定・nonceで偽装防止）。**長所**: 境界 + exit code + コマンド文字列を正確取得。

**ネスト判定（local→ssh→docker）— ここで OSC 方式は壊れる:**

- VS Code 公式ソースが「自動マーカー注入は sub-shell / 素の ssh / 複雑構成で効かない」と明記（[nesting-limits](../sources/completion-detection/vscode-shell-integration-nesting-limits.md)）。
- tmux は未知エスケープを端末へ素通ししない＝**tmux層でOSC133が消える**。`allow-passthrough`/DCSラップが要る（[tmux#3064](../sources/completion-detection/tmux-osc-133-passthrough-issue.md)）。
- 例外的に [kitty の ssh kitten](../sources/completion-detection/kitty-shell-integration.md) は統合をリモートへ運ぶ。一般解にはならない。

**推奨（PRIMARY + FALLBACK）:**

1. **quiescence を基盤**（ネスト・プロンプト非依存だから）。[tui-use](../sources/completion-detection/tui-use-readme.md) の「画面安定 + 任意sentinel」が手本。
2. **我々が打つコマンドには sentinel マーカー併用**（`; printf '\n<<EOT:nonce>>\n'`）。我々が組み立てる行には確実に効き、exit code も `$?` で拾える中間策。ただし TUI が主導権を取ると効かない。
3. **OSC 133/633 は「その層に統合がある時だけ」exit code を上積み**（opportunistic）。無い層は 1+2 に落とす（[Roo-Code フォールバック設計](../sources/completion-detection/roo-code-shell-integration-fallback.md)）。
4. **TUI(vim/top) は「コマンド境界が無い」モードとして別扱い**＝静止＝描画落ち着き、で判定し send_control で抜ける。
5. tmux 制御モード `-CC` の `%begin`/`%end` ガードは**バックエンド層の決定論的境界**になりうる（[Control Mode](../sources/backends/tmux-control-mode-wiki.md)）。ただし [CERT VU#763073](../sources/safety/cert-vu763073-iterm2-tmux-rce.md): control出力の汚染でRCEの前例 → 制御チャネルと出力の分離が前提。

**閾値（未決B 本体）**: 固定msでなく**適応** — 出力レートの低下＋プロセス活動(CPU)を見て延長、最終 timeout で `is_complete:false` を返す（[mcp-interactive-terminal](../sources/prior-art/mcp-interactive-terminal-amol21p.md) の4層 / [wcgw](../sources/prior-art/wcgw-rusiaaman-screen-backend.md) の二段が前例）。

## 2. バックエンド（未決F の実証含む）

**要件**: エージェントはターンごとに起動→終了する。**セッションはエージェントのプロセス再起動を越えて生存**せねばならない。

- これを満たすのは detached 生存する **tmux / GNU screen のみ**。**node-pty / python pty は握ったプロセスと共に死ぬ**（単体では永続不可、別途デーモン化が要る）。→ **tmux 第一候補は妥当**（§9-4 追認）。[Getting Started wiki](../sources/backends/tmux-getting-started-wiki.md) でサーバ常駐モデルを確認、[resurrect](../sources/backends/tmux-resurrect-readme.md)/[continuum](../sources/backends/tmux-continuum-readme.md) で再起動復元。
- **実装短縮**: [libtmux](../sources/backends/libtmux-readme.md)（型付きPython: `send_keys`/`capture_pane`/`.cmd()`）。読みの唯一の窓口は [capture-pane](../sources/ansi-handling/tmux-capture-pane-man.md)（`-e`生 / `-p`プレーン / `-S..-E`スクロールバック）。
- **設計の二択**: 「画面エミュ無しの制御モード `-CC`（`%begin/%end` 決定論境界）」 vs 「capture-pane + quiescence」。前者は境界が正確だが汚染リスク、後者はネスト非依存だが exit code 無し → **ハイブリッド**（capture-pane基盤 + 可能なら sentinel/OSC で exit code）。
- **F の実証**: 「PTY1本 → bash → ssh → docker」が透過に通ることは [pexpect](../sources/backends/pexpect-overview.md)/[ptyprocess](../sources/backends/ptyprocess-readme.md)/[python stdlib pty](../sources/backends/python-stdlib-pty.md) の前例で原理確認済み。tmux 採用なら `send-keys` + `capture-pane` で同じ。残るは実機スパイク1本。

## 3. ANSI / 出力整形（未決C）

- **二択**: [strip-ansi](../sources/ansi-handling/strip-ansi-remove-escape-codes.md)（正規表現除去・安いが分割CSI/DCS/カーソル移動を取りこぼす）vs **仮想画面レンダリング**（[pyte](../sources/ansi-handling/pyte-screen-stream-tutorial.md) / [vt100-rs](../sources/ansi-handling/rust-vt100-screen-contents-diff.md) / tmux capture-pane = 最終的に見える画面）。
- **推奨**: 既定は**仮想画面で「見える確定テキスト」を返す**（[pyte の feed→screen.display](../sources/ansi-handling/pyte-screen-stream-tutorial.md) が pty_read の雛形）。これが TUI(vim/top) に唯一耐える。生バイトは要時のみ。
- **トークン節約**: **差分**（[vt100-rs `contents_diff()`](../sources/ansi-handling/rust-vt100-screen-contents-diff.md) / 前回画面との差）。TUI再描画はフレーム差分だけ渡す。生出力をそのまま流すと context が膨張する問題は学術的にも裏付け（[context engineering論文](../sources/ansi-handling/terminal-coding-agent-context-engineering.md)）。
- **正しさの典拠**: [Williams DEC parser 状態機械](../sources/ansi-handling/williams-dec-ansi-parser-state-machine.md)、[ECMA-48](../sources/ansi-handling/ecma-48-control-functions.md)/[xterm ctlseqs](../sources/ansi-handling/xterm-control-sequences-ctlseqs.md)。strip-ansi の正規表現で済ませない根拠。

## 4. 安全性（未決D）— 脅威モデルが本設計に直撃

LLM/外部由来テキストを PTY へ send → 画面を read して再推論、はまさに [Terminal DiLLMa](../sources/safety/terminal-dillma-llm-ansi-hijack.md) の脅威そのもの。

**必須対策（5点）:**

1. **send前サニタイズ**: 制御文字をエンコード/除去。特にブラケットペースト終了 `ESC[201~`（[CyberArkのバイパス](../sources/safety/cyberark-dont-trust-this-title.md)）、危険OSC（OSC52クリップボード/OSC8リンク、[weaponizing-ansi](../sources/safety/packetlabs-weaponizing-ansi.md)）を落とす。
2. **複数行 send はブラケットペースト**で囲む（部分実行・改行タイミング事故の低減、[xterm仕様](../sources/safety/xterm-bracketed-paste-spec.md)）。ただし保護自体は当てにしない（上記バイパス）。
3. **read 後の画面を信用しない**: カーソル移動上書き（[escape injection](../sources/safety/infosecmatter-terminal-escape-injection.md)）・タイトル読み戻し（[SwiftTerm CVE-2022-23465](../sources/safety/swiftterm-cve-2022-23465-title-injection.md)、[ANSI terminal security](../sources/safety/leadbeater-ansi-terminal-security.md)）で表示は欺瞞されうる。推論に入れる前に制御文字を無害化。quiescence判定も生エスケープを信じない。
4. **send前 破壊的コマンドゲート**: `rm -rf` / `DROP TABLE` 等（[destructive-command-guard](../sources/safety/destructive-command-guard-readme.md) 型のホワイトリスト先行）。
5. **tmux 制御モード採用時は制御チャネルと pane 出力を分離**（[CERT VU#763073](../sources/safety/cert-vu763073-iterm2-tmux-rce.md): 出力汚染でRCE）。

## 未決事項 A〜F への暫定回答

- **A 状態追跡**: OSC133/633が取れる層は cwd/exit を取得（VS Code `E`/`P`の手法）。取れないネスト層は、**send した遷移コマンド(ssh/docker exec)を我々が記録して層スタックを自前で持つ**。完全自動追跡は諦め、層スタック + 各層の検出能力フラグを保持。
- **B quiescence閾値**: 固定msでなく適応（出力レート低下 + プロセス活動）。コマンドは「静止 + 可能なら sentinel/OSC」、TUIは「描画静止」。
- **C ANSI**: 既定 仮想画面（確定テキスト）+ 差分。生は要時のみ。
- **D 安全**: 上記5点を必須要件化（send前サニタイズ + 破壊ゲート、read後無害化）。
- **E 階層モデル（PTY1個＋中で何でも）**: 妥当。先行実装多数が採用（[prior-art brief](prior-art.md)）。確定でよい。
- **F 実証**: tmux `send-keys`+`capture-pane`（または python pty）でネスト透過は前例から原理確認済み。残タスクは実機スパイク1本。

## 次アクション（設計→実装の入口）

1. **実機スパイク**: tmux 1セッションを握り、`bash → ssh → docker exec` をネストし、capture-pane の quiescence で完了境界が取れるか実測（未決F + B）。
2. 流用元（Terminus / mcp-interactive-terminal / tmux-mcp(nickgnd)）の該当コードを読み、send/read/完了検出の差分を確定。
3. read層に「仮想画面 + 差分 + 制御文字サニタイズ」を入れた最小 pty_open/send/read/close を試作。

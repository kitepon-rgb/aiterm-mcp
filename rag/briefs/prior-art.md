# Brief: 既存実装と「流用 vs 自作」(prior-art)

出典は [../sources/prior-art/](../sources/prior-art/) ほか。各主張は [INDEX](../INDEX.md) 記載の一次資料に対応。

## 結論（先に）

1. **我々の設計（1個の永続PTY + send/read、tmuxバックエンド、quiescence完了検出、SSH/dockerはsendで格下げ）は既に複数のOSSで実証済み。ゼロから作る必要はない。**
2. **「ツール経由は非効率」への直接の実測反証がある。** terminalcp の MCP vs CLI ベンチは、1個の永続端末を薄く握れば両形態とも成功率100%、差は小さく、**効率はプロトコル(MCP/CLI)でなく道具設計の質で決まる**と示す（[mcp-vs-cli](../sources/prior-art/mcp-vs-cli-benchmark-terminalcp.md)）。→ 削るべきは「単発・非永続・往復」であって「観測ループ」ではない、という design-plan §3 の結論を裏付ける。
3. **収束点**: ほぼ全実装が (a) 最小ツール群 `open/send/read/close (+send_control)`、(b) pull型read（生成行数だけ返し必要分をモデルが取りに行く）、(c) quiescence系の完了検出、(d) 危険コマンド確認、に収束している。

## ランドスケープ（3層）

**A. 我々とほぼ同型（永続・対話・1セッション）= 流用/学習の本命**

| 実装 | バックエンド | 完了検出 | 備考 |
|---|---|---|---|
| [Terminus / Terminus-2](../sources/prior-art/terminus-tmux-agent-harness.md) (Terminal-Bench) | tmux 1セッション | harness | send-keys→capture→思考。最小設計の手本、対象環境を別プロセスから駆動 |
| [mcp-interactive-terminal](../sources/prior-art/mcp-interactive-terminal-amol21p.md) (amol21p) | node-pty+xterm headless | **4層**(exit/prompt再出現/300ms静止/timeout) | REPL/SSH/DB/Docker/ネスト明記。quiescence設計の最有力参照 |
| [interactive-shell-mcp](../sources/prior-art/interactive-shell-mcp-lightos.md) (lightos) | node-pty+@xterm/headless | waitForIdle(純quiescence) | streaming/snapshot/screen の3読み出しモード |
| [terminal-mcp](../sources/prior-art/terminal-mcp-ianks-rust-pty.md) (ianks) | Rust native PTY | スマートバッファ | 「抽象化なし、ただのシェル」。pty open/send/read/close の正準形 |
| [tmux-mcp](../sources/prior-art/tmux-mcp-nickgnd.md) (nickgnd) | tmux | execute→get-result(commandId) | capture-pane の正準パターン |
| [mcp-ssh-interactive](../sources/prior-art/mcp-ssh-interactive-qnxqnxqnx.md) (qnxqnxqnx) | tmux | 非同期ポーリング | SSH常駐。state.json永続化 |
| [wcgw](../sources/prior-art/wcgw-rusiaaman-screen-backend.md) (rusiaaman) | GNU screen | 二段(短timeout+ストリーム継続) | screen -xで人間相乗り |
| [pi-interactive-shell](../sources/prior-art/pi-interactive-shell-nicobailon.md) | zigpty+xterm-headless | autoExitOnQuiet | 20行/5KB既定・増分・完了時末尾5行。Ctrl+Gで人間takeover |
| [Warp Full Terminal Use](../sources/prior-art/warp-full-terminal-use.md) (製品) | live PTY | — | 我々の構想と同一の製品実装 |
| [ripple](../sources/prior-art/ripple-yotsuda-shared-console.md) (yotsuda) | ConPTY/forkpty | **OSC 633マーカー** | 静止でなくマーカー注入の対抗アプローチ |

**B. 最小ラッパー（薄さの下限）**

- [tmux-mcp (jonrad)](../sources/prior-art/tmux-mcp-jonrad.md): 任意tmuxコマンドを薄く通すだけ。「端末へsendする1コマンド」に最も近い割り切り。完了検出なし。
- [desktop-commander](../sources/prior-art/desktop-commander-wonderwhy-er.md): start_process / interact_with_process / read_process_output(offset/length)。readiness検出 + ページング。

**C. 単発・非永続（= 我々の現在地、出発点）**

- [terminal-controller-mcp](../sources/prior-art/terminal-controller-mcp-gongrzhe.md), [mcp-server-commands](../sources/prior-art/mcp-server-commands-g0t4.md): プロセス終了=完了の素朴モデル。これが「現状の細切れ往復」そのもの。

隣接資料: [SWE-agent ACI論文](../sources/prior-art/swe-agent-aci-paper.md) / [Terminal-Bench論文](../sources/prior-art/terminal-bench-paper.md)（操作面の見せ方が性能を支配する根拠）、[Open Interpreter](../sources/prior-art/open-interpreter-readme.md) / [aider](../sources/prior-art/aider-in-chat-commands.md) / [Wave](../sources/prior-art/wave-terminal-ai.md)（実行確認・文脈取り込みUX）。

## 流用 vs 自作

**自作しない。** これだけ同型実装があり、難所（完了検出・ネスト・安全）も各所で既に踏まれている。

学習/フォークの本命（tmuxバックエンド志向 = design-plan §9-4 と一致。エージェントのプロセス再起動を越えた永続が要るため）:

- 設計の骨格 → **Terminus** + **tmux-mcp(nickgnd)** + **mcp-ssh-interactive**
- quiescence実装 → **mcp-interactive-terminal**(4層) + **interactive-shell-mcp**(waitForIdle) + **tui-use**(静止+sentinel併用)
- read層トークン効率 → **pi-interactive-shell** + **iterm-mcp**(pull型)

**我々の付加価値（既存が弱い所）**: ネスト(local→ssh→docker)での完了検出の堅牢化、quiescence閾値の適応設計、read層の制御文字サニタイズ（安全）。詳細は [technical-building-blocks](technical-building-blocks.md)。

## 設計の収束点（≒ design-plan §9 決定事項の追認）

- 最小ツール群で十分（open/send/read/close + send_control）。
- read は pull 型・増分（context溢れ防止）。
- 完了検出は quiescence 系が既定（プロンプト非依存）。
- SSH/docker はツール化せず send。

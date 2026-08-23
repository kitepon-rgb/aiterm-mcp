# ADR 0038: harness標準起動APIとCursor Agent CLI

- Status: Accepted
- Date: 2026-08-24
- Release: 0.28.0

## 文脈

従来の公開入口は`claude_agent`／`codex_agent`／`grok_agent`／`composer_agent`に分かれ、tool名が
「実行基盤」と「選択モデル」を同時に表していた。しかしCursor Agent CLIはCursorがagent loop・認証・
hook・session・transcriptを所有しながら、GPT／Claude／Grok等のmodelを選べる。これをvendor名だけで分類すると、
完了回収方式とmodel providerが混ざる。またComposerはGrok CLI上のmodel presetであり、独立した実行基盤ではない。

Cursor公式仕様はCLIの公式installer／`agent update`、対話TUI、`--model`、read-onlyの`--mode ask`、
plugin／hook、通常Cursor home配下のagent transcriptを提供する。
調査原本は`rag/sources/agent-launchers/cursor-agent-cli-*.md`、
`rag/sources/agent-launchers/cursor-plugins-reference-2026-08-24.md`、
`rag/sources/completion-detection/cursor-*.md`へ保存した。

この端末へ公式installerで入れたCursor Agent CLI `2026.08.11-e8db854`を実測した。launch pluginは読み込まれ、
`sessionStart`は実行される一方、対話TUI／`--print`のどちらも`stop`／`afterAgentResponse`を発火せず、完了eventは
得られなかった。通常Cursor transcriptには、aitermが初回user recordへ入れたlaunch ID、assistant text、
`turn_ended(status:"success")`が永続化される。follow-up時は直前末尾の`turn_ended`を除いて次turnを追記するため、
byte EOFは単調境界ではない。よって未接続hookを正本にせず、このvendor transcriptを直接使う。

## 決定

1. 公開の正規入口を`agent_launch({ harness, model?, reasoning_effort?, ... })`とする。`harness`は
   `claude-code`／`codex-cli`／`grok-cli`／`cursor-cli`で、agent loop・認証・hook・session・transcriptを
   所有する実行基盤を表す。`model`はharnessが選ぶ推論モデルであり別軸とする。
2. CursorでGPT／Claude／Grokを選んでも`harness:"cursor-cli"`のままとする。Grok Composerは
   `harness:"grok-cli", model:"grok-composer-2.5-fast"`とする。
3. 既存4入口は0.x移行期間のdeprecated thin aliasとして残し、共通`launchAgent`実装へ流す。
   `composer_agent`だけはGrok CLI＋Composer既定modelの互換presetである。
   起動receiptだけでなく、`pty_send`のagent dispatch receipt、`aiterm-wait`の観測receipt、
   `agent_configure`の結果、`pty_list`のagent行にも正規の`harness`を載せる。旧`vendor`／`provider`／
   `agent`は互換fieldとして残し、新規callerは一貫して`harness`を正本にする。
4. Cursor adapterは通常`HOME`／`~/.cursor`を直接共有し、user/project設定をcopy・snapshot・書換えしない。
   launch固有pluginも生成せず、通常CLI起動と同じplugin環境を使う。
5. Cursor完了はlaunch IDを含むuser recordで通常transcriptを一意にbindし、末尾の
   `turn_ended(status:"success")`を正本にする。回答回収は同じturnのassistant textを使う。
   Cursorの`event_cursor`は、follow-upで末尾eventが書き換わっても単調に残るuser turn数とする。
   公開API上の`event_cursor`はvendor別完了境界を表すopaqueな0以上の整数であり、
   `aiterm-wait`と`pty_read(agent_transcript:true)`の共通契約は変えない。
6. `write_scope:"read-only"`はCursorの公式`--mode ask`で実効化する。path単位の説明は他harnessと同じく
   declaration-onlyとする。Cursorのeffortはmodelと別に受け、起動時は`model-effort`の現行catalog IDへ
   変換して`cursor-agent models`へ照合する。起動中変更はbase modelを標準`/model`で選び、同じmodel pickerの
   parameter editorでeffortを変更する。model同時指定を必須とし、別modelへのfallbackはしない。
7. 実行ファイルは曖昧な`agent`を解決候補にせず、`CURSOR_AGENT_BIN`→`~/.local/bin/cursor-agent`→
   `PATH`上の`cursor-agent`だけを使う。導入・更新はCursor公式installerと`agent update`を正とし、
   独自tarball配布を通常経路にしない。

## 帰結

- 新しい連携はtool名の追加なしにharnessを増やせる。model catalogの増減はAPI構造を変えない。
- agentの起動・送信・待機・設定変更・一覧は同じ`harness`語彙で相関できる。旧fieldは互換用に残る。
- 各harness固有のready判定・認証・hook・transcriptは`src/vendors/`に閉じ、OS差は従来どおり
  `tmux-runtime`／`agent-resolver`が所有する。
- Cursor CLI未導入・未認証はPTY作成前に明示失敗し、別CLIや別modelへfallbackしない。

## 受入

- 15-tool MCP schema、旧alias、起動・送信・待機・設定変更・一覧の`harness`相関をfocused testで固定する。
- Cursor resolver、CLI引数、live model catalog、通常transcript bind／turn境界、model picker操作、共通入口routingをfocused testで固定する。
- 実認証後に公式CLIで明示model launch→`aiterm-wait`→同一session model/effort変更→follow-up→transcript→closeを通し、公開後もregistry由来installで再確認する。

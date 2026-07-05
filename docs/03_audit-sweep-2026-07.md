# 全域バグ狩り＆磨き込み（2026-07）— 計画＋進捗台帳

> 生きた文書。方針＋TODO＋進捗を兼ねる。作業ブランチ: `fix/full-audit-sweep`。
> 原本の策定過程は `~/.claude/plans/codex-grok-composer-typed-lecun.md`（プランモード下書き）。
> 完了したら docs/archive/ へ退避する。

## 進捗トラッカー

| Wave | 内容 | 状態 | コミット |
|---|---|---|---|
| 0 | 安全網（ベースライン green＋赤テスト先張り） | ✅ 完了 | baseline 97→ |
| 1 | 中核 High（C1 pytest 緑偽装／B1 until echo／A4 破壊ゲート誤爆） | ✅ 完了 | `3eddb52` C1 / `4fe6208` A4 / `eabdc30` B1 |
| 2 | 安全ガード＆完了検出（B2 ✅ ゲート widen／B8 mark POSIX／B4 until リテラル既定化） | ⏳ 着手中 | `55c8d96` B2 |
| 3 | エージェント起動の正しさ（A1 Windows toWslPath／A3／A5／A6＋grok/composer テスト＋実 CLI 裏取り） | ⬜ 未 | — |
| 4 | reducer 正しさ（C2/C3 stripShellFrame／C4-C7 classify/git/filters／C13） | ⬜ 未 | — |
| 5 | 堅牢性/非効率（B3 UTF-8／B5+B9 stale log／B6 poll／B7 ログ回転／B10-B14／C12） | ⬜ 未 | — |
| 6 | テスト/CI/docs（C8 フレイキー／C9 Windows CI／C10-C11 publish 順序／C-doc） | ⬜ 未 | — |

**現在のテスト数**: 111 pass / 0 fail（開始時 97）。

### ⚠️ インシデント記録（2026-07-05・復旧済み）
B2 の赤テスト先張り時、**修正をビルドする前に**新破壊ケースをルート cwd の実 tmux へ enter=true で送り、
旧 regex がすり抜けて `rm -rf ./*` が発火＝ルート直下 tracked ファイル（CLAUDE.md/README/docs/ 等）を削除。
`rm -rf ..` は cwd を消せず失敗＝他プロジェクト無傷、`.git` 無傷。git restore＋npm ci で完全復旧（111 pass）。
再発防止: 破壊ゲートテストを **サンドボックス cd ＋ enter:false** に多層防御化（`55c8d96`）。
caveat 記録（private）: `cwd-tmux-enter-true-rm-tracked`。

## Context（なぜやるか）

v0.7.0/0.7.1 で対話エージェント起動3ツール（`codex_agent`/`grok_agent`/`composer_agent`）を追加したが、
オーナーの自己申告どおり実機検証・敵対的検証が不十分。加えて全体（コア PTY/tmux・rtk reducer・CI/publish・docs）にも
不具合・不便・非効率が溜まっていた。ultracode 型の多エージェント監査（並列3視点 Find → 指摘ごとの refuter 敵対的検証）で
全域を洗い、生き残った指摘だけを独立 revert 可能な単位で潰す。

- Find: 3並列 Explore ＋統括の独立読み。Verify: 5並列 refuter → 高価値7指摘が 7 CONFIRMED / 1 REFUTED（A2）。
- スコープ裁定: ①全域一掃 ②Windows は「Windows 側 CLI 前提」で toWslPath 変換 ③重量級（B4/B7/C9）も全部込み。

## 確定指摘（CONFIRMED）と状態

| # | 重大度 | 指摘 | 状態 |
|---|---|---|---|
| C1 | High | pytest 収集エラーを `No tests collected`／`1 passed`（緑偽装）に潰す | ✅ `3eddb52` |
| B1 | High | until がコマンドエコー部分一致→mark 完了検出が早期誤完了 | ✅ `eabdc30`（実 tmux で echo 載りを実証） |
| A4 | High | 初手 prompt が破壊ゲート誤爆（force 逃げ道なし） | ✅ `4fe6208` |
| A1 | Med | Windows で bin/cwd 未 toWslPath＝起動破綻／偽成功 | ⬜ Wave 3 |
| B5 | Med | セッション再利用で古いログ復活（truncate せず） | ⬜ Wave 5 |
| B2 | Med | 破壊ゲートすり抜け（`rm -rf ./*`・引用符付き・`..`・`./`） | ✅ `55c8d96`（＋テスト多層防御化） |
| B3 | Low | UTF-8 が offset バイト境界で分断→1文字化け | ⬜ Wave 5 |

**棄却（実装しない）**: A2（相対 cwd 基準ズレ）＝tmux は client cwd を使い検証基準＝実行基準。誤モデルゆえ棄却。

## 磨き込み対象（自明な実在・Low〜Nit）

- エージェント: A3 env bin 実在検証／A5 起動後ハンドシェイク案内／A6 cwd `~`・空文字／A-test grok/composer 未テスト
- コア: B4 until リテラル既定化／B6 poll 効率／B7 ログ回転／B8 mark POSIX ガード／B9 killAll 掃除／B10 stripControl DCS/APC・`\r`／B11 full/range×lines・screen×wait footgun／B12 readFileSync 保護・offset 競合／B13 無効正規表現／B14 pipe-pane 失敗の .log 残骸・banner tmux≥3.2
- rtk: C2/C3 stripShellFrame 過剰除去／C4 classify（python3 -m pytest・uv/poetry・sudo -E）／C5 Co-Authored-By 大小／C6 FILTERS basename／C7 git log --oneline・make 切捨て・make strip 死／C13 reduce() stripControl
- テスト/CI/docs: C8 フレイキー（nested 800ms・smoke setTimeout）／C9 Windows CI／C10-C11 publish 順序／C12 line_range 検証／C-doc docs ドリフト

## 修正ウェーブ（詳細）

- **Wave 0** 安全網: ベースライン green→触る契約（reducePytest・waitCompletion/mark・openAgent・openSession・DESTRUCTIVE・stripShellFrame）に赤テスト先張り。✅
- **Wave 1** 中核 High（契約クリティカル・統括直轄）: C1／B1（実機 repro 込み）／A4。✅
- **Wave 2** 安全ガード＆完了検出（F・統括直轄）: B2（ゲート widen・golden 先張り）／B8（mark POSIX ガード）／B4（until リテラル既定化＝挙動変更・要周知）。⏳
- **Wave 3** エージェント起動の正しさ: A1（Windows 側 CLI 前提で toWslPath 変換・A3 統合）／A5／A6＋grok/composer テスト。※各 CLI 起動フラグ（`codex 'prompt'`／`-c model_reasoning_effort=`／grok `--model/--effort`）を実機で裏取り。
- **Wave 4** reducer 正しさ（委譲候補）: C2/C3／C4-C7／C13。
- **Wave 5** 堅牢性/非効率: B3／B5+B9／B6／B7／B10-B14／C12。
- **Wave 6** テスト/CI/docs（委譲候補）: C8／C9（フォールバック明示付き）／C10-C11／C-doc。

## 実装ノート・リスク

- **B1 × B4 非干渉**: B4 で user 向け until をリテラル既定化しても、B1 の mark 完了は user until を使わず内部 `MARK_DONE_RE=/<<<AITERM_DONE rc=[0-9]+>>>/` で判定。別経路。
- **A1 Windows は実 Windows 検証待ちを docs 明記**: `.cmd`/`.bat` シム・interop TUI 描画は macOS/CI で検証不能。動くフリせず未検証と明記。
- **C9 は最リスク**: GitHub runner の WSL2+tmux 不安定時はフォールバック（純関数のみ CI＋手動ゲート明文化）。
- **CLI 起動フラグ実機裏取り**: Wave 3 着手時に実 codex/grok を永続 PTS で起動確認してから確定。

## やらないこと（スコープ外）

- A2（相対 cwd 基準ズレ）は実装しない。ただし「起動未検証で偽成功」の一般欠陥は A5＋A1 で緩和。
- 破壊ゲートを完全網羅にしない（best-effort 強化・`force` 逃げ道と併記の defense-in-depth）。
- rtk reducer の全コマンド網羅はしない（C4-C7 の実在取りこぼしに絞る）。

## 検証（実装後、end-to-end）

- `npm test`（build→tmux 実機）green ＋追加回帰 green。
- エージェント起動を実 CLI で e2e（各 effort・cwd 絶対/相対・不正 bin・破壊語 prompt）。
- B1 live repro（済）／C1 fixture（済）／破壊ゲート追加パターン遮断＆正当 prompt 非遮断／CI publish 順序。

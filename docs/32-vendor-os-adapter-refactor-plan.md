# 32 — vendor / OS adapter リファクタ計画（campaign正本）

- **状態**: 計画（2026-08-23 起草）
- **レーン**: 統括（受入が多段に連鎖＋4環境CIの外部完了待ちが計画に組込済み）
- **目的**: core.ts（4,912行）に散在する vendor 固有コード（約90分岐）と OS 固有コード（約44分岐）を専用ファイルへ集約し、「共通を直しているのか、固有を直しているのか」がファイル境界で分かる構造にする。
- **変更の性質**: **外部挙動不変の純移設**。公開 tool 面（14 tools）、schema、receipt、エラーメッセージ文字列、分岐の評価順序、タイミング定数（ready gate 11回poll・cleanup settle 1秒 等）を1バイトも変えない。

## 棚卸し結果の要約（2026-08-23 実読・行番号は当時）

- vendor分岐 約90箇所: 起動コマンド組立（`buildAgentCmd` L4439）、ready gate（`isAgentTuiReady` L3599）、完了検出（`observeAgentDone` L3521 / codex rollout / grok events / claude event file）、transcript回収（`readAgentTranscript` L3093）、configure（`configureAgent` L4084）、dispatch癖、auth/preflight、model catalog検証。
- OS分岐 約44箇所: load-buffer の一時ファイル経由（L899）、paste-buffer `-r` 非対応（L921）、pipe-pane in-process sink（L766）、`settleWinLog`（L545）、attach hint（L413）、NUL device（L738）、mode bit 検証 skip（L1699/L3030）、cwd パス変換（L4756）。
- **Grok/Composer は95%超が完全共通**。差分は `GROK_MODEL_DEFAULTS` と `agentLabel` の2箇所だけ。→ adapter は3つ（claude / codex / grok系）とし、composer は grok adapter のモデル既定違いのサブタイプとする。
- 既存分離: `tmux-runtime.ts` は低レベルtmux実行のOS所有者として分離済みだが引数組立レベルのisWinがcore.tsに残存。`agent-resolver.ts` はvendor×OSが交差したまま。stop-hook 2本はvendor別に分離済み。

## 目標構造

```
src/
  core.ts            … 共通ロジックだけ（PTY基盤・出力整形・lock・lineage・完了判定コア）
  os/tmux-runtime.ts … OS固有の全所有者（現 tmux-runtime.ts を拡張。load-buffer/paste-buffer/
                       pipe-pane sink/settle/attach hint/null device/mode bit検証可否/パス変換）
  vendors/
    types.ts         … VendorAdapter インターフェース＋kind→adapter解決
    claude.ts        … auth preflight・Stop hook設定・operation/approval・result読取・configure手順
    codex.ts         … rollout transcript・config.toml pin・/model メニュー操作・sandbox
    grok.ts          … grok/composer共通（events transcript・auth解決・catalog検証・configure）
```

VendorAdapter が持つ関心事（棚卸しの (a)〜(j) に対応）: 起動引数組立、env prefix、ready/busy判定マーカー、初回prompt前ゲート、完了event読取、transcript回収、configure手順、dispatch時の予約フック、metadata生成/検証、起動応答note。

## 非目標（やらないこと）

- 挙動修正・機能追加・エラーメッセージ変更・タイミング調整は一切しない（発見した欠陥は本計画の maintenance queue へ記録だけして持ち越す）。
- stop-hook 2本の `uid()`/`runtimeStateBase()` 重複解消（別問題。queueへ記録済み）。
- `rtk.ts` / `runtime-error-*` 系は対象外（vendor/OS分岐がほぼ無い）。
- prototype/python は触らない。

## 既知の罠

1. **分岐の順序・エラー文字列が仕様**: 前提検証順（model/effort→bin→cwd）、`aiterm-wait` の prefix match（「agent_done 管理セッションではありません」）、テストが固定する文言。逐語移設し、移設後に該当 focused test で固定する。
2. **stdout 禁止**: 移設中に import 副作用で stdout へ出さない（MCP JSON-RPC 通信路）。
3. **循環 import**: core.ts ⇄ vendors/ の相互参照が発生しやすい。adapter は core の共通プリミティブに依存してよいが、core は adapter interface（types.ts）だけに依存する一方向とする。
4. **Windows は手元で実測できない**: macOS ローカルは focused/full まで、Windows native/WSL2/Linux は 4環境CI が唯一のゲート。isWin 分岐の移設 wave は CI green まで受入完了にしない。
5. **`dist/` 生成物**: bin エントリ（aiterm-mcp / aiterm-wait / aiterm-runtime-errors）の import 経路変更は package.json の files / build 出力と同期する。
6. **絡み合いホットスポット**（openAgent・send()・configureAgent・readClaudeResultText・resolveAndValidateGrokAuth）は「vendor→OS」の順で二段階に分けて移設し、1 commit で両軸を同時に動かさない。

## 工程（Phase）

- **P0 ベースライン**: `npm test` full green を macOS で確認し件数を記録。→ **完了（2026-08-23）: 346件・pass 345・fail 0・skip 1（HEAD 2d357c3）**。characterization は既存 suite（344件・4環境CI）を正とし、移設 seam に既存カバーが無い場合だけ focused test を先行追加する。
- **P1 OS層集約**: core.ts / agent-resolver.ts の isWin 分岐を `tmux-runtime.ts`（→ `os/` へ改名は最後）へ移設。wave単位: ①buffer系（load/paste）②sink/settle系③path/実行ファイル判定系。各waveは独立revert可能なcommit＋focused test。
- **P2 vendor adapter骨格**: `vendors/types.ts` の interface を定義し、純粋な vendor 専用関数（codex transcript 群・grok completion 群・claude result/auth 群）を逐語移設。core.ts は re-export で呼び出し面を維持。
- **P3 ホットスポット解体**: `buildAgentCmd`・`isAgentTuiReady`・`observeAgentDone`・`readAgentTranscript`・`configureAgent`・`openAgent`・`dispatchAgentTurn` を adapter メソッド呼び出しへ置換。1関数=1受入単位。
- **P4 最終確認**: ローカル full regression → push → 4環境CI full green。
- **P5 公開**: 挙動不変につき patch bump（0.27.7）で release 連鎖（npm provenance / GitHub Release＋MCPB / Registry / global install / 公開後smoke）。受入 ADR を起こす。

## 並列化検討の結論（委譲契約12節・campaign単位で一度）

全 wave が core.ts という単一ファイルへの書込みを含むため、同一repo並列writerは成立しない。**直列実装とし、Lattice run は新設しない**。委譲する場合も1 wave = 1 worker の直列。

## F/A/H と配置

- **F**（統括自身）: 設計裁定・interface定義・各waveの受入・commit/push・P4/P5のゲートとrelease。
- **A**: 仕様固定後の逐語移設物量。統括自身または implementer（sonnet×low〜medium）へ wave 単位で委譲可。
- **H**: なし（4環境CIは push 起動の外部完了待ちで、人手は不要）。

## 検証

- 各wave: 対象 focused test（`test/core-pure.test.mjs` / `test/core-agent.test.mjs` / `test/smoke.test.mjs` の該当部）green。
- 各Phase末: 関連 test 一括green。
- P4: `npm test` full（macOS）→ 4環境CI full。
- P5: 公開後 smoke（AGENTS.md の release 作法どおり）。

## maintenance queue

- stop-hook 2本の `uid()`/`runtimeStateBase()` が core.ts と重複実装（棚卸し 2026-08-23 検出）。挙動影響なし。本campaign対象外。

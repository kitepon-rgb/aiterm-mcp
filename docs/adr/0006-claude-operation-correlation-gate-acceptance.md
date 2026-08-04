# 0006. Claude operation相関gate受入

> 2026-08-04現行境界: 本文はoperation相関の歴史的gate evidenceとして有効。旧wait APIとmanaged環境は
> 現行仕様ではなく、非ブロックdispatchと通常環境共有はADR 0017／
> [ADR 0025](0025-shared-agent-environment-and-lineage.md)を正とする。

## Decision

2026-07-16、[ADR 0005](0005-claude-operation-correlated-recovery.md)のfixture実装をqueue 19c3の
Observer統合前transport契約として受け入れる。callerのopaqueな`operation_id`をdispatch receipt／active
marker／Claude Stop event／result／回収へ相関し、古い結果の誤帰属とprompt再送を拒否する。

この受入は実Claude model requestの成功を意味しない。初回／follow-up、timeout後の遅延Stop、`C-c`後の
Stopを実TUIで確認するlive smokeは、明示承認を要するH gateとして未完了のまま保持する。

## Gate evidence

- focused fix: managed Claudeの拒否された通常sendが`.mark`を作成・削除せず、`.lastcmd`も変更しないtestは
  1 passed、0 failed、0 skipped。
- related: build成功後、`test/codex-stop-hook.test.mjs`、`test/core-pure.test.mjs`、
  `test/core-agent.test.mjs`、`test/smoke.test.mjs`は122 passed、0 failed、0 skipped。
- full: build成功後の`test/*.test.mjs`は262 passed、0 failed、0 skipped。
- static: 最終文書同期後の`git diff --check`をcommit前に通す。

## Independent refutation

同じ独立refuterがADR 0005のacceptanceを反証し、途中で次の成立する反例を指摘した。

1. `C-c`直後にmarkerを消すと、遅延Stopを後続operationへ誤帰属できた。
2. Stop hookのmarker消費がpath再検証だけでは置換raceを許した。
3. IDなしturnとdurable operationの間で古い結果を返す／markerを上書きする経路があった。
4. cleanup、内部launcher送信、initial prompt、破壊語preflight、active中の汎用回収、通常send拒否の
   各境界にmarkerの欠落または副作用があった。

marker保持、同一inode消費、全managed turnの匿名marker、cleanup対象拡張、内部送信境界、送信前検証、
active中pending、通常sendの副作用前拒否で全て閉じた。最終再読の判定はP0／P1／P2残存なし。
同じTODOへの独立監査はここで終了する。

## Remaining H gate

実Claude CLIの認証状態、初回／follow-up各1 turn、timeout後の遅延Stop回収、`C-c`後Stopの実タイミング、
session closeは未検証である。実行時は目的・model requestの影響・closeによるrollbackを説明し、オーナーの
明示承認を得る。publish／pushは別承認とし、本ADRでは行わない。

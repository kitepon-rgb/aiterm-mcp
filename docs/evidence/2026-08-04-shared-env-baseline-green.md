# shared agent environment — baseline green

2026-08-04、production変更前のmainで`npm test`を実行し、buildと既存test suiteがexit 0で完了した。
実行環境はNode 26.5.1、npm 11.17.0、Claude Code 2.1.221、Codex CLI 0.146.0、
Grok Build 0.2.117である。

この結果は既存挙動のbaselineであり、共有環境化の成功証拠には代用しない。変更後のfull regressionと
live smokeはverification phaseで別に実行する。

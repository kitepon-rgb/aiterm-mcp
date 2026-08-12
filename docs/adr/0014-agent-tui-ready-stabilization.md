# ADR 0014: agent TUI readyを連続pollで安定化してから初回promptを送る

日付: 2026-07-16

## Status

Accepted。連続pollによるready安定化契約は現行。queue 19eの実managed Claude再検証は当時のlive H履歴。
2026-08-04以降、launcherは通常project／user環境を使い、ready gateの環境前提は
[ADR 0025](0025-shared-agent-environment-and-lineage.md)が置換する。Grok/Composerには通常sessionの
`mcp_init_completed` gateも加わる。

## Context

Observer queue 19eの実Claudeで、`Claude Code`と入力欄が一瞬描画された直後に初回promptを送ると、
transcript、Stop event、画面上のpromptがすべて0件のままready画面へ戻った。同じsessionが十分に安定した後、
公開`pty_send`でEnterなしprobeを送ると表示／消去でき、10秒連続ready後のparent promptは自然Stopまで
成立した。PTY入力、認証、hookではなく、単一screen sampleだけでreadyを確定したraceである。

## Decision

1. 初回prompt前のvendor readyは一回のregex一致で確定せず、500ms pollを11回連続で満たすまで待つ。
2. 途中で非readyへ戻ったらready streakを0へ戻す。過去の一瞬のreadyを採用しない。
3. 既存30秒timeout内に安定しなければpromptを送らず、既存の明示failure契約を維持する。
4. Claude専用sleepやcaller側retryにせず、Claude／Codex／Grok／Composer共通の初回ready gateへ適用する。
5. follow-up、既にbind済みturn、通常PTY、公開schema、Stop相関、timeout recoveryは変更しない。

2026-08-12追補: Codexの`OpenAI Codex` headerは長寿命sessionの直近capture範囲から正常に流出する。
managed kindがCodexである前提のready判定は、headerまたは常駐model／effort footerと入力欄をfrontend根拠にする。
caller側の画面再描画や再試行では補わない。

この追補は`agent_configure`の公開APIを変えない。0.24.1 tagは別のruntime store CI gateでpublish前に
停止したため、tagを動かさず0.24.2 patchへ継承する。footerだけ、入力欄だけ、busy表示はreadyへ
昇格させず、vendor識別とidle判定の積を維持する。

## Acceptance

- pure testで単発ready、ready後の再初期化、必要連続数、timeoutを固定する。
- agent初回prompt／ready gateのfocused testと関連agent gateを一度通す。
- 修理済みcandidateの実managed Claudeでrequest投入、Stop、exact resultを確認する。
- raw session ID、prompt、PTY本文、credentialはDecision証拠へ保存しない。

## Gate evidence

- pure ready gate: 21 passed、0 failed、0 skipped。
- focused agent gate: 4 passed、0 failed、0 skipped。
- related core-pure＋core-agent: 113 passed、0 failed、0 skipped。
- build、新規ADR lint、`git diff --check`: green。
- 既存plan 04／15の全体lintは今回外のMD013 baselineで赤のため、greenへ数えない。
- 実managed Claude再検証はqueue 19e live Hで行い、この実装TODOのgreenへ代入しない。

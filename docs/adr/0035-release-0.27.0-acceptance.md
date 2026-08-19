# ADR 0035: v0.27.0 公開受入（Windows native psmux移行の完成）

- 状態: 受入済み（2026-08-19）
- release commit／tag target: `307fc68`（本体は `6c87970`／`fedd6f4`／`5a9cc3f`／`f80e26a`）
- tag／package: `v0.27.0`／`aiterm-mcp@0.27.0`
- 設計・裁定の正本: ADR 0034、campaign計画正本 docs/31

## 前提（上流）

- psmux忠実度修正3件（pipe-pane直接ファイルsink・paste逐語hex wire・前面
  `#{pane_current_command}`）はquolu名義の upstream PR psmux/psmux#577 として
  2026-08-17 merge（merge commit `0fc0720`・issue #576 closed）。maintainerが
  review修正 `0509351` を上乗せ（chained sinkのclient socket継承除去・`nul:` device
  gap閉鎖・CI teardownのpid化）。すべて **psmux v3.3.8**（2026-08-18）に収録。
- この端末は公式 v3.3.8 バイナリへ更新済み（`psmux 3.3.8 (66cf613 2026-08-18)`・
  公式zip内容とsha256一致）。psmux単体で3修正を再実測（sink実バイト210B・
  開けないパスのloud failure exit 1・`NUL`拒否・paste 62→62Bバイト一致・
  idle=`pwsh`→走行中=`PING`）。

## CI証跡

- main CI [`32222606802`](https://github.com/kitepon/aiterm-mcp/actions/runs/32222606802)（4環境full）success。
- tag CI [`32222888388`](https://github.com/kitepon/aiterm-mcp/actions/runs/32222888388)（4環境full＋publish）success。
- 先行して2回のPOSIX赤があり、どちらも根治して閉じた:
  1. `32221560426`: 一括置換が`testUid`定義自身を書き換えた自己再帰（Windowsは
     else分岐で顕在化しない）→ `f80e26a`
  2. `32221927714`: 撤去済みsymlink防御のPOSIX専用テスト残存（Windowsでは
     `fs.symlinkSync`の既定type差でsymlinkが壊れcleanupがno-opになる偶然でpass）
     → `307fc68`
  どちらも「Windows単独実測の死角を4環境同時fullが捕まえた」事例として記録する。

## Public artifacts

- npm 0.27.0（Trusted Publishing／provenance）: integrity
  `sha512-q+QZwI0tmBv6DkfD9cYgsIkBdNeRjtzdLmdPF+aevno5Vl0pybEEJ8ifRelwxflMjXEcLs3IRaBtChQnKHuBeg==`。
  npm latest=0.27.0。
- [GitHub Release v0.27.0](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.27.0) へ
  `aiterm-mcp.mcpb`（SHA-256
  `21eb95c9706f0fd0c1d74499b6c279b31a1b35fde954287b8c08d6690ef95acb`）を添付。
- Registry workflow [`32223232540`](https://github.com/kitepon/aiterm-mcp/actions/runs/32223232540)
  success。Official Registryは `io.github.kitepon/aiterm-mcp` **0.27.0 active／isLatest=true**。

## 公開後smoke（Windows実機・registry由来global install）

- global install 0.27.0のinstalled distはrelease buildと9/9ファイルでバイト一致。
  bins 3種（`aiterm-mcp`／`aiterm-runtime-errors`／`aiterm-wait`）。
- 公開バイナリの実MCP境界（JSON-RPC）: initialize=0.27.0・tools/list=14・stderr 0 bytes。
- 実agent E2E（公開バイナリ・実Claude・native psmux 3.3.8）:
  `claude_agent`起動（`submit_residue:false`）→ 公開binの`aiterm-wait --cursor 0`が
  `outcome=done`／exit 0 → 別processの`pty_read(agent_transcript:true)`で
  「PUB027_OK」を逐語回収 → `pty_close`=closed → agent state残骸ゼロ。
  cross-process回収（launch／wait／回収がそれぞれ別のserver process）で通過。

## 逸脱・注意の記録

- winget manifestは本日時点で3.3.7のまま（v3.3.8のwinget-pkgs PR未着地）。この端末の
  psmuxは公式GitHub Release資産の手動配置で、wingetが3.3.8を拾えば同一公式ビルドで
  上書きされ管理が正常化する。
- grok/composerの実席E2Eは本releaseでは実施していない（0.26.0のADR 0033で実測済み・
  本版のgrok-stop-hook修理はfocused regressionで固定）。

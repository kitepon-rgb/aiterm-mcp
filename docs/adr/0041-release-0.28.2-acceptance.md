# ADR 0041: release 0.28.2（harness用語統一）の公開受入

- Status: Accepted
- Date: 2026-08-24
- Release: 0.28.2

## 文脈

オーナー裁定により、AI実行基盤の分類語を「vendor」でなく「harness」へ全面統一するcampaign
（dotagents `docs/plan_harness-terminology-refactor-20260824.md`）が発足した。aitermは
ADR 0036でvendor/OS分離、ADR 0038でharness APIを先行導入済みで、残るのは内部の旧語だった。

## 決定

1. `src/vendors/`を`src/harnesses/`へ改名し、内部識別子（`harnessLauncherDiagnostic`・
   `bindAgentHarnessSession`・`recoverAgentHarnessSession`・`harnessSessionId`等）と
   コメント・現役文書（README英日・CONTRIBUTING・AGENTS・docs index・design plan）の
   分類語をharnessへ置換した。挙動・15-tool API・schema・エラーメッセージは不変。
2. 公開wire契約は互換のため据え置く: receipt／event fileの`vendor`・`vendor_session_id`
   field、diagnostics `aiterm-mcp.factory-diagnostics.v1`の`vendor_dependencies`、
   runtime error code `AITERM.VENDOR_LAUNCHER_FAILED`（component `vendor-launcher`）。
   正本fieldは0.28.0以降どおり`harness`。
3. `package.json`の`files`とMCPB stagingは`dist/harnesses/*.js`へ追従し、
   release-metadata testの同梱固定も同時に更新した。
4. 歴史文書（docs/archive・過去ADR・CHANGELOG過去項・PROMOTION引用・評価証跡）は
   当時の証跡として書き換えない。

## 受入証跡

- macOS full test 355 pass / 0 fail（ベースライン346件と同一suite構成）。
- release commit `b06e1a1`、main CI（4環境）`32672609610` success、
  tag CI／npm publish `32672803173` success、Registry workflow `32673122066` success。
- npm latest 0.28.2、global install後のMCP initialize smokeで serverInfo 0.28.2・stderr 0。
- MCPBはstaged serverのinitialize smoke（0.28.2）と`dist/harnesses/` 4ファイル同梱を確認して
  GitHub Release v0.28.2へ添付した。

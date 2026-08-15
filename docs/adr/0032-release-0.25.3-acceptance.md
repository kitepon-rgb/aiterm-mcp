# ADR 0032: v0.25.3 Windows Grok経路修復の公開受入

- Status: Accepted
- Date: 2026-08-15

## Release identity

- release commit／tag target: `472206c`（fix本体は `80c5492`・`638cc9d`）
- tag／package: `v0.25.3`／`aiterm-mcp@0.25.3`
- canonical repository: `kitepon/aiterm-mcp`
- prior public acceptance: [ADR 0031](0031-release-0.25.2-acceptance.md)

## 修正内容

Windows hostでgrok_agent／composer_agentが二段構えで起動不能だった。

1. `resolveAndValidateGrokAuth`のPOSIX mode bit検証（file 0o077・祖先directory 0o022）が、
   POSIX permission bitを持たないWindowsのNode `fs.Stats`（file 666・directory 777相当）で
   構造的に常時失敗していた。`currentUid`（a6295ab）と同じ既知制約の明示的受容として
   Windowsではmode bit由来の2判定だけを除外する。isFile・nlink・owner・size・O_NOFOLLOW・
   realpath・祖先symlink検証は全platform共通のまま維持。
2. 検証通過後も、WSL内bashで走る起動コマンドへ`GROK_AUTH_PATH`をWindowsドライブ形式のまま
   渡していたため、WSL側grokが認証正本を開けず接続段階で無応答停止していた。bin／cwdと同じ
   `toWslPath`変換を適用する。

## Acceptance evidence

### Test and package gates

- Windows nativeのlocal fullは348 tests・pass 199・fail 0・skipped 149（WSL bridge実機境界の
  既定skip）。
- main CI（[`31858048647`](https://github.com/kitepon/aiterm-mcp/actions/runs/31858048647)・
  [`31859386871`](https://github.com/kitepon/aiterm-mcp/actions/runs/31859386871)・
  [`31862736486`](https://github.com/kitepon/aiterm-mcp/actions/runs/31862736486)）と
  tag CI [`31862812996`](https://github.com/kitepon/aiterm-mcp/actions/runs/31862812996)がsuccess。
- npm packは13 files。`mcpb:build`のvalidate／packはgreen（2263 files、3,485,677 bytes）。

### Public artifacts

- npm 0.25.3のintegrityは
  `sha512-+3M1hdCVOGIzK9q2cwD84t/fz3lybHaToaADxflRfIHhnkJjQfyxaemyHg8CEzjb2I4p6X43uY0+sIJNTKSEwQ==`、
  shasumは`4a5ad84251312b2353fb1669c3db19417f8694c6`。
- [GitHub Release](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.25.3)へ
  `aiterm-mcp.mcpb`（SHA-256 `e1ba53191722f7df3a062c1914558ec44236949619c224491df931498e2a002b`）を添付。
- Registry run [`31863163723`](https://github.com/kitepon/aiterm-mcp/actions/runs/31863163723)はsuccess。

### Runtime smoke（Windows実機）

- 修正前: grok_agent起動が「Grok 認証正本の安全検証に失敗しました」で即時失敗（0.25.2）。
- 修正後: grok_agentでGrok 4.6×high・read-only sandboxのrefuterを起動し、OpenLogicool計画書の
  敵対的レビュー1件を完走（実タスク受入）。registry由来の0.25.3 global installで`aiterm-wait`が
  認証エラーなしにwait receiptを返すことを確認。

## 逸脱の記録

npm publishはtag CIのTrusted Publishingでなく、修正の緊急配備（agents-updateが未修正0.25.2で
fixed installを上書きし続ける状態の停止）のためlocalから先行実行した。tag CIのpublish stepは
idempotent設計（既存versionをskip）であり、tag CI・Release・Registryは事後に正規手順で通した。

## 既知の残課題（本releaseに含まない）

- Windows（WSLブリッジ）でのGrok transcript／completion回収はWSL側`~/.grok/sessions/`を
  見る必要があり未対応（`pty_read(agent_transcript:true)`が「transcriptがまだありません」を返す）。
- read-only sandboxのsubagentがMCPツール許可プロンプトで無人停止する（`--always-approve`の
  条件付き付与を検討）。

## Decision

v0.25.3を公開受入する。WindowsのPOSIX permission bit不在は仕様であり、mode bit検証の除外は
検証の弱体化でなく非実在検証の削除である。auth正本のpath swap防御（O_NOFOLLOW・realpath・
祖先symlink）は全platformで維持する。

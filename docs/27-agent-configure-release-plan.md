# agent_configure / v0.24.x release plan

## Goal

起動中のCodex／Claude agent sessionを再起動せず、vendor標準操作でmodel／reasoning effortだけ変更できる
`agent_configure`を、14番目のMCP toolとしてnpmへ公開し、この端末のglobal installへ反映する。

## Scope

- `agent_configure(session_id, model?, reasoning_effort?)`をCodex／Claude sessionだけに提供する。
- PTY、vendor session、会話contextを維持する。
- 日英README、正典、設計、contributor guide、CHANGELOG、公開案内、package／server／MCPB manifestを
  v0.24.0／14 toolsへ同期する。
- mainへpushしたrelease commitだけをtagし、既存GitHub ActionsのTrusted Publishingでnpmへ公開する。
- npm由来のglobal installと公開package smokeで閉じる。

## Non-goals

- Grok／Composerへの設定変更対応は追加しない。
- vendor標準UI／command以外の設定書換え、再起動、独自状態、fallback、安全装置は追加しない。
- 過去releaseのADR、archive、RAGに残る当時のversion／tool countは改稿しない。
- Official MCP Registry、Smithery、mcp.so等の外部directory更新は今回の依頼に含めない。

## Known traps

- Claudeの`/model`／`/effort`は新規sessionの既定値も保存するため、live smoke後はSonnet lowへ戻す。
- Fableはrate limit中のためlive smokeに使わない。
- npm publish対象commitは`origin/main`の祖先でなければならない。
- `package.json`、lock、`server.json`、MCPB manifestのversionを一致させる。

## Acceptance

1. build、focused test、full regression、`npm pack --dry-run`がgreen。
2. MCP `tools/list`が14 toolsと`agent_configure` schemaを返す。
3. Codex実TUIで同一sessionのLuna low→Terra high、Claude実TUIで
   Sonnet low→Opus high→Sonnet lowが確認できる。
4. release commitをmainへpushし、`v0.24.0` tag CIのnpm publishが成功する。
5. npm registryのlatestが0.24.0になり、global installと公開package smokeが成功する。

## Rollback

公開済みnpm versionは削除・上書きしない。欠陥時は`agent_configure`の実装・登録・文書を同じ単位でrevertし、
修正版を新しいpatch versionとして公開する。

## v0.24.0 Result

- release commit: `764e83857c8c63416ca9da5311b73cac9364e490`（`origin/main`へpush・祖先確認済み）
- local gates: focused 3/3、full regression 337/337、MCPB validate／pack、npm pack dry-run、
  changed-doc link、JSON、diff hygieneがgreen
- live gates: Codex 0.147.0 Luna low→Terra high、Claude Code 2.1.228
  Sonnet low→Opus high→Sonnet low。どちらも同一Aiterm session。Fable未使用
- CI: main `31587209848`、tag／Trusted Publishing `31587248091` success
- npm: `aiterm-mcp@0.24.0` latest。integrity
  `sha512-nXkw9g+1ctHikMPryoonKA3Mh1+ZyXteQuRqA4rzQ930bYv3oCf1x9iTWWhiTO/TYuDOhwXd6iXPl9M6ro8M6g==`
- install: global 0.24.0、3 bins、公開MCP version 0.24.0、14 tools、`agent_configure` schema、
  stderr 0、installed `dist/*.js`とrelease commitのlocal distが全バイト一致

## v0.24.1 root-cause patch

### Cause and decision

`agent_configure`のCodex idle gateは、直近45行の`capture-pane`に起動時の`OpenAI Codex` headerが
残っていることを必須にしていた。長寿命sessionではheaderが正常に画面外へ流れる一方、model／effort footerと
入力欄は常駐するため、実際にはidleな実席をreadyでないと誤判定した。

Codexのfrontend根拠を「起動時header、または常駐model／effort footer」とし、入力欄との積でreadyを確定する。
caller側の再描画、再試行、agent再起動、独自状態は追加しない。Decisionは
[ADR 0014](adr/0014-agent-tui-ready-stabilization.md)へ追補した。

### Acceptance

1. headerが画面外へ流れた長寿命Codexのready／idle readyをpure testで固定する。
2. promptだけ、footerだけ、busy表示はready／idle readyへ昇格しない。
3. focused test、full regression、MCPB validate／pack、npm pack dry-runをgreenにする。
4. `v0.24.1`を`origin/main`の祖先からTrusted Publishingし、GitHub ReleaseとOfficial MCP Registryを閉じる。
5. registry由来のglobal installでversion、3 bins、14 tools、`agent_configure` schema、stderr 0、
   installed distとrelease commitの一致、長寿命Codex ready修正の同梱を確認する。

### Local gate result

- focused: 43/43。長寿命Codex ready負経路、14-tool MCP schema、release gateを含む。
- full regression: 338/338。
- npm pack dry-run: 13 files、122,989 bytes、unpacked 417,551 bytes。
- MCPB: validate／pack success、3,481,838 bytes、SHA-256
  `e950a23e8957692431c194fca114c5b566c480cd1041be8ebe01729f85a538c8`。
- staged MCP: version 0.24.1、14 tools、`aiterm.agent-configure-result.v1` schema、stderr 0。
- changed-doc links 10 files missing 0、manifest JSON、`git diff --check`がgreen。

### Rollback

公開済み0.24.1は削除・上書きしない。欠陥時は原因修正を新しいpatch versionとして公開する。

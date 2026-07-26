# aiterm-mcp MCPディレクトリ露出調査（2026-07-26）

- 取得日: 2026-07-26
- 確度: 高（各サービスの実画面・公式ドキュメント・公開検索を確認）
- 対象: Glama / mcp.so / Smithery、READMEのMCPクライアント設定

## 結論

### mcp.so

- aiterm-mcpはすでに掲載されているため、重複登録しない。
- 既存カードは6 tools・4-layer completionと表示され、現行の13 tools・現行READMEと不一致。
- GitHub認証後に既存掲載をClaimできた。編集フォームは送信後の再読込で旧内容へ戻るため、
  2026-07-26時点では更新未完了。
- 登録フォームの必須項目はRepository URL。Nameは任意。
- 無料枠はqueued review・random placement・nofollow。有料枠は実画面上で即時掲載・verified・featured・dofollow。
- 次の操作は新規submitではなく、既存掲載の更新またはrefresh。

一次資料: [[mcp-so-submit-server]]

### Glama

- ディレクトリ検索で公式掲載を確認できなかったため、Add Serverから新規申請した。
- GitHub OAuthと初回プロフィール作成を完了した。
- 実画面のServer申請で必須だったのは、Name、1–2文のDescription、公開GitHub Repository URLの3項目。
  `server.json`は要求されなかった。
- `aiterm-mcp`、Claude Code × Codex CLIを先頭にした説明、
  `https://github.com/kitepon-rgb/aiterm-mcp`を送信し、公開前review待ちになった。
- 現行methodologyでは、GitHub OAuthでリポジトリのwrite/admin accessを確認し、clone・build・run・scanを行う。
- 推定Dockerfile等のbuildに失敗すると、ページが存在しても検索から除外される場合がある。
- リポジトリの`glama.json`はmaintainer claim用の現行例と整合する。

一次資料: [[glama-mcp-methodology]]

### Smithery

- 現行の公開経路は、公開HTTPS Streamable HTTP endpoint、またはローカルstdioサーバー向けのprebuilt `.mcpb`。
- GitHub repositoryと`server.json`だけでstdioサーバーを直接公開する旧手順は使えない。
- aiterm-mcpはローカルstdio packageで、MCPBパッケージング、install smoke、認証済みpublishが必要。
- 本調査を受け、manifest v0.3と再現可能なbuildを追加した。`mcpb validate`、archive整合、
  bundle内serverのinitialize・tools/list（v0.20.0 / 13 tools）まで通過した。
- CLI OAuthは完了し、namespace `kitepon`でserver shellを作成できた。
- Smithery CLI 1.2.0は、MCPB仕様上の`tools`要素（name/description）をSmithery APIの
  server cardへそのまま転送し、API側が要求する`inputSchema`を欠くため400になった。
  `tools`を省くと`No values to set`で400になった。
- 正式なMCPBを変更せず、実際のrunning serverから取得した13ツールの完全なMCP schemaを
  公式multipart release APIのpayloadへ添付して公開した。
- release `d392fd46-32e4-4cb8-849d-ad6f391f05a7`は`SUCCESS`、
  公開ページは`https://smithery.ai/servers/kitepon/aiterm-mcp`、
  MCP URLは`https://aiterm-mcp--kitepon.run.tools`。
- metadata APIでdisplay name、差別化説明、repository、MIT、icon、公開状態を設定し、
  公開ページは13 tools・84/100を表示した。
- `backlinkUrl`は`homepage`と同じdomainでなければ400になる。X帰属URLを入れる欄ではないため省略した。

一次資料: [[smithery-publish-server]] / [[smithery-cli]] /
[[mcpb-manifest-specification]] / [[mcpb-readme]] / [[claude-build-mcpb]] /
[[smithery-publish-server-api]] / [[smithery-update-server-api]]

## README設定の根拠

- Claude Code: `mcpServers`内にstdioコマンドと引数を定義する`.mcp.json`、または`claude mcp add`。
- Claude Desktop: `claude_desktop_config.json`の`mcpServers`へcommand/argsを定義。
- Cursor: projectは`.cursor/mcp.json`、globalは`~/.cursor/mcp.json`。stdio serverはcommand/argsで定義。
- Codex: `$imagegen`はCodexのimage generation skillを明示的に呼ぶ入口。

一次資料: [[claude-code-mcp-configuration]] / [[claude-desktop-local-mcp-server]] / [[codex-imagegen-skill]]

Cursor公式ページは実画面と検索キャッシュで内容を確認したが、JavaScript描画ページをMarkItDownが本文0文字として返したため、raw取り込みは失敗した。READMEの設定値は公式ページ上のJSON例とconfiguration location表示を根拠にした。

## ダウンロード数の読み方

2026-07-26時点の指定実測値は、週間1,869・月間4,008 DL。日別rangeではリリース日付近に大きなスパイクがあり、`npx`再取得や既存利用者の更新が相当量含まれる可能性が高い。したがってDL数をユニークユーザー数として扱わない。

この観測は「ダウンロード需要がない」ことを意味しない。ただし、ダウンロード数だけから新規利用者数を推定することもしない。

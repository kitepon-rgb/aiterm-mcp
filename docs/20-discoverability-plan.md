# aiterm-mcp 露出改善計画

## 目的

`aiterm-mcp` の価値・導入方法・作者への帰属を、GitHub・npm・MCPディレクトリから第三者が追跡できる公開証拠にする。

## 成功条件

- [x] `README.md` の1行目で、Claude CodeからCodex CLIの対話機能を操作できる差別化点が分かる。
- [x] README上部にnpm版・週間ダウンロードのバッジと、`npx -y aiterm-mcp` を使う導入手順がある。
- [x] Claude Code・Claude Desktop・Cursor向けの設定JSONが明示され、JSONとして妥当である。
- [x] 公開仕様に関する記述が、現行ソース・`package.json`・`server.json` と一致する。
- [x] GitHub Topicsに `mcp` / `model-context-protocol` / `tmux` / `claude-code` / `codex-cli` が揃う。
- [x] Glama・mcp.so・Smitheryの現行登録要件と、実際の掲載／登録状態が記録される。
- [ ] 実行可能な登録・更新は完了し、ログイン・審査・追加成果物が必要なものは停止位置と必要条件が明示される。

## 作業区分

- **F（親が裁定）**: README冒頭の訴求、作者帰属、公開仕様、ディレクトリ要件、外部掲載内容。
- **A（機械作業）**: Markdown編集、JSON検証、リンク・バッジ確認。
- **H（外部変更）**: GitHub Topics変更、Glama／mcp.so／Smitheryでの送信・更新。実行直前に目的・影響・戻し方を告知する。

## 非目標

- ダウンロード数をユニークユーザー数として扱わない。
- 実測されていない競合比較値や内部仕様をREADMEへ追加しない。
- 既存のSVGヒーローや製品ロゴを作り直さない。
- 今回の露出改善と無関係な本体実装・リリース・タグ操作を行わない。

## 既知の制約

- mcp.soは既存掲載の更新が対象で、重複登録しない。
- Glamaの最終送信にはGitHub OAuthが必要になる可能性がある。
- Smitheryの現行仕様では、ローカルstdioサーバーは`.mcpb`バンドルが必要で、`server.json`だけでは登録できない。
- 並行セッションの変更を巻き込まないよう、各編集・外部変更の直前に`git status`と対象差分を確認する。

## 検証

- README内の設定JSONを抽出して`jq`で検証する。
- READMEの1行目、バッジ、導入コマンド、3クライアントの節を検索で確認する。
- `package.json`・`server.json`・READMEの公開バージョン／ツール数を突き合わせる。
- GitHub APIと各ディレクトリの公開ページで反映状態を再確認する。

## 2026-07-26 外部公開の現在地

- GitHub Topicsは指定5件が揃い、READMEとMCPBの作者帰属は
  `Quo / クオ`・`kitepon.dev`・`@QLyun35332`へ統一して`main`へpush済み。
- GitHub公開プロフィールは、CompanyとBioに`kitepon.dev`、Websiteに公開中の
  `https://blog.kitepon.dev`、Social accountにXを設定済み。
- mcp.soの既存掲載はGitHubアカウントでClaim済み。編集フォームは送信できるが、
  再読込すると全変更が旧内容へ戻るため、更新は未完了。重複登録はしない。
- GlamaはGitHub OAuthの認可画面まで到達。GitHub側のAuthorizeが無効状態のため、
  手動認証の完了待ち。
- SmitheryはMCPBを生成・検証済み。CLIのOAuth loginを起動し、GitHub側の
  Authorizeが無効状態のため、手動認証の完了待ち。認証後に
  `dist/aiterm-mcp.mcpb`を`kitepon/aiterm-mcp`としてpublishする。

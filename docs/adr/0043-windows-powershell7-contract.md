# ADR 0043: Windows shellをPowerShell 7へ統一する

## 決定

- Native Windowsの公開`pty_open`既定shellはPowerShell 7（`pwsh.exe`）だけとする。
- `powershell`／`powershell.exe`指定も、検出実体自身が`PSEdition=Core`かつmajor 7以上であることを
  確認した同じ絶対pathへ正規化する。5.1／PowerShell 6／`cmd.exe` fallbackは持たない。
- psmuxはAiterm所有のterminal/session multiplexer backendであってshellではない。
- Git Bashはharness launcherが明示する内部shellに限定する。他製品はpsmuxへ直接依存せず、
  永続端末をAiterm公開APIから利用する。
- DACL・process identity・Throughline shimも同じWindows PowerShell resolverを使う。

## 原因と境界

従来は`resolveWinPaneShell("powershell")`とWindows OS helperがbare`powershell.exe`をそのまま起動し、
PowerShell 7導入済みhostでも5.1へ流れていた。shell選択とDACL/process観測はOS依存なので、
`src/windows-powershell.ts`／`runtime-error-os.ts`／`agent-resolver.ts`だけが所有する。psmux制御は
従来どおり`tmux-runtime.ts`、harness起動は`harnesses/`、共通PTY状態機は`core.ts`のまま変えない。

## 受入

- PS6／Desktop edition／不在をtyped拒否し、公式WinGet入口を案内する。
- Windows実psmux paneで日本語・`rg --version`・mark成功／失敗rcを確認する。
- current SID only DACL、owner、FullControl、継承遮断、runtime storeのatomic/readbackを確認する。
- 4環境full CI、release commit祖先gate、npm／GitHub Release＋MCPB／Official Registry／global install、
  公開MCPの既定shell smokeを通してから公開完了とする。

# ADR 0033: v0.26.0 Windows native Grok確定の公開受入

- Status: Accepted
- Date: 2026-08-15

## Release identity

- release commit／tag target: `bfb6887`（本体は `b13804c`）
- tag／package: `v0.26.0`／`aiterm-mcp@0.26.0`
- canonical repository: `kitepon/aiterm-mcp`
- prior public acceptance: [ADR 0032](0032-release-0.25.3-acceptance.md)

## 変更内容

オーナー裁定（2026-08-15）「WindowsネイティブはWindowsネイティブで完結させ、WSL2へ持ち込まない」
に従い、Windows hostのgrok/composer起動契約を確定した。

1. **native強制**: Windowsのgrok_agent／composer_agentはWindows nativeの`grok.exe`だけを起動する。
   WSL側grokを起動するとvendor実体がWSL processになり、session記録（events/chat_history）が
   WSL home側へ分裂して`agent_transcript`／`aiterm-wait`完了帰属が回収不能だった
   （実被弾: 2026-08-15 olc-plan-review-grok2。この端末のUser `GROK_BIN`がWSL側binaryを
   指していたことが分裂の起点）。非native解決先はsession作成前に明示エラー、Windowsの既定候補へ
   `~/.grok/bin/grok.exe`を追加、0.25.3の`GROK_AUTH_PATH`の`/mnt/c`変換（WSL grok前提）は撤回。
2. **interop anchor**: paneが継承した`WSL_INTEROP`は起動元WSL sessionの死とともに無効になり、
   pane内からのWindows `.exe`起動（binfmt interop）は`UtilAcceptVsock accept4=110`で失敗する。
   生きたsession leaderのsocketを指せば同じpaneで成功する（どちらも実測・WSL 2.6.1）。
   aitermが長寿命anchor（sleepする`wsl.exe` process）を1本所有し、生存確認のうえsocketを
   起動envへ供給する。WSL側envはinterop先のWindows processへ既定では渡らないため（実測）、
   注入envは`WSLENV`（`/w`）で明示搬送する。罠はcaveat DBへpublic記録済み。
3. **state掃除の根治**: `existingAgentsDir()`が`process.getuid`不在のWindowsで常に`null`を返し、
   close／killAll／同名再起動のagent state掃除がno-opだった（「agent metadata が複数あります」で
   同名再起動が失敗する実害を受入中に確認）。`currentUid()`の既知制約受容（uid 0）へ揃えた。
4. **既定model**: grok既定をdotagents規範（`docs/02_models.md` xAI旗艦）どおり`grok-4.6`へ更新
   （実catalogの現行defaultと一致）。ready判定・submit残存観測はnative描画の`>`も受ける。
5. **正本入替**: プロジェクト正本を`AGENTS.md`へ移し、`CLAUDE.md`は`@AGENTS.md` importにした。

## Acceptance evidence

### Test and package gates

- Windows nativeのlocal fullは351 tests・pass 197・fail 0・skipped 154（POSIX専用fixtureの
  既定skip。fake grok binによる起動組立5件はnative強制により設計どおりWindowsでskipし、
  POSIX 3環境が同じ検証を担う。Windows専用に非native GROK_BIN拒否の回帰を追加）。
- main CI [`31865853821`](https://github.com/kitepon/aiterm-mcp/actions/runs/31865853821)（4環境）と
  tag CI [`31866094569`](https://github.com/kitepon/aiterm-mcp/actions/runs/31866094569)がsuccess。
  初回main CI `31865578885`はPOSIX 3環境で既定model回帰のescaped regex 1件が失敗し、
  WSL2でfocused検証した`bfb6887`で解消した。

### Public artifacts

- npm 0.26.0（Trusted Publishing／provenance）のintegrityは
  `sha512-vE63VAknvfDYfBVmh97TmGdfabpSGkhEsIeaArN9NGG/suGrtPuKp/GGiWQLhqjBWGw/A03PWPz9nrPAkDppHg==`。
  npm latest=0.26.0。
- [GitHub Release](https://github.com/kitepon/aiterm-mcp/releases/tag/v0.26.0)へ`aiterm-mcp.mcpb`
  （SHA-256 `ad3df14725a78a45f57af5e9b579bf41bf5d784ae9a65eae9a51b5fd30026768`）を添付。
- Registry run [`31866094348`](https://github.com/kitepon/aiterm-mcp/actions/runs/31866094348)は
  初回がRegistry JWTの失効（npm反映待ち中のtoken expiry）で401になり、再実行でsuccess。
  Official Registryは`io.github.kitepon/aiterm-mcp` 0.26.0 active/latest。

### Runtime smoke（Windows実機）

- 開発版受入: 実MCP境界（`node dist/index.js` JSON-RPC）でgrok_agent起動（既定model=grok-4.6・
  native grok.exe 1.0.4）→`aiterm-wait --cursor 0`がoutcome=done（turn_id相関一致）→
  `pty_read(agent_transcript:true)`で応答回収→close→agent state掃除まで2回全通し。
- 公開後smoke: registry由来のglobal install 0.26.0（installed distはlocal distと9/9バイト一致・
  3 bins）で同じ実席smokeを全通し。server stderr混入なし。
- session記録はWindows側`~/.grok/sessions/<encoded Windows cwd>/<session-id>/`に生成され、
  既存の読取経路と一致することを実測（`mcp_init_completed`／`turn_ended`イベント含む）。

## 逸脱の記録

- Registry workflowの初回失敗はworkflow側のJWT取得と実publishの間の失効によるもので、
  再実行だけで解消した。コード・手順の変更はしていない（再発時はworkflow内でloginを
  publish直前へ寄せる改修を検討する）。

## 既知の残課題（本releaseに含まない）

- claude_agent／codex_agentのWindows native起動は同じinterop問題の潜在対象。codexは`.exe`解決
  なのでanchor注入が自動で効くが実席未検証、claudeは`where`が`.cmd`を先に拾う解決順の課題が別途ある。
- cwd未指定launchのWindowsでのsession directory導出は従来どおりserver processのcwdに依存する。

## Decision

v0.26.0を公開受入する。Windows hostのvendor状態はWindows側で完結し、WSLはtmux transportと
interop anchorだけの役とする。この境界はdesign-plan §9-9とAGENTS.mdを正とする。

# shared agent environment target contract — red gate

2026-08-04に、production変更前の`dist/core.js`へ次を実行した。

```text
npm run build
node --test --test-name-pattern='target contract' test/core-agent.test.mjs
```

結果は4件実行、0 pass、4 failだった。失敗点は次の目標契約に一致する。

- Codexが通常`CODEX_HOME`でなくlaunch固有managed homeを使っていた。
- Claudeが通常3 scope共有でなくisolated settingsとuser MCP snapshotを使っていた。
- Grok／Composerが通常`HOME`／`GROK_HOME`でなくfake／managed homeを使っていた。
- sub-agent role、親session、depth、lineage、再委譲許可metadataが存在しなかった。

したがって追加testは現行挙動の追認でなく、ADR 0025のtarget contractを失敗先行で固定している。

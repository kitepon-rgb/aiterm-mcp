# Shared agent environment verification evidence

対象release: `aiterm-mcp@0.22.0`

## Related / full regression

- target contract: Claude、Codex、Grok/Composer、nested lineageの4/4 pass。
- Grok共有MCP ready gate: 画面入力欄が見えても`mcp_init_completed`前は送信しないfocused test pass。
- public MCP/version: `test/smoke.test.mjs`と`test/release-metadata.test.mjs`の5/5 pass。
- 最初のfull regressionは、公開エラー文言を`managed Claude`から`aiterm相関付きClaude`へ訂正したのに
  旧文字列を期待した1件だけfail。挙動は意図どおり送信拒否していた。期待値を同期し個別1/1 pass。
- 最終`npm test`: 329/329 pass、fail 0、duration 91.591s。

## 4 vendor live smoke

再現入口: `node scripts/live-shared-agent-smoke.mjs <vendor>`

- Claude: `outcome=done`; `AITERM_SMOKE vendor=claude role=subagent parent=host-root depth=1 delegation=true lineage=host-root>claude:shared_claude_mse6glr0`
- Codex: `outcome=done`; `AITERM_SMOKE vendor=codex role=subagent parent=host-root depth=1 delegation=true lineage=host-root>codex:shared_codex_mse6oacx`
- Grok: `outcome=done`; `AITERM_SMOKE vendor=grok role=subagent parent=host-root depth=1 delegation=true lineage=host-root>grok:shared_grok_mse746ob`
- Composer: `outcome=done`; `AITERM_SMOKE vendor=composer role=subagent parent=host-root depth=1 delegation=true lineage=host-root>composer:shared_composer_mse74nqe`

Codexは共有された通常hook review UIを表示した。恒久trustを付けず`Continue without trusting`を選び、
環境共有がpermission/trust境界を自動迂回しないことを確認した。

## Nested delegation live smoke

再現入口: `node scripts/live-nested-agent-smoke.mjs`

Claude子がaitermの`claude_agent`を1回だけ呼び、孫から次を回収した。

`AITERM_NESTED role=subagent parent=nested_parent_mse766dl depth=2 delegation=true lineage=host-root>claude:nested_parent_mse766dl>claude:nested_grandchild_mse766dl`

親の孫起動時には通常Claude permission UIが表示され、恒久許可でなく単発Yesだけを相関付きで承認した。
親子sessionはsmoke終了後にmetadata/tmuxとも残骸0件。

## Adversarial refutation

1. **旧隔離が隠れfallbackとして残る**: production sourceからmanaged home生成、fake `HOME`、config/MCP
   snapshot、`CODEX_HOME`/`GROK_HOME`置換を削除済み。残る旧suffix cleanupは過去版のaiterm所有残骸だけを
   除く移行衛生で、新規launch/loadには使わない。
2. **共有homeで別sessionの完了を誤帰属する**: Claudeはlaunch event、Codexはlaunch markerを含むroot
   rollout、Grok/Composerは既知UUID session directoryへ束縛する。別launch/vendor/session、古いevent、
   後発sub-agent rollout、partial/malformed/oversized JSONLの負系をfull regressionで通過。
3. **cleanupが通常認証・設定・historyを消す**: target contractとcleanup回帰は通常homeのfile snapshotを
   前後比較し、aiterm所有stateだけが消えることを固定。live smoke後も通常vendor homeは継続利用できた。
4. **子がrootを自称して同型委譲を反射する**: 4vendorのdepth 1と孫のdepth 2が`role=subagent`とlineageを
   実回答。instructionは任務全体の反射的丸投げだけを禁じ、`delegation_allowed=true`と追加委譲可を明記。
5. **環境共有がpermission/trustを黙って緩める**: Codex hook reviewとClaude MCP tool approvalが通常どおり
   可視化され、永続trustを自動付与しなかった。
6. **共有MCP初期化中のGrokへ早送信する**: 初回live smokeで実際にprompt消失を再現。画面推定だけでなく
   vendor-native `mcp_init_completed`をgateに加え、focused regressionとGrok/Composer再smokeでdoneを確認。

結論: 4 launcherは通常project/user環境を共有しながら、aiterm固有の完了相関とlineageだけをlaunch単位で
保持する。再委譲能力とsub-agent自己認識は両立し、permission/trustはvendor通常境界のまま残る。

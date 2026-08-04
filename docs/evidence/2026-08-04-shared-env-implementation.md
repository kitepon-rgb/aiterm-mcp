# Shared agent environment implementation evidence

- 実装commit: `6552bc7`
- 対象: `src/core.ts`, `test/core-agent.test.mjs`
- Claude: `user,project,local` settingsを維持し、aiterm所有のStop hook設定と既知vendor session、sub-agent instructionだけを追加。
- Codex: 通常`CODEX_HOME`を直接共有し、起動単位の`developer_instructions`、model/effort引数、transcript相関だけを追加。
- Grok/Composer: 通常`HOME`/`GROK_HOME`を共有し、既知`--session-id`、`--rules`、通常transcript相関だけを追加。
- lineage: 全vendorへ`role=subagent`、親session、depth、lineage、`delegation_allowed=true`を環境変数とinstructionで渡す。既にsub-agent環境ならdepthを1段進める。
- 旧managed home作成関数は起動経路から除去。旧metadataの読取りは、更新前に起動済みのsessionを回収するための互換処理だけに限定。

検証:

- `npm run build`: pass
- target contract: 4/4 pass
- Codex agent_done focused: 6/6 pass
- Claude/Grok/Composer agent_done focused: 修正後のprovider別テスト pass
- `test/core-agent.test.mjs`: 103件中、共有契約移行後102件pass。残る旧Claude fixture 1件を既知UUIDへ修正し、その個別testがpass。
- `git diff --check`: pass

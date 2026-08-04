# エージェント共同作業環境の完全共有計画

> **Status: Completed — 2026-08-04 / v0.22.0.** Lattice plan `shared-agent-environment`は全Phase受入済み。
> 実装後の現行Decisionは[ADR 0025](adr/0025-shared-agent-environment-and-lineage.md)、公開・install・live smokeは
> [ADR 0026](adr/0026-release-0.22.0-acceptance.md)を正とする。以下の「現状と問題」は着手時点の履歴。

## 目的

`claude_agent`／`codex_agent`／`grok_agent`／`composer_agent`を、隔離された実行環境ではなく、
利用者が同じproject directoryで各vendor CLIを直接起動した時と同じ共同作業環境で動かす。
aitermはproject方針、MCP、plugin、skill、agent定義、permission、trust、memoryを選別・複製せず、
vendor CLIの通常discoverへ委ねる。launch単位で隔離するのはaiterm所有の完了相関と回収結果だけにする。

工程ToDo・依存・状態・完了証拠の正本はLattice plan `shared-agent-environment`である。
読む時は`lattice plan show shared-agent-environment --json`を使い、この文書へcheckboxを二重化しない。

## 現状と問題

- 同じ`cwd`とworkspace fileは既に共有するが、launcherがvendorごとのmanaged home／settingsを作るため、
  通常CLIと同じ環境にはならない。
- Codexは通常`config.toml`と`agents/*.toml`のsnapshot、Claudeはuser scope MCPだけのsnapshot、
  Grok／Composerはfake `HOME`とcompat無効化を使う。4vendorで共有契約が揃っていない。
- この隔離は、Stop hookを他の設定と混線させず`agent_done`を相関するため段階的に導入された。
  しかし、制御用telemetryの隔離がproject／user環境の隔離まで広がり、共同作業員としての再現性を落としている。
- Codexは既にvendor rolloutの`task_complete.turn_id`を完了正本にしており、完了hookのためのmanaged
  `CODEX_HOME`は不要になり得る。Claude／Grok系は、通常設定を保ったまま追加hookまたはvendor-native
  completionを相関できるかを実装前に実証する必要がある。

## 目標契約

1. launcherは指定`cwd`で、通常の`HOME`とvendor home、MCP server定義、project／local設定を使う。
2. `CLAUDE.md`／`AGENTS.md`／vendor-native rules、skills、plugins、agents、permission、trust、memoryの
   discover結果は、同じshellからCLIを直接起動した時と一致する。
3. aitermは通常のuser／project設定を書換えず、snapshotやfake homeで置換しない。
4. aitermが追加できるのは、CLI引数による明示的なmodel／effort／write scope、`AITERM_*`相関環境変数、
   secure state root内のlaunch固有event／resultだけとする。
5. 完了正本はvendor-native structured eventまたは通常設定へ加算できるlaunch固有hookだけとし、
   画面静止、prompt文字列、別sessionの最新transcriptへfallbackしない。
6. 複数agentを同じproject・同じvendor homeで並列起動しても、turn完了と全文回収をsession／operation単位で
   取り違えない。close／killAllはaiterm所有物だけを削除し、vendorの認証・設定・履歴を削除しない。
7. launcherは起動したagentへ、aitermから親agentに委譲されたsub-agentであること、親session、現在の
   delegation depth／lineageをvendor-nativeな非user instructionと環境metadataで明示する。子が同じaiterm MCPを
   使って孫agentを起動した時はlineageを保ちdepthを1増やす。これは再委譲禁止ではなく自己位置の認識だけを
   強制する契約であり、任務量に応じた孫agent以降の利用を許す。

## 非目標

- 親agentの会話履歴や内部contextを自動複製しない。任務・裁定・担当範囲はdispatch promptで渡す。
- vendorのworkspace trust、permission、MCP承認をaitermが代行・迂回しない。
- delegation depthの固定上限や、sub-agentからの`*_agent`呼出禁止を設けない。深い委譲自体を失敗条件にせず、
  各agentが自分の位置を認識したうえで必要性を判断できるようにする。
- 互換維持だけを理由に`environment_mode=managed|shared`のような新しい利用パターンを増やさない。
- 共有化と無関係なPTY、screen reduction、RTK、SSH／container挙動を変更しない。
- vendor CLIやMCPが自身の通常契約として行う設定・session更新をaiterm側で抑止しない。

## 実装前に確定する分岐

### Claude

通常の`user,project,local` setting sourcesを保ち、launch専用`--settings`を追加layerとして渡した時に、
既存hook／MCP／plugin／permissionとaiterm Stop hookが共存し、完了eventをlaunchへ相関できることを実測する。
merge不能または既存hook失敗がaiterm eventを失わせる場合は、Claudeのstructured remote control／stream event等、
通常環境を置換しないvendor-native境界を比較してADRで裁定する。

### Codex

通常`CODEX_HOME`のまま、起動したroot rolloutをsession metadataへ一意にbindし、dispatch直前byte cursor以後の
`task_complete.turn_id`と最終回答を同じrolloutから取得できることを、既存sessionとの並列条件で実測する。

### Grok／Composer

通常`HOME`／`GROK_HOME`とcompat discoveryを保ったまま、vendor transcript、ACP／agent protocol、または
加算可能なlaunch hookのいずれで正確なturn完了を相関できるかを比較する。通常homeへのhook installや設定変更は
採用せず、満たせない場合は共有を偽装して実装へ進まずPhase gateで止める。

### 委譲lineage

Claudeの`--append-system-prompt`、Grok系の`--rules`、Codexのdeveloper instruction相当など、通常のproject方針を
置換しないvendor-nativeな追加instruction経路をcharacterizeする。少なくとも`role=subagent`、親session、depth、
lineageをモデルと孫側のaiterm processが同じ値として観測できなければならない。初段はdepth 1、子が起動した
aiterm serverは継承値から孫をdepth 2として起動する。instructionには、再委譲が許可されていることを明記し、
「sub-agentだから他agentを呼べない」という誤解を作らない。固定depth capや暗黙拒否は入れない。

## Phase構成

| Phase | 成果 | Gate |
|---|---|---|
| discovery | 3vendor系統の通常環境characterizationと共通境界ADR | 直接起動との差分、完了相関、並列性、秘密非露出を独立反証 |
| safety | 目標契約を固定する失敗先行test | 現行managed挙動では赤、目標共有挙動だけでgreenになるfixture |
| implementation | Claude／Codex／Grok系の共有化とobsolete isolation撤去 | vendor別focused test、所有外path無変更、同一repo writerはLattice判定に従う |
| verification | cross-vendor並列、MCP、方針読込、approval、全文回収の実統合 | related testとfull regression各1回、4 launcher live smoke、敵対的Phase監査 |
| release | ADR／README／CHANGELOG／版同期と公開 | main祖先確認、tag CI、npm provenance、GitHub Release、Registry、global install smoke |

発見PhaseのClaude／Codex／Grok系characterizationはread-onlyで並行可能。実装Phaseのvendor別ToDoは論理的には
独立だが、現状`src/core.ts`と`test/core-agent.test.mjs`を共有するため、Lattice independence sensorが非交差を
証明しない限りwriterは直列にする。既存の公開作業がactiveの間は本planのToDoをstartせず、plan readyで待機する。

## 受入条件

- fixture projectで、直接起動と4 launcherのproject方針・user／project MCP・plugin／skill／agent discoverが一致する。
- launcher起動時にmanaged vendor home、config snapshot、fake `HOME`を作らず、通常設定を変更しない。
- Claude／Codex／Grok／Composerの初回promptとfollow-upが非ブロックdispatch契約を維持する。
- 同一vendor・同一cwdの並列sessionで、完了event、turn ID、全文回答、operation recoveryが交差しない。
- 4 launcherのagentが自分をsub-agentとして説明でき、親session／depthを正しく報告する。孫agent smokeでは
  depthが1増え、孫も再委譲可能だと理解し、同一任務の反射的な再起動ループを起こさない。
- trust未承認、MCP起動失敗、既存hook失敗、破損transcriptはfail loudし、別経路で成功扱いしない。
- close／killAll後も通常auth、settings、MCP、plugin、historyがbyte単位で不変で、aiterm secure stateだけが清掃される。
- focused／related／full regressionと4vendor live smokeを区別して記録し、公開後global installから同じ共有性を再確認する。

## Rollback

実装はvendor別にrevert可能なcommitへ分ける。公開後に重大な完了相関欠陥が出た場合は、影響vendorの変更commitを
revertした修正版を前進公開する。旧managed modeを隠れfallbackとして残したり、画面推定へ自動降格したりしない。

# Changelog

All notable changes to **aiterm-mcp** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.1] - 2026-07-11

Hardening sweep that clears the audit's remaining low-priority notes
(`docs/11` section C — now fully consumed). Regression suite 203 → 205.

### Fixed
- Stop hooks now check the `writeSync` return value when appending an event
  line; a short write (e.g. ENOSPC) is truncated back to the pre-write size
  and reported, so a fragment can never corrupt the next event line.
- `latestAgentDoneEvent` no longer goes silently blind when the events file
  exceeds 1 MB: it now reads a bounded 64 KB tail (dropping the first partial
  line), so `agent_event_seen` / `last_turn_id` metadata stays live on
  long-lived agent sessions — and mid-size files are read more cheaply than
  before (the old path read the whole file up to 1 MB on every read).
- Non-agent sessions no longer pay the agent-metadata directory probe on
  every `pty_read`: a 2-second in-process negative cache (absence-only,
  read-suffix path only, invalidated on `openAgent`/`closeSession`/`killAll`)
  skips the redundant filesystem work.

## [0.12.0] - 2026-07-11

Full-repo adversarial audit (multi-agent find → adversarial refutation → live
smoke) plus the fixes and one feature that survived it. Design record and
rejection ledger: `docs/11_audit-2026-07-11.md`; transcript-read design:
`docs/12_agent-transcript-read-plan.md`. Regression suite 183 → 203.

### Added
- `pty_read({ agent_transcript: true })` recovers an agent session's most
  recently completed turn's final assistant message, in plain text, from the
  vendor's structured session transcript (JSONL under the managed home). This
  fixes the case where a long agent answer is truncated by the `wait:
  "agent_done"` screen tail (pane height ≈ 24 lines). Codex joins on the Stop
  hook `turn_id`; Grok/Composer take the assistant rows after the last
  non-synthetic user row. The extracted text is bounded through the normal
  reduction pipeline. Mutually exclusive with `screen`/`full`/`rtk`/
  `line_range`/`wait` (`lines` is allowed). Missing transcript / non-agent
  session / no extractable message are explicit errors, never a silent empty.
- `pty_list` now appends agent metadata (`agent=<kind> agent_done=true`, plus
  `vendor_session_id` once bound) to agent session rows, so a resumable
  Codex/Grok/Composer session is distinguishable after an MCP server restart.
  Plain shell rows are unchanged.
- `codex_agent` launch responses now surface the inherited managed-config
  reality: `managed config: mcp_servers <N> 個継承 / approval_policy=… /
  sandbox_mode=… / hook trust bypass 有効`. The inheritance itself is the
  intended design (the child matches the terminal's Codex behavior); this only
  makes its consequences visible so a "review-only" child isn't silently
  full-access.

### Fixed
- Agent `wait` file locks now reclaim stale locks. A lock left behind by a
  crashed/killed waiter (the pid recorded in the lock is dead, or the lock is
  old and unreadable) no longer rejects `wait:"agent_done"` on that session
  forever; the live-pid check (`process.kill(pid, 0)`) reclaims dead locks and
  fails safe (rejects) when liveness is indeterminate. `closeSession`/`killAll`
  now also honor a live cross-process wait lock (previously only the in-process
  set), with the holder pid in the message. Agent metadata writes are now
  atomic (temp + rename).
- `reduceOutput` now bounds over-long single lines (head + tail with a restore
  hint), so a few huge lines — e.g. a full-screen TUI's absolute-cursor repaint
  stream — no longer slip past the line-count fold and blow the response token
  budget. Line count and order are preserved (the `line_range` domain is
  unchanged); `raw: true` is untouched.
- Reading from a mid-multibyte offset (full/range 8 MB truncation and the
  incremental path) no longer emits a leading U+FFFD; the skipped bytes are
  accounted into the next offset.
- The pytest reducer returns `null` (falls back to generic) when the output has
  no pytest evidence, instead of replacing an unrelated command's output with a
  fabricated "Pytest: No tests collected". `classify` is unchanged, so genuine
  pytest wrappers still reduce; the six golden fixtures stay byte-exact. Empty
  input now yields `null` too.
- The destructive-command tripwire now absorbs a `--` option terminator
  (`rm -rf -- /` was previously waved through), and `pty_send({ rtk: true })`
  re-checks the tripwire against the post-`rtk`-rewrite text before sending.
- `pty_read` with an inverted `line_range` (`"5:3"`) is now an explicit error
  instead of a silent empty result.
- Quiescence detection no longer mis-attributes a completion when output
  arrives during the foreground-shell probe: the size samples are from the
  past while the `pane_current_command` check is now, and output landing in
  that gap used to be returned as `via quiescent` even though a `mark`
  sentinel (or `until` match) was already in the log. The stability window is
  now re-validated (re-stat) after the probe; if the log grew, the loop
  re-runs and the sentinel/`until` claims the completion. Found by CI on slow
  macOS runners (the B1 regression test), where the `sleep 0.6` margin over
  the 0.5 s quiescence window was routinely blown.
- The `force` / `mark` argument descriptions now state their full effect
  (`force` also lifts the initial-prompt mixing guard; `mark` needs `enter` to
  actually run the sentinel). Codex managed-config pin overrides now also match
  quoted TOML keys.

### Tests
- Added `tools/call` dispatch coverage to the smoke test (unknown tool, bad
  args, inverted `line_range` — all `isError`), plus regressions for wait-lock
  reclamation, transcript recovery (both vendor shapes), the line/byte guards,
  and the tripwire gaps.

## [0.11.0] - 2026-07-11

### Added
- Agent launchers accept a `model` argument. `codex_agent` passes it as `-m`
  and, when `agent_done: true` creates a managed `CODEX_HOME`, explicitly
  passed `model` / `reasoning_effort` values also rewrite the corresponding
  top-level pins in the managed `config.toml` copy, so terminal pins (for
  example an `ultra` effort pin, which enables proactive multi-agent
  delegation) no longer silently leak into interactive children.
  `grok_agent` / `composer_agent` use it to override `--model`.
- Codex launch responses now state the effective model and effort with their
  origin — argument, terminal-config inheritance, or CLI default — and warn
  explicitly when the effective effort is `ultra`.

### Changed
- `grok_agent` default model moved from the stale `grok-build` slug to
  `grok-4.5` (`grok-build` no longer exists in the live model catalog).
- `grok_agent` / `composer_agent` now reject `reasoning_effort` with a clear
  error before creating a session, instead of forwarding `--effort` to the
  interactive TUI where the grok CLI warns and ignores it (the flag is
  headless-only, and Composer does not support reasoning effort at all). The
  former `low/medium/high/xhigh/max` enum on these tools is gone; `codex_agent`
  keeps an unconstrained string (CLI-version dependent, up to `ultra`).

## [0.10.0] - 2026-07-09

### Added
- Codex launcher initial-prompt waits: `codex_agent` now exposes `wait`,
  `timeout`, `screen`, and `lines` for the launch-time `prompt`.
  `prompt + wait: "agent_done"` starts the persistent TUI first, waits for the
  TUI input area, submits the initial prompt, and waits for that first turn's
  Stop hook. `wait: "agent_done"` requires both `prompt` and
  `agent_done: true`; it does not implicitly enable hooks. Grok/Composer
  initial-prompt waits are intentionally not exposed until the post-OAuth smoke
  passes; their existing follow-up `pty_send(wait:"agent_done")` route remains
  unchanged.
- Agent-session reads now include auxiliary metadata such as
  `initial_prompt`, `agent_event_seen`, `completion_attribution=none`,
  `last_turn_id`, and a best-effort `frontend` hint. Stale hook events are not
  promoted to `is_complete=True`.

### Fixed / Hardened
- Codex initial launcher prompts are no longer placed on the shell command line
  in the MCP launcher path, avoiding shell continuation display for long or
  multiline prompts. If the TUI is blocked before input, for example on a
  vendor login screen, the prompt is not sent and the launcher returns the
  session with `initial_prompt=not_sent`.
- Ordinary `pty_send` now refuses to type into a session while a launch-time
  initial prompt is still `pending` or `sent`, preventing follow-up input from
  mixing into the same live TUI turn. Manual takeover is still possible with
  `pty_key` or intentional `pty_send(..., force:true)`.
- Post-launch initial-prompt failures preserve the created `session_id` in the
  error text, so the caller can inspect or recover the remaining session instead
  of losing the handle.

### Changed
- Synced release-facing documentation, RAG notes, and distribution playbooks to
  the `v0.10.0` state after adversarial documentation verification.
- Added release metadata version-sync coverage so `package.json`,
  `package-lock.json`, and `server.json` stay aligned after release hardening.

### Docs / Verification
- Rechecked the public docs against npm/global install/Official MCP Registry
  state, current CI shape, and the **177-test** regression suite.
- Verified real Codex launcher `prompt + agent_done:true + wait:"agent_done"`
  smoke for single-line, long Japanese, and multiline Japanese prompts.
- Attempted the internal Grok/Composer initial-prompt route before exposing it;
  the current environment stopped at OAuth browser approval and correctly
  returned `initial_prompt=not_sent` without sending the prompt. Public schema
  therefore remains Codex-only for launch-time initial-prompt waits.
- Archived completed planning/checklist documents so `docs/` keeps only live
  docs and current operational notes at top level.

## [0.9.1] - 2026-07-07

### Fixed / Hardened
- Codex `agent_done` managed `CODEX_HOME` now allowlists only the required
  normal-home files: `auth.json` is linked for authentication and `config.toml`
  is copied privately. Other normal `~/.codex` entries are no longer symlinked
  into the managed home, reducing write-through side effects while still keeping
  aiterm-owned Stop hooks isolated from the user's normal `hooks.json`.

## [0.9.0] - 2026-07-07

### Added
- **Hook-backed agent turn completion**: `codex_agent` / `grok_agent` /
  `composer_agent` can opt into `agent_done: true`, and `pty_send` now accepts
  `wait: "agent_done"` to wait for the launched agent CLI's turn boundary before
  returning the final terminal observation. This adds no new tools; it keeps the
  existing persistent-PTY model and uses vendor Stop hooks only as the completion
  boundary.
- `pty_send` schema fields for agent waits: `wait`, `timeout`, `screen`, and
  `lines`. `wait: "none"` remains the default and preserves the existing send
  behavior.
- Managed Codex/Grok/Composer hook route: launch-local vendor homes install
  aiterm-owned Stop hooks without editing the user's normal hook files. Grok and
  Composer isolate `GROK_HOME` / `HOME` to suppress compat hook and plugin
  contamination while sharing the normal Grok home's `auth.json` and
  `auth.json.lock` as a pair.

### Fixed / Hardened
- Prevent stale or unrelated hook events from completing the wrong turn:
  `launch_id`, `vendor_session_id`, initial prompt completion, pre-send EOF, and
  post-bind missing/null vendor ids are all guarded.
- Wait for the launched agent TUI to reach its input prompt before the first
  unbound `pty_send(wait:"agent_done")`; if the TUI is not ready, aiterm now
  fails before sending text instead of dropping input and later timing out.
- Reject concurrent `wait:"agent_done"` calls for the same session across both
  in-process and cross-process MCP server instances with an agent wait lock file.
- Harden hook event files and Grok auth lock handling against symlink/hard-link
  attacks, loose state directories, malformed or oversized JSONL, and cleanup
  that could otherwise follow symlink targets.
- Treat a configured but missing `XDG_RUNTIME_DIR` as unusable and fall back to
  the normal temp dir for agent state, matching CI and non-login Linux shells.
- Improve screen settling after hook completion so an old stable screen is not
  returned before the agent's rendered output catches up.

### Docs / Tests
- Documented `agent_done` usage, limits, and platform support in README,
  design docs, ADR, and RAG. `agent_done` is supported on Linux, WSL2, and
  macOS; native Windows keeps the core PTY tools and agent launchers but not
  `agent_done` yet.
- Expanded regression coverage to **167 tests**, including hook wrappers,
  managed homes, event parsing, race/security cases, MCP schema, and screen
  settle / TUI-ready behavior.
- Verified real MCP `tools/call` smoke for Codex, Grok, and Composer
  `agent_done` plus a normal Python REPL PTY smoke.

## [0.8.0] - 2026-07-05

### Fixed (全域監査スイープ 2026-07-05 — 詳細は docs/archive/03_audit-sweep-2026-07.md)
- **pytest 収集エラーの誤変換**: `read rtk:true` で pytest の収集エラー（import 失敗等）が
  `Pytest: No tests collected` や `Pytest: 1 passed` に潰れ、赤を無害/緑と誤読していた問題を修正（C1）。
- **mark 完了検出のエコー誤爆**: `pty_send(mark:true)` の sentinel がコマンドエコーに部分一致し、
  長時間コマンドで早期に「完了」と偽っていた問題を修正。数字アンカー sentinel で自動検出（B1）。
- **エージェント起動の破壊ゲート誤爆**: `codex_agent`/`grok_agent`/`composer_agent` の初手 prompt に
  `rm -rf /`・`git reset --hard` 等の語を含めると起動が拒否されていた誤検知を解消（A4）。
- **破壊ゲートのすり抜け**: `rm -rf ./*`・`rm -rf "/"`・`rm -rf ..`・`rm -rf ./` を遮断対象に追加（B2）。
- **セッションログの復活**: 外部 kill 後に残った同名ログを新規出力として返す問題を truncate で修正（B5）。
- **UTF-8 境界分断 / DCS・APC 残存**: 増分読みの文字境界丸めと制御シーケンス除去を強化（B3/B10）。
- エージェント起動の Windows 対応（bin/cwd の WSL パス変換）・env bin 実在検証・cwd の空/`~` 検証（A1/A3/A6）。
- reducer の分類/除去精度（stripShellFrame の過剰除去、`python3 -m pytest`・`uv/poetry run` 等の分類）（C2-C6）。

### Changed
- **`pty_read` の `until` を既定でリテラル部分一致に**（従来は正規表現直解釈）。`$ ` や `[..]` 等が
  メタ化して永遠に待つ事故を防ぐ。正規表現が必要なときは `until_regex: true` でオプトイン（B4）。
- `pty_send(mark:true)` は `pty_read(wait:true)` が until 無しでも完了を自動検出するように（B1）。
- `pty_read` の `screen+wait`（完了後に画面取得）・`full+lines`（末尾 N 行）を機能化（従来は黙殺）（B11）。
- 読み取り・完了検出のメモリ/tmux spawn を削減（fd 範囲読み・伸長中の生存確認省略）（B6/B7）。

### CI / Infra
- ネイティブ Windows CI（windows-latest, Node 20/22, 非ブロッキング）を追加。純粋層を検証（C9）。
- registry publish が npm publish の完了を待つ／再 publish は idempotent にスキップ（C10/C11）。
- テストのタイミング依存（固定 sleep・smoke の timeout 挙動）を解消しフレイキーを除去（C8）。

### Added
- `.github/workflows/registry.yml`: publishes `server.json` to the Official MCP
  Registry via GitHub OIDC (on release, or manual dispatch). aiterm-mcp is now
  listed in the Official MCP Registry (which auto-propagates to PulseMCP and the
  GitHub MCP Registry) and on mcp.so.
- `.github/avatar.svg` + `.github/avatar.png`: square avatar mark (terminal
  `>_` prompt) for directory listings and social cards.

### Changed (metadata)
- CI: bump `actions/checkout` and `actions/setup-node` to v5 (the Node 20 action
  runtime is being removed from GitHub Actions).

## [0.7.1]

Codex 独立レビュー（gpt-5.5 high・実 CLI 検証つき）の指摘5件＋追加発見2件の修正。

### Fixed
- **`openAgent` が失敗時に session を残さない**: 前提検証（effort → CLI bin → cwd）を session
  作成前に完了させ、起動コマンド投入（send）が失敗した場合は作成済み session を片付けてから
  エラーを伝える。特に cwd 不存在は従来 `cd` がシェル内で静かに失敗し「起動した」と偽の成功を
  返していた——事前検証で明示エラーに。
- **`reasoning_effort` の検証**: grok/composer は有限集合（low/medium/high/xhigh/max）を
  スキーマ（z.enum）と core の両方で拒否（session 作成前）。codex は CLI 側の値集合が版で
  変わるため縛らない。
- **`pipe-pane` の失敗を検知**: 従来は戻り値を無視して成功を装い、以後の `pty_read` が永遠に
  空を返した。失敗時は作成した session を破棄して明示エラー。
- **自動採番の高並行スケール**: 線形 t{i} リトライは全員が同じ「最小の空き番号」に殺到して
  上限20回でも枯渇し得た。衝突時は乱数 nonce 名（`t-xxxxxx`・1600万空間）へ切替え。
  実測: 20プロセス同時 open で 20/20 成功・全一意。
- **smoke テストの期待値置き去り**: v0.7.0 で agent ツール3個を追加した際にツール一覧の期待値を
  更新し忘れテストが赤のままだった（6→9 ツールに更新）。

### Changed
- `codex_agent` の説明を実態に合わせた: 「gpt-5.5」固定の断定を外し「モデルは Codex CLI の既定」
  に（実装は `-m` を渡していないため。モデル固定が要るなら将来 model 引数を追加する）。

### Added
- `test/core-agent.test.mjs`: openAgent の前提検証・残骸ゼロ保証の characterization テスト4本
  （CODEX_BIN 偽装で CLI 未導入環境でも走る・隔離ソケット）。

## [0.7.0]

### Added
- **対話型エージェント起動ツール**（モデルごとに1つ＝ツール名/説明でどのモデルか一目瞭然）:
  - `codex_agent` — Codex (OpenAI・モデルは Codex CLI の既定) の対話 TUI を永続端末に起動
  - `grok_agent` — Grok Build の Grok モデル (grok-build) の対話 TUI を起動
  - `composer_agent` — Grok Build の Composer モデル (grok-composer-2.5-fast) の対話 TUI を起動
  いずれも session_id を返し、以後は `pty_read`/`pty_send` で対話操作する（＝aiterm の対話パラダイム）。
  `reasoning_effort`（思考レベル）・`cwd`・`prompt`（初手）・`session_name` を引数で受ける。

### Changed
- `openSession` の自動採番を並行安全化: 複数エージェントが同時に名前なし open した際の TOCTOU
  競合を、衝突時に静かに次名でリトライして解消（明示名は従来どおり既存でエラー＝意図的共有と区別）。

### Removed
- `delegate` tool（v0.5.0-0.6.0）を撤去。非対話ワンショットは aiterm（対話型端末）の責務でなく、
  非対話 codex 委譲は codex-sidecar（codex_work/review/generate 等）が担う。aiterm は対話に専念。

## [0.6.0]

### Added
- `delegate` tool に `backend`（codex|grok）パラメータ: MODELS.md の第一選択（Codex＝OpenAI枠／Grok
  Build＝xAI枠）に構造を合わせた。**codex は稼働**、**grok は要 `grok login`＋非対話呼び出しの実測が
  未完のため明示的に「未確定」を返す**（動くフリを避ける。login＋実測後に有効化）。

### Changed
- `delegate` の出力を整形: codex の生 stdout（思考過程・セッションメタ込みで巨大）でなく、
  `codex exec --output-last-message` でエージェントの**最終メッセージだけ**を回収して返す
  （review 出力が 60k字→数十字に。空/失敗時のみ生出力へ明示フォールバック）。

## [0.5.0]

### Added
- `delegate` tool: 実装の物量や独立レビューを Claude レート非依存の外部AI(Codex)へ委譲する。
  `mode=exec`（codex に実装させる・workspace-write）／`mode=review`（read-only レビューさせ指摘を返す）。
  統括(Claude)のレート窓を温存する。`prompt`/`mode`/`cwd`/`timeout_sec` を取り、codex 未導入環境では
  明示 no-op を返す（公開レジストリの他利用者を壊さない）。ロジックは `core.delegate`。

## [0.4.1] - 2026-06-08

### Changed
- Discoverability metadata & docs (no code or behavior change from 0.4.0):
  added `mcpName` and an Official MCP Registry `server.json` manifest (npm /
  stdio), a Glama `glama.json` claim file, and expanded npm keywords
  (`mcp-server`, `claude-code`, `cursor`, `devtools`).
- README (EN + JA) reworked for first-time visitors: leads with the
  SSH-persistence pitch, replaces the placeholder demo mock with **real captured
  `pty_read` output** (token-reduction and completion detection shown on genuine
  bytes), names comparison competitors, de-duplicates the install steps, and
  moves the constraints list below the fold.

## [0.4.0] - 2026-06-02

### Added
- Nested completion early-return: while nested (ssh/docker/REPL foreground) with no `until`, `pty_read({ wait: true })` now returns `is_complete=False via nested` as soon as output settles, instead of waiting the full `timeout` for a signal that cannot fire there. The read advises passing `until` (a prompt regex) or `mark: true` for a confirmed completion. Certainty is unchanged (still none in that case) — only the wasted wait is removed.

### Changed
- `is_complete` is reported `True` only for confirmed completion layers (`until` / `dead` / `quiescent`); `timeout` and the new `nested` are reported `False`.

## [0.3.1] - 2026-06-02

### Changed
- Documentation-only release so the npm package page reflects the refreshed README (Quickstart, Demo, and a clearer call to action). No code or behavior changes from 0.3.0.

## [0.3.0] - 2026-06-02

Native macOS support. macOS previously rode the generic POSIX path (`isWin=false`)
but was never verified on real hardware; this release closes the macOS-specific
operational gaps in the tmux resolution layer. Verified on Apple Silicon
(Homebrew tmux 3.6b): 92/92 tests plus a live E2E run (open / send / quiescence /
mark+until / screen / list / close). The POSIX and Windows paths are unchanged.

### Added
- `resolveTmux()` in `src/core.ts`: resolves the tmux binary in the order
  `AITERM_TMUX` (explicit override) → `PATH` → Homebrew defaults
  (`/opt/homebrew/bin` on Apple Silicon, `/usr/local/bin` on Intel), then caches
  the result. This finds tmux even under GUI launch, where the default `PATH`
  lacks the Homebrew bin directory. When tmux is found off `PATH`, the chosen
  path is announced on stderr (no silent fallback).
- CI `test-macos` job on `macos-latest` (Node 18/20/22, `brew install tmux`); the
  `publish` job now gates on `needs: [test, test-macos]`.
- `test/core-resolve.test.mjs` covering the POSIX tmux-resolution negative path
  (a bad `AITERM_TMUX` yields a clear code-2 error instead of an empty-stderr
  failure; skipped on native Windows, which uses the WSL bridge).

### Fixed
- Missing tmux now produces a clear `brew install tmux` diagnostic instead of a
  cryptic empty-stderr failure; the `tmux()` `ENOENT` case is distinguished from
  a generic non-zero exit.
- The bash 3.2 "switch to zsh" deprecation banner is suppressed via
  `new-session -e BASH_SILENCE_DEPRECATION_WARNING=1`. The `-e` flag is
  darwin-gated (and applied only when the shell is `bash`) because it requires
  tmux ≥ 3.2 and would break older Linux tmux.

## [0.2.0] - 2026-06-02

Native Windows support via a WSL tmux bridge. Windows has no tmux, so every tmux
call is bridged through `wsl.exe -e tmux`. The POSIX (Linux / WSL2 / macOS) path
is behaviorally unchanged.

### Added
- Native Windows backend: all tmux invocations routed through `wsl.exe -e tmux`,
  with the control socket on the WSL-native filesystem and pipe-pane logs read
  back via `/mnt` (with a Windows-only settle step before declaring completion).
  Requires WSL with tmux installed inside it.
- `toWslPath()` drive-path translation, plus `test/core-space-path.test.mjs`
  (pipe-pane capture under a space-containing temp path). The existing
  `core-pure`, `core-readoutput`, and `core-tmux` suites were extended with
  regression coverage for the bridge, session-name validation, path traversal,
  and offset clamping.

### Changed
- Session-name validation hardened and enforced at every entry point to block
  path traversal and shell injection (names must match `/^[A-Za-z0-9_-]{1,64}$/`).

## [0.1.0] - 2026-06-02

Initial npm publish (with provenance): a Node/TypeScript rewrite of the Python MVP
prototype (preserved under `prototype/python/` as the porting source and reference).

### Added
- stdio MCP server exposing exactly 6 tools: `pty_open`, `pty_send`, `pty_read`,
  `pty_key`, `pty_close`, `pty_list`. SSH, containers, and REPLs are not separate
  tools — you nest into the one PTY by `pty_send`-ing `ssh host`, `docker exec …`,
  etc.
- tmux backend: one persistent local PTY per session, surviving MCP server/client
  restarts via the tmux daemon. tmux is started with `-f /dev/null` (ignores
  `~/.tmux.conf` for reproducibility); all sessions live on one socket, so
  `tmux kill-server` removes them all. A human can co-drive any session via
  `tmux -S … attach -t <id>` (the attach command is printed by `pty_open`).
- Token-reducing reads: strip control characters, collapse repeats, head+tail
  elision with a restore hint and a meta line. `pty_read({rtk:true})` applies
  per-command reducers (git status/log, grep, pytest, df, make, …) as a
  self-contained reimplementation — no `rtk` binary required.
  `pty_send({rtk:true})` delegates to the external `rtk` binary if present and
  passes through otherwise (`src/rtk.ts`).
- Four-layer completion detection: process exit (dead) / until-regex /
  quiescence (output settled AND shell is back) / timeout. While nested
  (ssh/docker), quiescence cannot fire by design — use `until` or `mark`.
- Safety gate: `pty_send` blocks destructive commands (`rm -rf /`, `mkfs`,
  `dd of=/dev/`, `DROP TABLE`, fork bomb, `git reset --hard`, `curl … | sh`, …),
  overridable with `force:true`. It is a tripwire, not a sandbox: it does not
  catch relative-path `rm`, post-`$VAR`-expansion danger, or commands on the far
  side of an ssh hop. `pty_read` neutralizes control characters in returned text.
- Node regression suite (`node:test`, `npm test`, tmux required) and CI on
  `ubuntu-latest` for Node 18/20/22, publishing to npm on `v*` tags with
  provenance.

[Unreleased]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kitepon-rgb/aiterm-mcp/releases/tag/v0.1.0

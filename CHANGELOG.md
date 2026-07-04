# Changelog

All notable changes to **aiterm-mcp** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Added
- `.github/workflows/registry.yml`: publishes `server.json` to the Official MCP
  Registry via GitHub OIDC (on release, or manual dispatch). aiterm-mcp is now
  listed in the Official MCP Registry (which auto-propagates to PulseMCP and the
  GitHub MCP Registry) and on mcp.so.
- `.github/avatar.svg` + `.github/avatar.png`: square avatar mark (terminal
  `>_` prompt) for directory listings and social cards.

### Changed
- CI: bump `actions/checkout` and `actions/setup-node` to v5 (the Node 20 action
  runtime is being removed from GitHub Actions).

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

[Unreleased]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kitepon-rgb/aiterm-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kitepon-rgb/aiterm-mcp/releases/tag/v0.1.0

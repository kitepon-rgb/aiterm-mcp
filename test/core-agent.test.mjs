// openAgent の前提検証と残骸ゼロ保証の characterization。
// - effort 検証は bin 解決より先＝CLI 不在の端末でも同じ結果（環境非依存）。
// - CODEX_BIN 環境変数で bin を無害コマンドに偽装し、CLI 未導入環境でも cwd 検証・残骸テストを回す。
// - tmux 実機を使うケースは core-tmux.test.mjs と同じ隔離ソケット方式（TMPDIR 退避・skip 制御）。
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const hasTmux =
  (process.platform === "win32"
    ? spawnSync("wsl.exe", ["-e", "tmux", "-V"])
    : spawnSync("tmux", ["-V"])
  ).status === 0;
// prefix は短く保つ（macOS の UNIX ソケットパスは 104 バイト上限。長い prefix だと
// claude.sock への接続が "File name too long" で落ちる——実測）。
process.env.TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), "aiterm-agt-"));
process.env.CODEX_BIN = "/bin/echo"; // 実 CLI を起動せず openAgent の配管だけ検証する
const core = await import("../dist/core.js");
const skip = hasTmux ? undefined : "tmux 未インストール";

after(() => {
  if (hasTmux) {
    try {
      core.killAll();
    } catch {
      /* noop */
    }
  }
});

test("openAgent: grok の不正 effort は session を作る前に拒否（CLI 不在でも同じ）", () => {
  assert.throws(
    () => core.openAgent("grok", { reasoning_effort: "bogus" }),
    (e) => e.code === 2 && /low\/medium\/high\/xhigh\/max/.test(e.message),
  );
});

test("openAgent: codex の effort は縛らない（CLI 版差があるため送信まで到達する）", { skip }, () => {
  // 偽 bin(/bin/echo) なので実起動はしない。effort が事前拒否されないことだけ確認。
  const [sid] = core.openAgent("codex", { reasoning_effort: "minimal" });
  core.closeSession(sid);
});

test("openAgent: 実在しない cwd は session を作る前に拒否", () => {
  assert.throws(
    () => core.openAgent("codex", { cwd: "/no/such/dir-aiterm-agent-test" }),
    (e) => e.code === 2 && /cwd/.test(e.message),
  );
});

test("openAgent: send が破壊ゲートで落ちたら session を残さない", { skip }, () => {
  const before = core.listSessions();
  // prompt に破壊パターンを含めると send(force:false) が code 3 で throw する（未送信・未実行）。
  assert.throws(
    () => core.openAgent("codex", { prompt: "rm -rf /" }),
    (e) => e.code === 3,
  );
  assert.equal(core.listSessions(), before, "失敗した openAgent が session を残した");
});

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('server.json version stays in lockstep with package.json', async () => {
  const [pkg, server, mcpbManifest] = await Promise.all([
    readJson(new URL('../package.json', import.meta.url)),
    readJson(new URL('../server.json', import.meta.url)),
    readJson(new URL('../mcpb/manifest.json', import.meta.url)),
  ]);

  assert.equal(server.version, pkg.version);
  assert.equal(server.packages.length, 1);
  assert.equal(server.packages[0].identifier, pkg.name);
  assert.equal(server.packages[0].version, pkg.version);
  assert.equal(mcpbManifest.version, pkg.version);
});

test('release metadata points at the canonical kitepon organization repository', async () => {
  const [pkg, server, mcpbManifest, issueLinks, registryWorkflow] = await Promise.all([
    readJson(new URL('../package.json', import.meta.url)),
    readJson(new URL('../server.json', import.meta.url)),
    readJson(new URL('../mcpb/manifest.json', import.meta.url)),
    readFile(new URL('../.github/ISSUE_TEMPLATE/config.yml', import.meta.url), 'utf8'),
    readFile(new URL('../.github/workflows/registry.yml', import.meta.url), 'utf8'),
  ]);

  assert.equal(pkg.mcpName, 'io.github.kitepon/aiterm-mcp');
  assert.equal(pkg.repository.url, 'git+https://github.com/kitepon/aiterm-mcp.git');
  assert.equal(pkg.homepage, 'https://github.com/kitepon/aiterm-mcp#readme');
  assert.equal(server.name, pkg.mcpName);
  assert.ok(server.description.length <= 100);
  assert.equal(server.repository.url, 'https://github.com/kitepon/aiterm-mcp');
  assert.equal(mcpbManifest.repository.url, 'https://github.com/kitepon/aiterm-mcp');
  assert.equal(mcpbManifest.homepage, pkg.homepage);
  assert.match(issueLinks, /https:\/\/github\.com\/kitepon\/aiterm-mcp\/discussions/);
  assert.match(issueLinks, /https:\/\/github\.com\/kitepon\/aiterm-mcp\/security\/advisories\/new/);
  assert.doesNotMatch(issueLinks, /kitepon-rgb/);
  assert.match(registryWorkflow, /io\.github\.kitepon\/\*/);
  assert.doesNotMatch(registryWorkflow, /io\.github\.kitepon-rgb/);
});

test('final CI measures dependency install separately from the four-environment full test', async () => {
  const ci = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

  assert.match(ci, /uses: kitepon\/dotagents\/\.github\/workflows\/factory-full-ci\.yml@main/);
  assert.match(ci, /dependency-command: npm ci/);
  assert.match(ci, /node --version && npm --version && npm test/);
  assert.match(ci, /needs: \[full\]/);
});

test('clean build ships only the active managed stop hooks', async () => {
  await access(new URL('../dist/claude-stop-hook.js', import.meta.url));
  await access(new URL('../dist/grok-stop-hook.js', import.meta.url));
  for (const removed of ['codex-stop-hook.js', 'cursor-stop-hook.js']) {
    await assert.rejects(access(new URL(`../dist/${removed}`, import.meta.url)), { code: 'ENOENT' });
  }
});

test('npm pack はbuild済みdistの全ランタイム.jsを同梱する', async () => {
  // 実被弾（v0.27.7）: files の "dist/*.js" glob がサブディレクトリを含まず、公開packageに
  // dist/harnesses/ が入らないまま publish され、公開版が ERR_MODULE_NOT_FOUND で起動不能だった。
  // repo内 dist で回る CI では検出できないため、tarball 同梱一覧そのものを固定する。
  const root = fileURLToPath(new URL('..', import.meta.url));
  // Windows の npm 実体は npm.cmd のため、shell 経由でないと spawn ENOENT になる。
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const packed = new Set(JSON.parse(stdout)[0].files.map((f) => f.path));
  // 対象は tsc が生成する runtime dist（直下と harnesses/）だけ。dist/ に残り得る
  // MCPB staging 等の生成残骸は publish 対象ではないため見ない。
  const distJs = (await readdir(new URL('../dist', import.meta.url), { recursive: true }))
    .map((f) => f.split('\\').join('/'))
    .filter((f) => f.endsWith('.js') && (!f.includes('/') || f.startsWith('harnesses/')))
    .map((f) => `dist/${f}`);
  assert.ok(distJs.some((f) => f.startsWith('dist/harnesses/')), 'dist/harnesses/*.js がbuildされていません');
  for (const f of distJs) {
    assert.ok(packed.has(f), `${f} が npm pack に同梱されていません（package.json files を確認）`);
  }
});

test('MCPB staging はbuild済みdistの全ランタイム.jsを再帰的に同梱する', async () => {
  // 実被弾（v0.28.0公開前）: stagingがdist直下の*.jsだけをcopyし、harnesses/*.jsを欠いた
  // 起動不能archiveをMCPB validatorが通した。archive構造でなくruntime import集合を固定する。
  const root = fileURLToPath(new URL('..', import.meta.url));
  await execFileAsync(process.execPath, ['scripts/build-mcpb.mjs'], { cwd: root });
  const distJs = (await readdir(new URL('../dist', import.meta.url), { recursive: true }))
    .map((f) => f.split('\\').join('/'))
    .filter((f) => f.endsWith('.js') && !f.startsWith('mcpb-stage/'));
  assert.ok(distJs.some((f) => f.startsWith('harnesses/')), 'dist/harnesses/*.js がbuildされていません');
  for (const file of distJs) {
    await access(new URL(`../dist/mcpb-stage/server/dist/${file}`, import.meta.url));
  }
});

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

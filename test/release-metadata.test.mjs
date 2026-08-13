import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

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
  const [pkg, server, mcpbManifest] = await Promise.all([
    readJson(new URL('../package.json', import.meta.url)),
    readJson(new URL('../server.json', import.meta.url)),
    readJson(new URL('../mcpb/manifest.json', import.meta.url)),
  ]);

  assert.equal(pkg.mcpName, 'io.github.kitepon/aiterm-mcp');
  assert.equal(pkg.repository.url, 'git+https://github.com/kitepon/aiterm-mcp.git');
  assert.equal(pkg.homepage, 'https://github.com/kitepon/aiterm-mcp#readme');
  assert.equal(server.name, pkg.mcpName);
  assert.equal(server.repository.url, 'https://github.com/kitepon/aiterm-mcp');
  assert.equal(mcpbManifest.repository.url, 'https://github.com/kitepon/aiterm-mcp');
  assert.equal(mcpbManifest.homepage, pkg.homepage);
});

test('final CI runs the same full test on all four factory environments', async () => {
  const [ci, factory] = await Promise.all([
    readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    readFile(new URL('../.github/workflows/factory-full-ci.yml', import.meta.url), 'utf8'),
  ]);

  assert.match(ci, /uses: \.\/\.github\/workflows\/factory-full-ci\.yml/);
  assert.match(ci, /node --version && npm --version && npm ci && npm test/);
  assert.match(ci, /needs: \[full\]/);
  for (const environment of ['macos-native', 'linux-native', 'windows-native', 'wsl2']) {
    assert.match(factory, new RegExp(`"${environment}"`));
  }
  assert.match(factory, /runs-on: \[self-hosted, factory, "\$\{\{ matrix\.environment \}\}"\]/);
  assert.match(factory, /run: \$\{\{ inputs\.full-command \}\}/);
});

test('clean build ships only the active managed stop hooks', async () => {
  await access(new URL('../dist/claude-stop-hook.js', import.meta.url));
  await access(new URL('../dist/grok-stop-hook.js', import.meta.url));
  await assert.rejects(
    access(new URL('../dist/codex-stop-hook.js', import.meta.url)),
    { code: 'ENOENT' },
  );
});

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

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
  await assert.rejects(
    access(new URL('../dist/codex-stop-hook.js', import.meta.url)),
    { code: 'ENOENT' },
  );
});

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

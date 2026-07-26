import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

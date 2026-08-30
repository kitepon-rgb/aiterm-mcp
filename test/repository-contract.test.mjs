import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, posix } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = new URL('..', import.meta.url);

test('npm pack内の全Markdownは相対linkと画像をpack内だけで解決する', async () => {
  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--dry-run', '--ignore-scripts', '--json'],
    { cwd: root, maxBuffer: 16 * 1024 * 1024, shell: process.platform === 'win32' },
  );
  const files = new Set(JSON.parse(stdout)[0].files.map((file) => file.path));
  const markdownFiles = [...files].filter((path) => path.endsWith('.md'));
  assert.ok(markdownFiles.length > 0, 'npm packにMarkdownが含まれていません');

  for (const markdownPath of markdownFiles) {
    const source = await readFile(new URL(markdownPath, root), 'utf8');
    const targets = [
      ...[...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1] ?? ''),
      ...[...source.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*>/gi)]
        .map((match) => match[1] ?? ''),
    ];
    for (const rawTarget of targets) {
      const target = rawTarget.trim().replace(/^<|>$/g, '');
      if (/^(?:https?:|mailto:|data:|#)/.test(target)) continue;
      const path = target.split('#', 1)[0]?.split('?', 1)[0] ?? '';
      if (path.length === 0) continue;
      const packedPath = posix.normalize(posix.join(posix.dirname(markdownPath), path));
      assert.ok(
        files.has(packedPath),
        `${markdownPath}の相対link ${rawTarget} はnpm pack内の${packedPath}で解決できません`,
      );
    }
  }
});

test('製品CIはlocal full、Markdown文書検査、tag/version一致を所有する', async () => {
  const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
  const workflowFiles = (await readdir(workflowDirectory)).filter((path) => /\.ya?ml$/.test(path));
  const workflows = await Promise.all(workflowFiles.map(async (path) => ({
    path,
    source: await readFile(new URL(path, workflowDirectory), 'utf8'),
  })));
  for (const workflow of workflows) {
    assert.doesNotMatch(
      workflow.source,
      /uses:\s*kitepon\/dotagents\/\.github\/workflows\//,
      `${workflow.path}が外部dotagents workflowへ依存しています`,
    );
  }

  const ci = workflows.find((workflow) => workflow.path === 'ci.yml')?.source ?? '';
  const productFull = workflows.find(
    (workflow) => workflow.path === 'product-full-ci.yml',
  )?.source ?? '';
  const registry = workflows.find((workflow) => workflow.path === 'registry.yml')?.source ?? '';
  assert.match(ci, /uses:\s*\.\/\.github\/workflows\/product-full-ci\.yml\b/);
  assert.match(ci, /documentation-command:\s*npm run test:docs/);
  assert.match(ci, /test "\$GITHUB_REF_NAME" = "v\$version"/);
  assert.match(productFull, /documentation-command:/);
  assert.match(productFull, /inputs\.documentation-command != ''/);
  assert.match(registry, /if: github\.event_name == 'release'/);
  assert.match(registry, /test "\$RELEASE_TAG" = "v\$version"/);
});

test('README画像、archive定義、旧engine履歴は現行事実を示す', async () => {
  const [readme, readmeJa, overview, design, release, oldMcpPlan] = await Promise.all([
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../README.ja.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/00_overview.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/DESIGN.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/RELEASE.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/archive/02_mcp-plan.md', import.meta.url), 'utf8'),
  ]);
  for (const source of [readme, readmeJa]) {
    assert.doesNotMatch(source, /<img src="\.github\//);
    assert.match(source, /https:\/\/raw\.githubusercontent\.com\/kitepon\/aiterm-mcp\/main\/\.github\/og\.png/);
    assert.match(source, /https:\/\/raw\.githubusercontent\.com\/kitepon\/aiterm-mcp\/main\/\.github\/demo\.gif/);
    assert.match(source, /aiterm-mcp@<known-good-version>/);
  }
  assert.match(overview, /完了・棄却・中断・失効・置換/);
  assert.match(design, /完了・棄却・中断・失効・置換済み/);
  assert.match(release, /README\.md.*README\.ja\.md.*現行公開版/);
  assert.match(oldMcpPlan, /line formatting engineは後続実装で成立済み/);
});

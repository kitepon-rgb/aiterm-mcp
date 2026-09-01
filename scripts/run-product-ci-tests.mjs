#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const scope = process.env.PRODUCT_CI_TEST_SCOPE;
if (scope === 'all') {
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test']);
} else if (scope === 'selected') {
  const files = JSON.parse(process.env.PRODUCT_CI_TEST_FILES ?? '[]');
  if (!Array.isArray(files) || files.length === 0 || files.some((file) => typeof file !== 'string')) {
    throw new Error('PRODUCT_CI_TEST_FILES が不正です');
  }
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
  run(process.execPath, ['--test', ...files]);
} else {
  throw new Error(`PRODUCT_CI_TEST_SCOPE が不正です: ${scope || '未指定'}`);
}

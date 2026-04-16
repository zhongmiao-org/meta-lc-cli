import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cliPath = resolve(__dirname, '..', 'cli.js');
const fixturesDir = resolve(__dirname, 'fixtures');

function run(args: string[]) {
  return spawnSync('node', [cliPath, ...args], {
    encoding: 'utf-8'
  });
}

test('init creates template file that validate accepts', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'meta-lc-cli-'));
  const out = join(workspace, 'app.dsl.json');

  const initResult = run(['init', '--out', out]);
  assert.equal(initResult.status, 0);
  assert.equal(existsSync(out), true);

  const validateResult = run(['validate', '--file', out, '--json']);
  assert.equal(validateResult.status, 0);
  const output = JSON.parse(validateResult.stdout);
  assert.equal(output.ok, true);
});

test('validate returns exit code 1 for invalid dsl', () => {
  const invalidPath = join(fixturesDir, 'invalid-dsl.json');
  const result = run(['validate', '--file', invalidPath, '--json']);
  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.ok(Array.isArray(output.errors));
});

test('explain returns stable summary and bad json errors', () => {
  const validPath = join(fixturesDir, 'valid-dsl.json');
  const explainResult = run(['explain', '--file', validPath, '--json']);
  assert.equal(explainResult.status, 0);
  const output = JSON.parse(explainResult.stdout);
  assert.equal(output.summary.appId, 'demo-app');

  const workspace = mkdtempSync(join(tmpdir(), 'meta-lc-cli-'));
  const badPath = join(workspace, 'bad.json');
  writeFileSync(badPath, '{bad-json', 'utf-8');
  const badResult = run(['validate', '--file', badPath]);
  assert.equal(badResult.status, 1);
  assert.ok(badResult.stderr.length > 0 || badResult.stdout.length > 0);
});

test('generate writes only plan by default', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'meta-lc-cli-'));
  const out = join(workspace, 'app.dsl.json');
  const initResult = run(['init', '--out', out]);
  assert.equal(initResult.status, 0);

  const generateResult = run(['generate', '--file', out, '--out', 'test-default', '--json']);
  assert.equal(generateResult.status, 0);
  const output = JSON.parse(generateResult.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.plan.version, 'generation-plan.v1');
  assert.equal(Array.isArray(output.artifacts), true);

  const outRoot = resolve(process.cwd(), 'out', 'test-default', 'demo-app');
  assert.equal(existsSync(join(outRoot, 'plan.json')), true);
  assert.equal(existsSync(join(outRoot, 'db', 'up.sql')), false);
});

test('generate with --write outputs DB/API/Perm/Page files', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'meta-lc-cli-'));
  const out = join(workspace, 'app.dsl.json');
  const initResult = run(['init', '--out', out]);
  assert.equal(initResult.status, 0);

  const generateResult = run(['generate', '--file', out, '--out', 'test-write', '--write', '--json']);
  assert.equal(generateResult.status, 0);
  const output = JSON.parse(generateResult.stdout);
  assert.equal(output.ok, true);
  const outRoot = resolve(process.cwd(), 'out', 'test-write', 'demo-app');
  assert.equal(existsSync(join(outRoot, 'db', 'up.sql')), true);
  assert.equal(existsSync(join(outRoot, 'api', 'openapi.json')), true);
  assert.equal(existsSync(join(outRoot, 'perm', 'permission.json')), true);
  assert.equal(existsSync(join(outRoot, 'page', 'page.dsl.json')), true);
});

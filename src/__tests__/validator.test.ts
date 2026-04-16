import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { explainDsl, validateDsl } from '../core/validator';

function readFixture(name: string): unknown {
  const path = resolve(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8')) as unknown;
}

test('validateDsl passes valid fixture', () => {
  const result = validateDsl(readFixture('valid-dsl.json'));
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('validateDsl fails invalid fixture with detailed errors', () => {
  const result = validateDsl(readFixture('invalid-dsl.json'));
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors[0]?.path !== undefined);
  assert.ok(result.errors[0]?.suggestion.length > 0);
});

test('explainDsl returns summary for valid fixture', () => {
  const output = explainDsl(readFixture('valid-dsl.json'));
  assert.equal(output.ok, true);
  assert.equal(output.summary?.appId, 'demo-app');
  assert.equal(output.summary?.resourceCount, 1);
});

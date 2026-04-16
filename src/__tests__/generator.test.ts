import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { AppDslV1 } from '../types/app-dsl';
import { buildGenerationPlan, generateArtifacts } from '../core/generator';

const fixtureDsl: AppDslV1 = {
  version: 'app-dsl.v1',
  app: { id: 'demo-app', name: 'Demo App', version: '0.1.0' },
  tenants: [{ id: 'tenant-a', name: 'Tenant A' }],
  roles: [{ id: 'manager', name: 'Manager', scopes: ['DEPT'] }],
  resources: [{ id: 'orders-query', name: 'Orders Query', method: 'query', endpoint: '/query' }],
  pages: [{ id: 'orders-page', title: 'Orders', route: '/orders', resources: ['orders-query'] }]
};

test('buildGenerationPlan returns stable plan shape', () => {
  const plan = buildGenerationPlan(fixtureDsl, { baseOutDir: '/tmp/out' });
  assert.equal(plan.version, 'generation-plan.v1');
  assert.equal(plan.appId, 'demo-app');
  assert.equal(plan.outputs.length, 4);
  assert.ok(plan.outputs.some((item) => item.type === 'db'));
});

test('generateArtifacts writes only plan when writeFiles=false', async () => {
  const root = mkdtempSync(join(tmpdir(), 'meta-lc-generate-'));
  const generated = await generateArtifacts(fixtureDsl, root, false);

  assert.equal(generated.artifacts.length, 4);
  assert.ok(existsSync(join(root, 'demo-app', 'plan.json')));
  assert.equal(existsSync(join(root, 'demo-app', 'db', 'up.sql')), false);
});

test('generateArtifacts writes all artifact files when writeFiles=true', async () => {
  const root = mkdtempSync(join(tmpdir(), 'meta-lc-generate-'));
  await generateArtifacts(fixtureDsl, root, true);

  assert.equal(existsSync(join(root, 'demo-app', 'db', 'up.sql')), true);
  assert.equal(existsSync(join(root, 'demo-app', 'api', 'openapi.json')), true);
  assert.equal(existsSync(join(root, 'demo-app', 'perm', 'permission.json')), true);
  assert.equal(existsSync(join(root, 'demo-app', 'page', 'page.dsl.json')), true);

  const sql = readFileSync(join(root, 'demo-app', 'db', 'up.sql'), 'utf-8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS'));
});

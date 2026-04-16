import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import type { AppDslV1 } from '../types/app-dsl';
import { buildTenantRoleTemplate, generateTenantRoleTemplate } from '../core/template-generator';

const fullDsl: AppDslV1 = {
  version: 'app-dsl.v1',
  app: { id: 'demo-app', name: 'Demo App', version: '0.1.0' },
  tenants: [{ id: 'tenant-a', name: 'Tenant A' }],
  roles: [{ id: 'manager', name: 'Manager', scopes: ['DEPT_AND_CHILDREN'] }],
  resources: [{ id: 'orders-query', name: 'Orders Query', method: 'query', endpoint: '/query' }],
  pages: [{ id: 'orders-page', title: 'Orders', route: '/orders', resources: ['orders-query'] }]
};

test('buildTenantRoleTemplate uses DSL tenants and roles when present', () => {
  const built = buildTenantRoleTemplate(fullDsl);
  assert.equal(built.template.tenants.length, 1);
  assert.equal(built.template.roles.length, 1);
  assert.equal(built.report.usedFallbackTenants, false);
  assert.equal(built.report.usedFallbackRoles, false);
  assert.equal(built.template.bindings.length, 1);
});

test('buildTenantRoleTemplate falls back when tenants or roles missing', () => {
  const built = buildTenantRoleTemplate({
    ...fullDsl,
    tenants: [],
    roles: []
  });
  assert.equal(built.report.usedFallbackTenants, true);
  assert.equal(built.report.usedFallbackRoles, true);
  assert.ok(built.template.tenants.length > 0);
  assert.ok(built.template.roles.length > 0);
});

test('generateTenantRoleTemplate writes file only when write=true', async () => {
  const outDir = `test-template-generator-${Date.now()}`;
  const preview = await generateTenantRoleTemplate(fullDsl, outDir, false);
  assert.equal(preview.report.written, false);
  assert.equal(existsSync(preview.absolutePath), false);

  const written = await generateTenantRoleTemplate(fullDsl, outDir, true);
  assert.equal(written.report.written, true);
  assert.equal(existsSync(written.absolutePath), true);
  assert.ok(written.absolutePath.startsWith(resolve(process.cwd(), 'out')));
});

import { resolve } from 'node:path';
import type {
  AppDslRoleV1,
  AppDslTenantV1,
  AppDslV1,
  TemplateGenerationReport,
  TenantRoleTemplateV1
} from '../types/app-dsl';
import { writeJsonFile } from '../utils/fs';
import { resolveOutRoot } from './generator';

const FALLBACK_TENANTS: AppDslTenantV1[] = [{ id: 'tenant-a', name: 'Tenant A' }];
const FALLBACK_ROLES: AppDslRoleV1[] = [
  { id: 'manager', name: 'Manager', scopes: ['TENANT_ALL'] },
  { id: 'staff', name: 'Staff', scopes: ['DEPT'] }
];

export interface BuildTemplateResult {
  template: TenantRoleTemplateV1;
  report: Omit<TemplateGenerationReport, 'relativePath' | 'written'>;
}

export interface GenerateTemplateResult {
  template: TenantRoleTemplateV1;
  report: TemplateGenerationReport;
  absolutePath: string;
}

export function buildTenantRoleTemplate(dsl: AppDslV1): BuildTemplateResult {
  const tenants = dsl.tenants.length > 0 ? dsl.tenants : FALLBACK_TENANTS;
  const roles = dsl.roles.length > 0 ? dsl.roles : FALLBACK_ROLES;
  const usedFallbackTenants = dsl.tenants.length === 0;
  const usedFallbackRoles = dsl.roles.length === 0;

  const bindings = tenants.map((tenant) => ({
    tenantId: tenant.id,
    defaultRoles: roles.map((role) => role.id)
  }));

  const template: TenantRoleTemplateV1 = {
    version: 'tenant-role-template.v1',
    appId: dsl.app.id,
    generatedAt: new Date().toISOString(),
    tenants,
    roles,
    bindings,
    defaults: {
      defaultTenantId: tenants[0]?.id ?? 'tenant-a',
      defaultRoleIds: roles.map((role) => role.id)
    }
  };

  return {
    template,
    report: {
      usedFallbackTenants,
      usedFallbackRoles
    }
  };
}

export async function generateTenantRoleTemplate(
  dsl: AppDslV1,
  requestedOut: string | undefined,
  writeFile: boolean
): Promise<GenerateTemplateResult> {
  const outRoot = resolveOutRoot(process.cwd(), requestedOut);
  const appFolder = sanitizePathSegment(dsl.app.id);
  const relativePath = `${appFolder}/template/tenant-role-template.json`;
  const absolutePath = resolve(outRoot, relativePath);
  const built = buildTenantRoleTemplate(dsl);

  if (writeFile) {
    await writeJsonFile(absolutePath, built.template);
  }

  return {
    template: built.template,
    absolutePath,
    report: {
      relativePath,
      written: writeFile,
      usedFallbackTenants: built.report.usedFallbackTenants,
      usedFallbackRoles: built.report.usedFallbackRoles
    }
  };
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
}

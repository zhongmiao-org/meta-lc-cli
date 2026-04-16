import { resolve } from 'node:path';
import type { AppDslV1, CommandOutput } from '../types/app-dsl';
import { printOutput } from '../core/output';
import { generateTenantRoleTemplate } from '../core/template-generator';
import { validateDsl } from '../core/validator';
import { readJsonFile } from '../utils/fs';

export async function runTemplate(options: {
  file: string;
  jsonMode: boolean;
  write: boolean;
  out?: string;
}): Promise<number> {
  const payload = await readJsonFile(options.file);
  const validation = validateDsl(payload);
  if (!validation.ok) {
    printOutput(
      {
        ok: false,
        errors: validation.errors,
        warnings: validation.warnings,
        template: undefined
      },
      options.jsonMode
    );
    return 1;
  }

  const dsl = payload as AppDslV1;
  const generated = await generateTenantRoleTemplate(dsl, options.out, options.write);

  const output: CommandOutput = {
    ok: true,
    errors: [],
    warnings: [],
    summary: {
      appId: dsl.app.id,
      appName: dsl.app.name,
      appVersion: dsl.app.version,
      tenantCount: generated.template.tenants.length,
      roleCount: generated.template.roles.length,
      resourceCount: dsl.resources.length,
      pageCount: dsl.pages.length,
      roleMatrix: generated.template.roles.map((role) => ({
        roleId: role.id,
        scopeCount: role.scopes.length
      }))
    },
    template: generated.report
  };

  printOutput(output, options.jsonMode);
  if (!options.jsonMode) {
    console.log(`Template path: ${resolve(generated.absolutePath)}`);
    if (!options.write) {
      console.log('Template is previewed only. Use --write to emit tenant-role-template.json.');
    }
  }

  return 0;
}

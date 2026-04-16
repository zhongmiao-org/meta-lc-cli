import { resolve } from 'node:path';
import type { CommandOutput } from '../types/app-dsl';
import type { AppDslV1 } from '../types/app-dsl';
import { printOutput } from '../core/output';
import { generateArtifacts, resolveOutRoot } from '../core/generator';
import { validateDsl } from '../core/validator';
import { readJsonFile } from '../utils/fs';

export async function runGenerate(options: {
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
        plan: undefined,
        artifacts: []
      },
      options.jsonMode
    );
    return 1;
  }

  const dsl = payload as AppDslV1;
  const outRoot = resolveOutRoot(process.cwd(), options.out);
  const generated = await generateArtifacts(dsl, outRoot, options.write);

  const output: CommandOutput = {
    ok: true,
    errors: [],
    warnings: [],
    summary: {
      appId: generated.plan.appId,
      appName: generated.plan.appId,
      appVersion: generated.plan.dslVersion,
      tenantCount: dsl.tenants.length,
      roleCount: dsl.roles.length,
      resourceCount: dsl.resources.length,
      pageCount: dsl.pages.length,
      roleMatrix: dsl.roles.map((role) => ({
        roleId: role.id,
        scopeCount: role.scopes.length
      }))
    },
    plan: generated.plan,
    artifacts: generated.artifacts
  };

  printOutput(output, options.jsonMode);
  if (!options.jsonMode) {
    console.log(`Plan written: ${resolve(generated.appOutDir, 'plan.json')}`);
    if (!options.write) {
      console.log('Artifacts are previewed only. Use --write to emit files.');
    }
  }

  return 0;
}

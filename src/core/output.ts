import type { CommandOutput, ValidationResult } from '../types/app-dsl';

export function asCommandOutput(result: ValidationResult): CommandOutput {
  return {
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings
  };
}

export function printOutput(output: CommandOutput, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (output.ok) {
    console.log('Validation: OK');
  } else {
    console.log(`Validation: FAILED (${output.errors.length} errors)`);
  }

  for (const warning of output.warnings) {
    console.log(`- warning: ${warning}`);
  }

  for (const error of output.errors) {
    console.log(`- error: path=${error.path} keyword=${error.keyword} message=${error.message}`);
    console.log(`  suggestion: ${error.suggestion}`);
  }

  if (output.summary) {
    console.log('Summary:');
    console.log(`- app: ${output.summary.appName} (${output.summary.appId}) v${output.summary.appVersion}`);
    console.log(`- tenants: ${output.summary.tenantCount}`);
    console.log(`- roles: ${output.summary.roleCount}`);
    console.log(`- resources: ${output.summary.resourceCount}`);
    console.log(`- pages: ${output.summary.pageCount}`);
    console.log('- role matrix:');
    for (const role of output.summary.roleMatrix) {
      console.log(`  - ${role.roleId}: ${role.scopeCount} scopes`);
    }
  }

  if (output.plan) {
    console.log('Plan:');
    console.log(`- version: ${output.plan.version}`);
    console.log(`- appId: ${output.plan.appId}`);
    console.log(`- generatedAt: ${output.plan.generatedAt}`);
    console.log(`- outputs: ${output.plan.outputs.length}`);
  }

  if (output.artifacts && output.artifacts.length > 0) {
    console.log('Artifacts:');
    for (const artifact of output.artifacts) {
      console.log(`- ${artifact.type}: ${artifact.relativePath} (written=${artifact.written})`);
    }
  }

  if (output.template) {
    console.log('Template:');
    console.log(`- path: ${output.template.relativePath}`);
    console.log(`- written: ${output.template.written}`);
    console.log(`- fallback tenants: ${output.template.usedFallbackTenants}`);
    console.log(`- fallback roles: ${output.template.usedFallbackRoles}`);
  }
}

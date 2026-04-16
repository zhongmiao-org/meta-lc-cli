import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import schema from '../schema/app-dsl.v1.schema.json';
import type { AppDslV1, CommandOutput, ExplainSummary, ValidationIssue, ValidationResult } from '../types/app-dsl';

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile<AppDslV1>(schema);

export function validateDsl(input: unknown): ValidationResult {
  const ok = validateSchema(input);
  if (ok) {
    return { ok: true, errors: [], warnings: [] };
  }
  const mapped = (validateSchema.errors ?? []).map(mapError);
  return {
    ok: false,
    errors: mapped,
    warnings: []
  };
}

export function explainDsl(input: unknown): CommandOutput {
  const result = validateDsl(input);
  if (!result.ok) {
    return {
      ok: false,
      errors: result.errors,
      warnings: result.warnings,
      summary: undefined
    };
  }

  const dsl = input as AppDslV1;
  const summary: ExplainSummary = {
    appId: dsl.app.id,
    appName: dsl.app.name,
    appVersion: dsl.app.version,
    tenantCount: dsl.tenants.length,
    roleCount: dsl.roles.length,
    resourceCount: dsl.resources.length,
    pageCount: dsl.pages.length,
    roleMatrix: dsl.roles.map((role) => ({ roleId: role.id, scopeCount: role.scopes.length }))
  };

  return {
    ok: true,
    errors: [],
    warnings: [],
    summary
  };
}

function mapError(error: ErrorObject): ValidationIssue {
  const path = error.instancePath || '/';
  return {
    path,
    keyword: error.keyword,
    message: error.message ?? 'invalid field',
    suggestion: buildSuggestion(error)
  };
}

function buildSuggestion(error: ErrorObject): string {
  switch (error.keyword) {
    case 'required':
      return '补齐缺失字段并保持字段名与 schema 一致。';
    case 'enum':
      return '改为 schema 允许的枚举值。';
    case 'type':
      return '修正字段类型（string/array/object）后重试。';
    case 'additionalProperties':
      return '删除未定义字段，或升级到支持该字段的 DSL 版本。';
    case 'const':
      return '检查 version 字段并固定为 app-dsl.v1。';
    default:
      return '根据错误 path 修正 DSL 后重新执行 validate。';
  }
}

export type ResourceMethod = 'query' | 'mutation';

export interface AppDslTenantV1 {
  id: string;
  name: string;
}

export interface AppDslRoleV1 {
  id: string;
  name: string;
  scopes: string[];
}

export interface AppDslResourceV1 {
  id: string;
  name: string;
  method: ResourceMethod;
  endpoint: string;
}

export interface AppDslPageV1 {
  id: string;
  title: string;
  route: string;
  resources: string[];
}

export interface AppDslAppInfoV1 {
  id: string;
  name: string;
  version: string;
}

export interface AppDslV1 {
  version: 'app-dsl.v1';
  app: AppDslAppInfoV1;
  tenants: AppDslTenantV1[];
  roles: AppDslRoleV1[];
  resources: AppDslResourceV1[];
  pages: AppDslPageV1[];
}

export interface ValidationIssue {
  path: string;
  keyword: string;
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: string[];
}

export interface ExplainSummary {
  appId: string;
  appName: string;
  appVersion: string;
  tenantCount: number;
  roleCount: number;
  resourceCount: number;
  pageCount: number;
  roleMatrix: Array<{ roleId: string; scopeCount: number }>;
}

export interface CommandOutput {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: string[];
  summary?: ExplainSummary;
}

import type { AppDslV1, CommandOutput, E2eOptions } from "../types/app-dsl";
import { printOutput } from "../core/output";
import { executeE2e } from "../core/e2e";
import { validateDsl } from "../core/validator";
import { readJsonFile } from "../utils/fs";

export interface E2eCliOptions {
  file: string;
  jsonMode: boolean;
  out?: string;
  bffUrl?: string;
  tenantA?: string;
  tenantB?: string;
  userId?: string;
  roles?: string;
}

export function resolveE2eOptions(input: E2eCliOptions): E2eOptions {
  return {
    bffUrl: input.bffUrl ?? process.env["LC_E2E_BFF_URL"] ?? "http://localhost:6000",
    tenantA: input.tenantA ?? process.env["LC_E2E_TENANT_A"] ?? "tenant-a",
    tenantB: input.tenantB ?? process.env["LC_E2E_TENANT_B"] ?? "tenant-b",
    userId: input.userId ?? process.env["LC_E2E_USER_ID"] ?? "demo-tenant-a-user",
    tenantBUserId: process.env["LC_E2E_TENANT_B_USER_ID"] ?? "demo-tenant-b-user",
    roles: normalizeRoles(input.roles ?? process.env["LC_E2E_ROLES"] ?? "USER")
  };
}

export async function runE2e(input: E2eCliOptions): Promise<number> {
  const payload = await readJsonFile(input.file);
  const validation = validateDsl(payload);
  if (!validation.ok) {
    const output: CommandOutput = {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
    printOutput(output, input.jsonMode);
    return 1;
  }

  const dsl = payload as AppDslV1;
  const options = resolveE2eOptions(input);
  try {
    const result = await executeE2e({
      dsl,
      requestedOut: input.out,
      options
    });

    const output: CommandOutput = {
      ok: true,
      errors: [],
      warnings: [],
      summary: {
        appId: dsl.app.id,
        appName: dsl.app.name,
        appVersion: dsl.app.version,
        tenantCount: dsl.tenants.length,
        roleCount: dsl.roles.length,
        resourceCount: dsl.resources.length,
        pageCount: dsl.pages.length,
        roleMatrix: dsl.roles.map((role) => ({
          roleId: role.id,
          scopeCount: role.scopes.length
        }))
      },
      checks: result.report.checks,
      reportPath: result.reportPath
    };
    printOutput(output, input.jsonMode);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reportPath =
      error && typeof error === "object" && "reportPath" in error
        ? String((error as { reportPath?: unknown }).reportPath ?? "")
        : "";
    const output: CommandOutput = {
      ok: false,
      errors: [
        {
          path: "/e2e",
          keyword: "e2e",
          message,
          suggestion: "根据失败 step 修复环境后重试；可结合 report.json 与 request-id 定位。"
        }
      ],
      warnings: [],
      reportPath: reportPath || undefined
    };
    printOutput(output, input.jsonMode);
    return 1;
  }
}

function normalizeRoles(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

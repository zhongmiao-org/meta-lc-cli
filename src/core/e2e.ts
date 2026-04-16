import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { AppDslV1, E2eCheckResult, E2eOptions, E2eReportV1 } from "../types/app-dsl";
import { generateArtifacts, resolveOutRoot } from "./generator";
import { generateTenantRoleTemplate } from "./template-generator";

interface ExecuteE2eInput {
  dsl: AppDslV1;
  requestedOut?: string;
  options: E2eOptions;
}

interface ExecuteE2eResult {
  report: E2eReportV1;
  reportPath: string;
}

interface HttpResult {
  status: number;
  json: unknown;
  requestId: string;
}

export async function executeE2e(input: ExecuteE2eInput): Promise<ExecuteE2eResult> {
  const checks: E2eCheckResult[] = [];
  const outRoot = resolveOutRoot(process.cwd(), input.requestedOut);
  await generateArtifacts(input.dsl, outRoot, true);
  const template = await generateTenantRoleTemplate(input.dsl, input.requestedOut, true);

  await runCheck("health", `${input.options.bffUrl}/health`, checks, () => checkHealth(input.options, checks));
  await runCheck("query-tenant-isolation", `${input.options.bffUrl}/query`, checks, () =>
    checkTenantIsolation(input.options, checks)
  );
  await runCheck("mutation-and-readback", `${input.options.bffUrl}/mutation`, checks, () =>
    checkMutationAndReadback(input.options, checks)
  );
  await runCheck("query-failure-sample", `${input.options.bffUrl}/query`, checks, () =>
    checkFailureQuery(input.options, checks)
  );

  const appOutDir = resolve(outRoot, sanitizePathSegment(input.dsl.app.id));
  const reportPath = resolve(appOutDir, "e2e", "report.json");
  const report: E2eReportV1 = {
    version: "e2e-report.v1",
    appId: input.dsl.app.id,
    generatedAt: new Date().toISOString(),
    options: input.options,
    checks,
    artifacts: {
      planPath: `${sanitizePathSegment(input.dsl.app.id)}/plan.json`,
      templatePath: template.report.relativePath
    }
  };

  const { writeJsonFile } = await import("../utils/fs");
  await writeJsonFile(reportPath, report);

  const failed = checks.find((item) => !item.ok);
  if (failed) {
    const error = new Error(`E2E check failed at ${failed.step}: ${failed.message}`);
    (error as Error & { reportPath?: string }).reportPath = reportPath;
    throw error;
  }

  return { report, reportPath };
}

async function checkHealth(options: E2eOptions, checks: E2eCheckResult[]): Promise<void> {
  const response = await fetchWithTimeout(`${options.bffUrl}/health`, {
    method: "GET"
  });
  let ok = false;
  try {
    const payload = (await response.json()) as { ok?: boolean };
    ok = payload.ok === true;
  } catch {
    ok = false;
  }
  checks.push({
    step: "health",
    ok: response.ok && ok,
    pathOrEndpoint: `${options.bffUrl}/health`,
    message: response.ok && ok ? "health check passed" : `unexpected health response (status=${response.status})`,
    suggestion: response.ok && ok ? undefined : "确认 BFF 已启动并可访问 /health。"
  });
}

async function checkTenantIsolation(options: E2eOptions, checks: E2eCheckResult[]): Promise<void> {
  const a = await callQuery(options, {
    tenantId: options.tenantA,
    userId: options.userId,
    keyword: "SO-A",
    requestId: `cli-e2e-query-${randomUUID()}`
  });
  const b = await callQuery(options, {
    tenantId: options.tenantB,
    userId: options.tenantBUserId,
    keyword: "SO-B",
    requestId: `cli-e2e-query-${randomUUID()}`
  });

  const rowsA = extractRows(a.json);
  const rowsB = extractRows(b.json);
  const aSafe = rowsA.length > 0 && rowsA.every((row) => String(row["tenant_id"]) === options.tenantA);
  const bSafe = rowsB.length > 0 && rowsB.every((row) => String(row["tenant_id"]) === options.tenantB);
  const requestIdOk = Boolean(a.requestId) && Boolean(b.requestId);

  checks.push({
    step: "query-tenant-isolation",
    ok: a.status === 200 && b.status === 200 && aSafe && bSafe && requestIdOk,
    pathOrEndpoint: `${options.bffUrl}/query`,
    requestId: `${a.requestId},${b.requestId}`,
    message: `tenant-a rows=${rowsA.length}, tenant-b rows=${rowsB.length}`,
    suggestion:
      a.status === 200 && b.status === 200 && aSafe && bSafe && requestIdOk
        ? undefined
        : "检查 seed 数据、tenant 参数及审计 request-id 回传。"
  });
}

async function checkMutationAndReadback(options: E2eOptions, checks: E2eCheckResult[]): Promise<void> {
  const orderId = `SO-E2E-${Date.now()}`;
  const createRequestId = `cli-e2e-mutation-create-${randomUUID()}`;
  const create = await callMutation(options, createRequestId, {
    table: "orders",
    operation: "create",
    tenantId: options.tenantA,
    userId: options.userId,
    roles: options.roles,
    orgId: "dept-a",
    data: {
      id: orderId,
      owner: "CLI E2E",
      channel: "web",
      priority: "medium",
      status: "active"
    }
  });

  const createPayload = asObject(create.json);
  const createOk = (create.status === 200 || create.status === 201) && Number(createPayload["rowCount"]) === 1;
  checks.push({
    step: "mutation-create",
    ok: createOk && Boolean(create.requestId),
    pathOrEndpoint: `${options.bffUrl}/mutation`,
    requestId: create.requestId,
    message: createOk ? `created order ${orderId}` : `create failed (status=${create.status})`,
    suggestion: createOk ? undefined : "确认 mutation 入参（tenant/user/roles/orgId）与 BFF 权限配置。"
  });

  const read = await callQuery(options, {
    tenantId: options.tenantA,
    userId: options.userId,
    keyword: orderId,
    requestId: `cli-e2e-query-${randomUUID()}`
  });
  const readRows = extractRows(read.json);
  const readOk = read.status === 200 && readRows.length >= 1 && String(readRows[0]["id"]) === orderId;
  checks.push({
    step: "mutation-readback",
    ok: readOk && Boolean(read.requestId),
    pathOrEndpoint: `${options.bffUrl}/query`,
    requestId: read.requestId,
    message: readOk ? `verified order ${orderId}` : `readback failed (status=${read.status})`,
    suggestion: readOk ? undefined : "确认 query filters.keyword 可命中新创建记录。"
  });

  const deleteReqId = `cli-e2e-mutation-delete-${randomUUID()}`;
  const remove = await callMutation(options, deleteReqId, {
    table: "orders",
    operation: "delete",
    tenantId: options.tenantA,
    userId: options.userId,
    roles: options.roles,
    key: {
      id: orderId
    }
  });
  const removePayload = asObject(remove.json);
  const removeOk = (remove.status === 200 || remove.status === 201) && Number(removePayload["rowCount"]) === 1;
  checks.push({
    step: "mutation-delete-cleanup",
    ok: removeOk && Boolean(remove.requestId),
    pathOrEndpoint: `${options.bffUrl}/mutation`,
    requestId: remove.requestId,
    message: removeOk ? `deleted order ${orderId}` : `delete failed (status=${remove.status})`,
    suggestion: removeOk ? undefined : "检查 delete payload.key.id 与 mutation 权限。"
  });
}

async function checkFailureQuery(options: E2eOptions, checks: E2eCheckResult[]): Promise<void> {
  const requestId = `cli-e2e-query-failure-${randomUUID()}`;
  const response = await requestJson(`${options.bffUrl}/query`, requestId, {
    table: "orders;drop",
    fields: ["id"],
    tenantId: options.tenantA,
    userId: options.userId,
    roles: options.roles
  });
  checks.push({
    step: "query-failure-sample",
    ok: response.status >= 400 && Boolean(response.requestId),
    pathOrEndpoint: `${options.bffUrl}/query`,
    requestId: response.requestId,
    message: `failure sample status=${response.status}`,
    suggestion:
      response.status >= 400 ? undefined : "检查 BFF 参数校验链，危险 table 名应返回错误。"
  });
}

async function callQuery(
  options: E2eOptions,
  input: { tenantId: string; userId: string; keyword: string; requestId: string }
): Promise<HttpResult> {
  return requestJson(`${options.bffUrl}/query`, input.requestId, {
    table: "orders",
    fields: ["id", "owner", "status", "tenant_id", "created_by"],
    filters: {
      keyword: input.keyword,
      status: "active"
    },
    tenantId: input.tenantId,
    userId: input.userId,
    roles: options.roles,
    limit: 100
  });
}

async function callMutation(options: E2eOptions, requestId: string, payload: Record<string, unknown>): Promise<HttpResult> {
  return requestJson(`${options.bffUrl}/mutation`, requestId, payload);
}

async function requestJson(url: string, requestId: string, payload: Record<string, unknown>): Promise<HttpResult> {
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId
    },
    body: JSON.stringify(payload)
  });
  const headerRequestId = response.headers.get("x-request-id") ?? requestId;
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return {
    status: response.status,
    json: parsed,
    requestId: headerRequestId
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runCheck(
  step: string,
  pathOrEndpoint: string,
  checks: E2eCheckResult[],
  runner: () => Promise<void>
): Promise<void> {
  try {
    await runner();
  } catch (error) {
    checks.push({
      step,
      ok: false,
      pathOrEndpoint,
      message: error instanceof Error ? error.message : "check failed",
      suggestion: "检查 BFF 可达性、请求参数和服务日志后重试。"
    });
  }
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  const data = asObject(payload);
  const rows = data["rows"];
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "app";
}

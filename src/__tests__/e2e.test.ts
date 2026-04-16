import assert from "node:assert/strict";
import test from "node:test";
import { executeE2e } from "../core/e2e";
import type { AppDslV1 } from "../types/app-dsl";

const demoDsl: AppDslV1 = {
  version: "app-dsl.v1",
  app: {
    id: "demo-app",
    name: "Demo App",
    version: "0.1.0"
  },
  tenants: [
    { id: "tenant-a", name: "Tenant A" },
    { id: "tenant-b", name: "Tenant B" }
  ],
  roles: [{ id: "manager", name: "Manager", scopes: ["DEPT_AND_CHILDREN"] }],
  resources: [{ id: "orders-query", name: "Orders Query", method: "query", endpoint: "/query" }],
  pages: [{ id: "orders-page", title: "Orders", route: "/orders", resources: ["orders-query"] }]
};

test("executeE2e writes report and returns all checks ok with mock fetch", async () => {
  const originalFetch = globalThis.fetch;
  const orders = new Map<string, Record<string, unknown>>([
    ["SO-A1001", { id: "SO-A1001", tenant_id: "tenant-a", owner: "A-Owner", status: "active" }],
    ["SO-B1001", { id: "SO-B1001", tenant_id: "tenant-b", owner: "B-Owner", status: "active" }]
  ]);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const headers = new Headers({ "content-type": "application/json" });
    const requestId = String(new Headers(init?.headers).get("x-request-id") ?? "mock-request");
    headers.set("x-request-id", requestId);

    if (url.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    if (url.endsWith("/query")) {
      if (String(body["table"]) === "orders;drop") {
        return new Response(JSON.stringify({ message: "bad table" }), { status: 400, headers });
      }
      const tenantId = String(body["tenantId"] ?? "");
      const filters = (body["filters"] ?? {}) as Record<string, unknown>;
      const keyword = String(filters["keyword"] ?? "");
      const rows = Array.from(orders.values()).filter((row) => {
        const id = String(row.id ?? "");
        return String(row.tenant_id) === tenantId && id.includes(keyword);
      });
      return new Response(JSON.stringify({ rows }), { status: 200, headers });
    }

    if (url.endsWith("/mutation")) {
      const operation = String(body["operation"] ?? "");
      if (operation === "create") {
        const data = (body["data"] ?? {}) as Record<string, unknown>;
        const id = String(data["id"] ?? "");
        if (orders.has(id)) {
          return new Response(JSON.stringify({ message: "duplicate" }), { status: 409, headers });
        }
        const row = {
          id,
          tenant_id: String(body["tenantId"] ?? ""),
          owner: data["owner"] ?? null,
          status: data["status"] ?? "active"
        };
        orders.set(id, row);
        return new Response(JSON.stringify({ rowCount: 1, row }), { status: 201, headers });
      }

      if (operation === "delete") {
        const key = (body["key"] ?? {}) as Record<string, unknown>;
        const id = String(key["id"] ?? "");
        const row = orders.get(id) ?? null;
        if (!row) {
          return new Response(JSON.stringify({ rowCount: 0, row: null }), { status: 404, headers });
        }
        orders.delete(id);
        return new Response(JSON.stringify({ rowCount: 1, row }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ message: "unsupported" }), { status: 400, headers });
  }) as typeof fetch;

  try {
    const outDir = `test-core-e2e-${Date.now()}`;
    const result = await executeE2e({
      dsl: demoDsl,
      requestedOut: outDir,
      options: {
        bffUrl: "http://mock-bff",
        tenantA: "tenant-a",
        tenantB: "tenant-b",
        userId: "demo-tenant-a-user",
        tenantBUserId: "demo-tenant-b-user",
        roles: ["USER"]
      }
    });

    assert.equal(result.report.version, "e2e-report.v1");
    assert.equal(result.report.checks.length >= 6, true);
    assert.equal(result.report.checks.every((item) => item.ok), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

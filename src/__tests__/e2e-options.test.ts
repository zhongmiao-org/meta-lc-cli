import assert from "node:assert/strict";
import test from "node:test";
import { resolveE2eOptions } from "../commands/e2e";

test("resolveE2eOptions prefers CLI args over env and defaults", () => {
  process.env["LC_E2E_BFF_URL"] = "http://env-host:7000";
  process.env["LC_E2E_ROLES"] = "USER,SUPER_ADMIN";
  const options = resolveE2eOptions({
    file: "demo.json",
    jsonMode: false,
    bffUrl: "http://cli-host:6000",
    tenantA: "tenant-x",
    tenantB: "tenant-y",
    userId: "u-x",
    roles: "MANAGER,STAFF"
  });

  assert.equal(options.bffUrl, "http://cli-host:6000");
  assert.equal(options.tenantA, "tenant-x");
  assert.equal(options.tenantB, "tenant-y");
  assert.equal(options.userId, "u-x");
  assert.deepEqual(options.roles, ["MANAGER", "STAFF"]);
});

test("resolveE2eOptions falls back to defaults when no env or args", () => {
  delete process.env["LC_E2E_BFF_URL"];
  delete process.env["LC_E2E_TENANT_A"];
  delete process.env["LC_E2E_TENANT_B"];
  delete process.env["LC_E2E_USER_ID"];
  delete process.env["LC_E2E_ROLES"];
  delete process.env["LC_E2E_TENANT_B_USER_ID"];

  const options = resolveE2eOptions({
    file: "demo.json",
    jsonMode: false
  });
  assert.equal(options.bffUrl, "http://localhost:6000");
  assert.equal(options.tenantA, "tenant-a");
  assert.equal(options.tenantB, "tenant-b");
  assert.equal(options.userId, "demo-tenant-a-user");
  assert.equal(options.tenantBUserId, "demo-tenant-b-user");
  assert.deepEqual(options.roles, ["USER"]);
});

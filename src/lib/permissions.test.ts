import { describe, expect, it } from "vitest";
import { canReadApi, canWriteApi } from "./permissions";

describe("canWriteApi", () => {
  it("restricts user management to ADMIN", () => {
    expect(canWriteApi("/api/users/123", "ADMIN")).toBe(true);
    expect(canWriteApi("/api/users", "AGENT")).toBe(false);
  });

  it("allows accountants to write transactions and settlements", () => {
    expect(canWriteApi("/api/transactions/1", "ACCOUNTANT")).toBe(true);
    expect(canWriteApi("/api/owner-settlements", "ACCOUNTANT")).toBe(true);
  });

  it("allows maintenance to write issues but not clients", () => {
    expect(canWriteApi("/api/issues/1", "MAINTENANCE")).toBe(true);
    expect(canWriteApi("/api/clients/1", "MAINTENANCE")).toBe(false);
  });

  it("allows assistants to write clients", () => {
    expect(canWriteApi("/api/clients", "ASSISTANT")).toBe(true);
  });
});

describe("canReadApi", () => {
  it("restricts users and audit reads", () => {
    expect(canReadApi("/api/users", "AGENT")).toBe(false);
    expect(canReadApi("/api/audit", "AGENT")).toBe(false);
    expect(canReadApi("/api/audit", "ACCOUNTANT")).toBe(true);
  });

  it("allows general resources for any authenticated role", () => {
    expect(canReadApi("/api/properties", "MAINTENANCE")).toBe(true);
    expect(canReadApi("/api/dashboard", "ASSISTANT")).toBe(true);
  });
});

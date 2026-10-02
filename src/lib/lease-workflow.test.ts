import { describe, expect, it } from "vitest";
import {
  assertCreatableStatus,
  assertDateOrder,
  assertGuarantor,
  assertStatusTransition,
  assertTenantEligible,
  isLeaseActive,
  normalizeContractStatus,
} from "./lease-workflow";

describe("normalizeContractStatus", () => {
  it("maps IN_REVIEW to PENDING_SIGNATURE", () => {
    expect(normalizeContractStatus("IN_REVIEW")).toBe("PENDING_SIGNATURE");
  });

  it("throws on unknown status", () => {
    expect(() => normalizeContractStatus("BOGUS")).toThrow();
  });
});

describe("assertCreatableStatus", () => {
  it("allows DRAFT and PENDING_SIGNATURE", () => {
    expect(() => assertCreatableStatus("DRAFT")).not.toThrow();
    expect(() => assertCreatableStatus("PENDING_SIGNATURE")).not.toThrow();
  });

  it("rejects ACTIVE on creation", () => {
    expect(() => assertCreatableStatus("ACTIVE")).toThrow();
  });
});

describe("assertStatusTransition", () => {
  it("blocks activation without signature", () => {
    expect(() => assertStatusTransition("DRAFT", "ACTIVE")).toThrow();
  });

  it("allows activation from DRAFT via signature", () => {
    expect(() => assertStatusTransition("DRAFT", "ACTIVE", true)).not.toThrow();
  });

  it("allows activation from PENDING_SIGNATURE via signature", () => {
    expect(() => assertStatusTransition("PENDING_SIGNATURE", "ACTIVE", true)).not.toThrow();
  });

  it("rejects signing from an active/terminal state", () => {
    expect(() => assertStatusTransition("ACTIVE", "ACTIVE", true)).not.toThrow();
    expect(() => assertStatusTransition("EXPIRED", "ACTIVE", true)).toThrow();
  });

  it("allows DRAFT -> PENDING_SIGNATURE and cancelling", () => {
    expect(() => assertStatusTransition("DRAFT", "PENDING_SIGNATURE")).not.toThrow();
    expect(() => assertStatusTransition("DRAFT", "CANCELLED")).not.toThrow();
  });

  it("rejects invalid transitions from terminal states", () => {
    expect(() => assertStatusTransition("TERMINATED", "ACTIVE")).toThrow();
    expect(() => assertStatusTransition("CANCELLED", "DRAFT")).toThrow();
  });
});

describe("assertDateOrder", () => {
  it("accepts valid order", () => {
    expect(() => assertDateOrder(new Date("2026-01-01"), new Date("2026-02-01"))).not.toThrow();
  });

  it("rejects equal or inverted dates", () => {
    const d = new Date("2026-01-01");
    expect(() => assertDateOrder(d, d)).toThrow();
    expect(() => assertDateOrder(new Date("2026-03-01"), new Date("2026-01-01"))).toThrow();
  });
});

describe("assertGuarantor", () => {
  it("requires a name when required", () => {
    expect(() => assertGuarantor(true, "")).toThrow();
    expect(() => assertGuarantor(true, "Ana")).not.toThrow();
  });

  it("does nothing when not required", () => {
    expect(() => assertGuarantor(false)).not.toThrow();
  });
});

describe("assertTenantEligible", () => {
  const base = { role: "TENANT", status: "ACTIVE", deletedAt: null };

  it("accepts an active tenant", () => {
    expect(() => assertTenantEligible(base)).not.toThrow();
  });

  it("rejects missing, non-tenant, blacklisted and inactive", () => {
    expect(() => assertTenantEligible(null)).toThrow();
    expect(() => assertTenantEligible({ ...base, role: "OWNER" })).toThrow();
    expect(() => assertTenantEligible({ ...base, status: "BLACKLISTED" })).toThrow();
    expect(() => assertTenantEligible({ ...base, status: "INACTIVE" })).toThrow();
    expect(() => assertTenantEligible({ ...base, deletedAt: new Date() })).toThrow();
  });
});

describe("isLeaseActive", () => {
  it("only ACTIVE counts as active", () => {
    expect(isLeaseActive("ACTIVE")).toBe(true);
    expect(isLeaseActive("DRAFT")).toBe(false);
    expect(isLeaseActive("PENDING_SIGNATURE")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calculateLateFee, calculateLeaseBalance } from "./lease-balance";

const start = new Date("2026-01-01T00:00:00.000Z");
const end = new Date("2026-12-31T00:00:00.000Z");

describe("calculateLateFee", () => {
  it("returns 0 when type is NONE or missing", () => {
    expect(calculateLateFee(1000, 60, { type: "NONE" })).toBe(0);
    expect(calculateLateFee(1000, 60, undefined)).toBe(0);
  });

  it("returns 0 when debt is zero", () => {
    expect(calculateLateFee(0, 60, { type: "FIXED", value: 50 })).toBe(0);
  });

  it("returns fixed amount regardless of days", () => {
    expect(calculateLateFee(1000, 60, { type: "FIXED", value: 50 })).toBe(50);
  });

  it("computes daily percentage excluding grace days", () => {
    // 1000 * 0.1% * (40 - 10) = 30
    expect(calculateLateFee(1000, 40, { type: "PERCENT_DAILY", value: 0.1, graceDays: 10 })).toBe(30);
  });

  it("computes monthly percentage prorated by days", () => {
    // 1000 * 2% * (30/30) = 20
    expect(calculateLateFee(1000, 30, { type: "PERCENT_MONTHLY", value: 2 })).toBe(20);
  });

  it("returns 0 when within grace period", () => {
    expect(calculateLateFee(1000, 5, { type: "PERCENT_DAILY", value: 1, graceDays: 10 })).toBe(0);
  });
});

describe("calculateLeaseBalance with late fees", () => {
  const referenceDate = new Date("2026-04-01T00:00:00.000Z");

  it("adds late fee to totalDue", () => {
    const balance = calculateLeaseBalance(
      start,
      end,
      1000,
      [{ category: "RENT_CANON", amount: 0, paymentDate: start, status: "PAID", currency: "USD" }],
      referenceDate,
      "USD",
      { type: "FIXED", value: 100 },
    );
    expect(balance.debtAmount).toBe(3000);
    expect(balance.lateFeeAmount).toBe(100);
    expect(balance.totalDue).toBe(3100);
  });

  it("keeps late fee at 0 without config", () => {
    const balance = calculateLeaseBalance(start, end, 1000, [], referenceDate, "USD");
    expect(balance.lateFeeAmount).toBe(0);
    expect(balance.totalDue).toBe(balance.debtAmount);
  });
});

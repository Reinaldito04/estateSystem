import { describe, expect, it } from "vitest";
import {
  buildMonthlyCashflow,
  collectionRate,
  computeConversion,
  computeDelta,
  debtBucketForDays,
  monthSpanWithin,
  parseDashboardRange,
  periodWindow,
  pickPrimaryCurrency,
  rangeMonths,
  summarizeTransactions,
} from "./dashboard";

const now = new Date("2026-06-15T12:00:00.000Z");

describe("parseDashboardRange", () => {
  it("accepts known ranges", () => {
    expect(parseDashboardRange("3m")).toBe("3m");
    expect(parseDashboardRange("12m")).toBe("12m");
  });

  it("falls back to the default for unknown values", () => {
    expect(parseDashboardRange("all")).toBe("6m");
    expect(parseDashboardRange(null)).toBe("6m");
  });

  it("maps ranges to month counts", () => {
    expect(rangeMonths("3m")).toBe(3);
    expect(rangeMonths("12m")).toBe(12);
  });
});

describe("buildMonthlyCashflow", () => {
  it("buckets income and expenses by month and fills empty months", () => {
    const transactions = [
      { amount: 1000, paymentDate: new Date("2026-06-02T00:00:00Z"), category: "RENT_CANON" },
      { amount: 200, paymentDate: new Date("2026-06-10T00:00:00Z"), category: "CONDO_FEE" },
      { amount: 500, paymentDate: new Date("2026-05-05T00:00:00Z"), category: "RENT_CANON" },
      { amount: 999, paymentDate: new Date("2024-01-01T00:00:00Z"), category: "RENT_CANON" },
    ];
    const result = buildMonthlyCashflow(transactions, 3, now);
    expect(result.map((row) => row.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(result[0]).toEqual({ month: "2026-04", income: 0, expenses: 0, net: 0 });
    expect(result[1].income).toBe(500);
    expect(result[2].income).toBe(1000);
    expect(result[2].expenses).toBe(200);
    expect(result[2].net).toBe(800);
  });
});

describe("summarizeTransactions", () => {
  it("splits income and expenses and groups by category, method and currency", () => {
    const summary = summarizeTransactions([
      { amount: 1000, currency: "USD", category: "RENT_CANON", paymentMethod: "Transferencia" },
      { amount: 300, currency: "USD", category: "SECURITY_DEPOSIT", paymentMethod: "Zelle" },
      { amount: 50, currency: "USD", category: "ELECTRICITY", paymentMethod: "Efectivo" },
      { amount: 25, currency: "USD", category: "INTERNET", paymentMethod: "Efectivo" },
    ]);
    expect(summary.income).toBe(1300);
    expect(summary.expenses).toBe(75);
    expect(summary.net).toBe(1225);
    expect(summary.byCategory[0]).toEqual({ key: "RENT_CANON", total: 1000 });
    expect(summary.byMethod.find((row) => row.key === "Efectivo")?.total).toBe(75);
    expect(summary.byCurrency).toEqual([{ key: "USD", total: 1375 }]);
  });
});

describe("debtBucketForDays", () => {
  it("classifies overdue days", () => {
    expect(debtBucketForDays(0)).toBeNull();
    expect(debtBucketForDays(10)).toBe("days30");
    expect(debtBucketForDays(45)).toBe("days60");
    expect(debtBucketForDays(80)).toBe("days90");
    expect(debtBucketForDays(120)).toBe("over90");
  });
});

describe("collectionRate", () => {
  it("returns a percentage and avoids division by zero", () => {
    expect(collectionRate(1000, 750)).toBe(75);
    expect(collectionRate(0, 0)).toBe(0);
  });
});

describe("pickPrimaryCurrency", () => {
  it("picks the most frequent currency", () => {
    expect(pickPrimaryCurrency({ USD: 2, EUR: 5, MXN: 1 })).toBe("EUR");
    expect(pickPrimaryCurrency({})).toBe("USD");
  });
});

describe("computeConversion", () => {
  it("computes rate between consecutive funnel steps", () => {
    const rates = computeConversion([
      { key: "interest", label: "Interesados", count: 100 },
      { key: "visit", label: "Visitas", count: 40 },
      { key: "reservation", label: "Reservas", count: 10 },
      { key: "lease", label: "Contratos", count: 5 },
    ]);
    expect(rates).toEqual([40, 25, 50]);
  });

  it("returns zero when a step is empty", () => {
    const rates = computeConversion([
      { key: "a", label: "A", count: 0 },
      { key: "b", label: "B", count: 3 },
    ]);
    expect(rates).toEqual([0]);
  });
});

describe("periodWindow", () => {
  it("returns the current window and the equivalent previous window", () => {
    const window = periodWindow(6, now);
    expect(window.currentStart.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(window.previousStart.toISOString().slice(0, 10)).toBe("2025-07-01");
    expect(window.previousEnd.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("scales the previous window with the range", () => {
    const window = periodWindow(3, now);
    expect(window.currentStart.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(window.previousStart.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});

describe("monthSpanWithin", () => {
  it("counts inclusive months between two dates", () => {
    expect(monthSpanWithin(new Date(2026, 0, 1), new Date(2026, 5, 15))).toBe(6);
    expect(monthSpanWithin(new Date(2026, 2, 10), new Date(2026, 4, 2))).toBe(3);
  });

  it("returns zero when the range is inverted", () => {
    expect(monthSpanWithin(new Date(2026, 5, 1), new Date(2026, 0, 1))).toBe(0);
  });
});

describe("computeDelta", () => {
  it("computes percentage change", () => {
    expect(computeDelta(120, 100)).toBe(20);
    expect(computeDelta(80, 100)).toBe(-20);
  });

  it("returns null when there is no comparable base", () => {
    expect(computeDelta(50, 0)).toBeNull();
    expect(computeDelta(0, 0)).toBe(0);
  });
});

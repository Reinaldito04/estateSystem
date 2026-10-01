import { describe, expect, it } from "vitest";
import { nextDueDate } from "./task-schedule";

const base = new Date("2026-01-15T10:00:00.000Z");

describe("nextDueDate", () => {
  it("returns null for ONCE", () => {
    expect(nextDueDate(base, "ONCE")).toBeNull();
  });

  it("adds one week for WEEKLY", () => {
    const result = nextDueDate(base, "WEEKLY");
    expect(result?.toISOString().slice(0, 10)).toBe("2026-01-22");
  });

  it("adds one month for MONTHLY", () => {
    const result = nextDueDate(base, "MONTHLY");
    expect(result?.toISOString().slice(0, 10)).toBe("2026-02-15");
  });

  it("respects interval count for QUARTERLY", () => {
    const result = nextDueDate(base, "QUARTERLY", 3);
    expect(result?.toISOString().slice(0, 10)).toBe("2026-10-15");
  });

  it("adds one year for ANNUAL", () => {
    const result = nextDueDate(base, "ANNUAL");
    expect(result?.toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});

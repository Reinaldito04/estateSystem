import { describe, expect, it } from "vitest";
import { buildSequenceKey, formatDocumentNumber } from "./document-sequence";

describe("buildSequenceKey", () => {
  it("includes the year in key and prefix for receipts", () => {
    const { sequenceKey, prefix } = buildSequenceKey("RECEIPT", new Date(2026, 4, 10, 12));
    expect(sequenceKey).toBe("RECEIPT-2026");
    expect(prefix).toBe("REC-2026-");
  });

  it("uses LIQ prefix for settlements", () => {
    const { prefix } = buildSequenceKey("OWNER_SETTLEMENT", new Date(2027, 0, 15, 12));
    expect(prefix).toBe("LIQ-2027-");
  });
});

describe("formatDocumentNumber", () => {
  it("pads the value to 4 digits", () => {
    expect(formatDocumentNumber("RECEIPT", "REC-2026-", 1)).toBe("REC-2026-0001");
    expect(formatDocumentNumber("RECEIPT", "REC-2026-", 42)).toBe("REC-2026-0042");
  });

  it("does not truncate values beyond the width", () => {
    expect(formatDocumentNumber("OWNER_SETTLEMENT", "LIQ-2026-", 12345)).toBe("LIQ-2026-12345");
  });
});

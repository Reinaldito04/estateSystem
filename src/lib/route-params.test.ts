import { describe, expect, it } from "vitest";
import { isUuid } from "./route-params";

describe("isUuid", () => {
  it("accepts valid UUIDs", () => {
    expect(isUuid("7b675a59-a9ec-40a8-86f4-8f28786ccf2e")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isUuid("7B675A59-A9EC-40A8-86F4-8F28786CCF2E")).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuid("1000")).toBe(false);
    expect(isUuid("all")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("7b675a59-a9ec-40a8-86f4-8f28786ccf2")).toBe(false);
    expect(isUuid("7b675a59a9ec40a886f48f28786ccf2e")).toBe(false);
    expect(isUuid("7b675a59-a9ec-40a8-86f4-8f28786ccf2g")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

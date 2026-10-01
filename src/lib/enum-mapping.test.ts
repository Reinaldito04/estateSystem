import { describe, expect, it } from "vitest";
import {
  interestStatusToUi,
  toClientStatus,
  toInterestStatus,
  toPropertyStatus,
  toReferenceType,
  toVisitStatus,
  visitStatusToUi,
} from "./enum-mapping";

describe("enum-mapping property status", () => {
  it("maps UI values to enums", () => {
    expect(toPropertyStatus("available")).toBe("AVAILABLE");
    expect(toPropertyStatus("occupied")).toBe("RENTED");
    expect(toPropertyStatus("suspended")).toBe("INACTIVE");
  });
});

describe("enum-mapping visits and interests", () => {
  it("maps visit statuses both ways", () => {
    expect(toVisitStatus("scheduled")).toBe("SCHEDULED");
    expect(toVisitStatus("no_show")).toBe("NO_SHOW");
    expect(visitStatusToUi("NO_SHOW")).toBe("no_show");
  });

  it("maps interest statuses both ways", () => {
    expect(toInterestStatus("visit_scheduled")).toBe("VISITING");
    expect(toInterestStatus("lost")).toBe("DISCARDED");
    expect(interestStatusToUi("VISITING")).toBe("visit_scheduled");
  });
});

describe("enum-mapping clients and references", () => {
  it("normalizes client statuses", () => {
    expect(toClientStatus("lead")).toBe("ACTIVE");
    expect(toClientStatus("blacklisted")).toBe("BLACKLISTED");
  });

  it("normalizes reference types", () => {
    expect(toReferenceType("LABORAL")).toBe("LABOR");
    expect(toReferenceType("PROFESSIONAL")).toBe("COMMERCIAL");
  });
});

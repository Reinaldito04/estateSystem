import { describe, expect, it } from "vitest";
import { csvToObjects, detectDelimiter, parseCsv } from "./csv";

describe("detectDelimiter", () => {
  it("detects semicolon and comma", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
});

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const rows = parseCsv("a,b\n1,2\n3,4");
    expect(rows).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("handles quoted values with delimiters and escaped quotes", () => {
    const rows = parseCsv('name,note\n"Pérez, Ana","Dijo ""hola"""');
    expect(rows[1]).toEqual(["Pérez, Ana", 'Dijo "hola"']);
  });

  it("supports semicolon delimiter and skips empty lines", () => {
    const rows = parseCsv("a;b\n1;2\n\n3;4");
    expect(rows).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("strips the BOM", () => {
    const rows = parseCsv("\uFEFFa,b\n1,2");
    expect(rows[0]).toEqual(["a", "b"]);
  });
});

describe("csvToObjects", () => {
  it("maps header names to values and fills missing columns", () => {
    const objects = csvToObjects("fullName;phone;email\nAna;555;ana@x.com\nLuis;556");
    expect(objects).toEqual([
      { fullName: "Ana", phone: "555", email: "ana@x.com" },
      { fullName: "Luis", phone: "556", email: "" },
    ]);
  });
});

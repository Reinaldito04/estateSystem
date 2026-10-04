import { describe, expect, it } from "vitest";
import { COMMUNICATION_TEMPLATES, renderTemplateString } from "./communication-templates";

describe("renderTemplateString", () => {
  it("replaces known variables", () => {
    expect(renderTemplateString("Hola {{nombre}}, bienvenido", { nombre: "Ana" })).toBe("Hola Ana, bienvenido");
  });

  it("handles whitespace inside braces", () => {
    expect(renderTemplateString("Hola {{ nombre }}", { nombre: "Luis" })).toBe("Hola Luis");
  });

  it("keeps unknown placeholders untouched", () => {
    expect(renderTemplateString("Hola {{nombre}} {{otro}}", { nombre: "Ana" })).toBe("Hola Ana {{otro}}");
  });
});

describe("COMMUNICATION_TEMPLATES", () => {
  it("exposes unique ids with subject and content", () => {
    const ids = COMMUNICATION_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COMMUNICATION_TEMPLATES.every((template) => template.subject && template.content)).toBe(true);
  });
});

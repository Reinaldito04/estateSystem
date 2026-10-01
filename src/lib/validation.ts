import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function validationError(error: ZodError) {
  const fields = zodFieldErrors(error);
  const first = error.issues[0]?.message || "Datos inválidos";
  return NextResponse.json({ error: first, fields }, { status: 400 });
}

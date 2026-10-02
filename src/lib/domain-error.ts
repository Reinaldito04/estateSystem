import { NextResponse } from "next/server";
import { z } from "zod";
import { validationError } from "@/lib/validation";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export function handleRouteError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return validationError(error);
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { validationError } from "@/lib/validation";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function notFoundResponse(message = "Recurso no encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function handleRouteError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return validationError(error);
  if (error instanceof NotFoundError) return notFoundResponse(error.message);
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return notFoundResponse();
    if (error.code === "P2023") {
      return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
    }
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const keySchema = z.object({
  holderName: z.string().min(1, "Responsable es requerido"),
  holderRole: z.string().min(1, "Rol es requerido"),
  keyCount: z.number().int().min(1).default(1),
  accessCode: z.string().optional(),
  notes: z.string().optional(),
  assignedAt: z.string().transform((value) => new Date(value)).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFoundResponse();
  const keys = await prisma.propertyKey.findMany({ where: { propertyId: id }, orderBy: { assignedAt: "desc" } });
  return NextResponse.json({ data: keys });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const body = keySchema.parse(await request.json());
    const key = await prisma.propertyKey.create({ data: { ...body, propertyId: id } });
    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    return NextResponse.json({ error: "Error al registrar llaves" }, { status: 500 });
  }
}
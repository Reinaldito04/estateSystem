import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const keyUpdateSchema = z.object({
  returnedAt: z.string().transform((value) => new Date(value)).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  try {
    const { id, keyId } = await params;
    const body = keyUpdateSchema.parse(await request.json());
    const key = await prisma.propertyKey.updateMany({ where: { id: keyId, propertyId: id }, data: body });
    if (key.count === 0) return NextResponse.json({ error: "Registro de llaves no encontrado" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar llaves" }, { status: 500 });
  }
}
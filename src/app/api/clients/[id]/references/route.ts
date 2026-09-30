import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const referenceSchema = z.object({
  referenceType: z.string().default("PERSONAL"),
  fullName: z.string().min(1, "El nombre es requerido"),
  relationship: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true } });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const body = referenceSchema.parse(await request.json());
    const reference = await prisma.clientReference.create({
      data: {
        clientId: id,
        referenceType: body.referenceType,
        fullName: body.fullName,
        relationship: body.relationship || null,
        company: body.company || null,
        phone: body.phone || null,
        email: body.email || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(reference, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating client reference:", error);
    return NextResponse.json({ error: "Error al crear la referencia" }, { status: 500 });
  }
}

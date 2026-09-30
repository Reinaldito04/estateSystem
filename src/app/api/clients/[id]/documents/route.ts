import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const riskDocumentSchema = z.object({
  documentType: z.enum(["INCOME_PROOF", "PERSONAL_REFERENCE", "LABOR_REFERENCE", "CREDIT_REPORT"]),
  title: z.string().min(1, "El título es requerido"),
  fileUrl: z.string().url("URL inválida"),
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

    const body = riskDocumentSchema.parse(await request.json());
    const document = await prisma.clientRiskDocument.create({
      data: {
        clientId: id,
        documentType: body.documentType,
        title: body.title,
        fileUrl: body.fileUrl,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating client document:", error);
    return NextResponse.json({ error: "Error al crear el documento" }, { status: 500 });
  }
}

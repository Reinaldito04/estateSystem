import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const riskDocumentSchema = z.object({
  documentType: z.enum(["INCOME_PROOF", "PERSONAL_REFERENCE", "LABOR_REFERENCE", "CREDIT_REPORT"]),
  title: z.string().min(1, "El título es requerido"),
  fileUrl: z.string().min(1, "El archivo es requerido"),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.clientRiskDocument.findMany({
      where: { clientId: id },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json({ data: documents });
  } catch (error) {
    console.error("Error fetching client documents:", error);
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 });
  }
}

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = new URL(request.url).searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId es requerido" }, { status: 400 });
    }
    const result = await prisma.clientRiskDocument.deleteMany({ where: { id: documentId, clientId: id } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client document:", error);
    return NextResponse.json({ error: "Error al eliminar el documento" }, { status: 500 });
  }
}

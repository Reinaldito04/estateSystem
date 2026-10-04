import { notFoundResponse, handleRouteError } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertDocumentEntity, documentRelationData } from "@/lib/document-entity";

const documentUpdateSchema = z
  .object({
    documentName: z.string().min(1).optional(),
    fileUrl: z.string().min(1).optional(),
    entityType: z.enum(["OWNER", "TENANT", "PROPERTY", "LEASE"]).optional(),
    entityId: z.string().uuid().optional(),
  })
  .refine((data) => (data.entityType === undefined) === (data.entityId === undefined), {
    message: "El tipo y la entidad deben indicarse juntos",
    path: ["entityType"],
  });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const document = await prisma.entityDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Error al obtener documento" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const validatedData = documentUpdateSchema.parse(await request.json());

    const { entityType, entityId, ...fields } = validatedData;
    const data: Record<string, unknown> = { ...fields };

    if (entityType && entityId) {
      await assertDocumentEntity(entityType, entityId);
      Object.assign(data, documentRelationData(entityType, entityId));
    }

    const document = await prisma.entityDocument.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...document,
      entityId: document.clientId ?? document.propertyId ?? document.leaseId ?? null,
    });
  } catch (error) {
    return handleRouteError(error, "Error al actualizar documento");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    await prisma.entityDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Error al eliminar documento" }, { status: 500 });
  }
}

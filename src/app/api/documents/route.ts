import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ENTITY_FIELD = {
  OWNER: "clientId",
  TENANT: "clientId",
  PROPERTY: "propertyId",
  LEASE: "leaseId",
} as const;

type EntityKind = keyof typeof ENTITY_FIELD;

const documentSchema = z.object({
  entityType: z.enum(["OWNER", "TENANT", "PROPERTY", "LEASE"]),
  entityId: z.string().uuid("ID de entidad es requerido"),
  documentName: z.string().min(1, "Nombre del documento es requerido"),
  fileUrl: z.string().min(1, "URL del archivo es requerida"),
  uploadedById: z.string().uuid().optional(),
});

type DocumentRecord = {
  clientId: string | null;
  propertyId: string | null;
  leaseId: string | null;
};

function withEntityId<T extends DocumentRecord>(document: T) {
  return {
    ...document,
    entityId: document.clientId ?? document.propertyId ?? document.leaseId ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") as EntityKind | null;
    const entityId = searchParams.get("entityId");

    const where = {
      ...(entityType && { entityType }),
      ...(entityId && {
        OR: [{ clientId: entityId }, { propertyId: entityId }, { leaseId: entityId }],
      }),
    };

    const documents = await prisma.entityDocument.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ data: documents.map(withEntityId) });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Error al obtener documentos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = documentSchema.parse(body);

    const relationField = ENTITY_FIELD[validatedData.entityType];

    const document = await prisma.entityDocument.create({
      data: {
        entityType: validatedData.entityType,
        documentName: validatedData.documentName,
        fileUrl: validatedData.fileUrl,
        uploadedById: validatedData.uploadedById,
        [relationField]: validatedData.entityId,
      },
    });

    return NextResponse.json(withEntityId(document), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Error al crear documento" }, { status: 500 });
  }
}

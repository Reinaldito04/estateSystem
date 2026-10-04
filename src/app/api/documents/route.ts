import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import { DomainError, handleRouteError } from "@/lib/domain-error";

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
    const entityTypeParam = searchParams.get("entityType");
    const entityType = (Object.keys(ENTITY_FIELD) as EntityKind[]).includes(entityTypeParam as EntityKind)
      ? (entityTypeParam as EntityKind)
      : null;
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

    await assertDocumentEntity(validatedData.entityType, validatedData.entityId);
    const relationField = ENTITY_FIELD[validatedData.entityType];

    const user = await getCurrentUser();
    const document = await prisma.entityDocument.create({
      data: {
        entityType: validatedData.entityType,
        documentName: validatedData.documentName,
        fileUrl: validatedData.fileUrl,
        uploadedById: user?.id ?? null,
        [relationField]: validatedData.entityId,
      },
    });

    return NextResponse.json(withEntityId(document), { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Error al crear documento");
  }
}

async function assertDocumentEntity(entityType: EntityKind, entityId: string) {
  if (entityType === "PROPERTY") {
    const property = await prisma.property.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
    if (!property) throw new DomainError("Inmueble no encontrado");
    return;
  }
  if (entityType === "LEASE") {
    const lease = await prisma.lease.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
    if (!lease) throw new DomainError("Contrato no encontrado");
    return;
  }
  const client = await prisma.clientProfile.findFirst({
    where: { id: entityId, deletedAt: null, ...(entityType === "OWNER" ? { role: "OWNER" } : { role: "TENANT" }) },
    select: { id: true },
  });
  if (!client) throw new DomainError(entityType === "OWNER" ? "Propietario no encontrado" : "Inquilino no encontrado");
}

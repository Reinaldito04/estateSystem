import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";

export const DOCUMENT_ENTITY_FIELD = {
  OWNER: "clientId",
  TENANT: "clientId",
  PROPERTY: "propertyId",
  LEASE: "leaseId",
} as const;

export type DocumentEntityKind = keyof typeof DOCUMENT_ENTITY_FIELD;

export async function assertDocumentEntity(entityType: DocumentEntityKind, entityId: string) {
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

export function documentRelationData(entityType: DocumentEntityKind, entityId: string) {
  const field = DOCUMENT_ENTITY_FIELD[entityType];
  return {
    entityType,
    clientId: field === "clientId" ? entityId : null,
    propertyId: field === "propertyId" ? entityId : null,
    leaseId: field === "leaseId" ? entityId : null,
  };
}

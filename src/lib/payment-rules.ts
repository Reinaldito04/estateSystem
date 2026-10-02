import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";

export async function assertTransactionLinks(propertyId: string, leaseId?: string | null) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true },
  });
  if (!property) throw new DomainError("Inmueble no encontrado");

  if (!leaseId) return;

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, deletedAt: null },
    select: { id: true, propertyId: true },
  });
  if (!lease) throw new DomainError("Contrato no encontrado");
  if (lease.propertyId !== propertyId) {
    throw new DomainError("El contrato no pertenece a este inmueble");
  }
}

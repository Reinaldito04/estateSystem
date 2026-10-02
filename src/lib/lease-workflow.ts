import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/domain-error";

export const CONTRACT_STATUS_MAP = {
  DRAFT: "DRAFT",
  IN_REVIEW: "PENDING_SIGNATURE",
  PENDING_SIGNATURE: "PENDING_SIGNATURE",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  TERMINATED: "TERMINATED",
  CANCELLED: "CANCELLED",
} as const;

export type ContractStatusValue = (typeof CONTRACT_STATUS_MAP)[keyof typeof CONTRACT_STATUS_MAP];

const STATUS_LABEL: Record<ContractStatusValue, string> = {
  DRAFT: "borrador",
  PENDING_SIGNATURE: "pendiente de firma",
  ACTIVE: "activo",
  EXPIRED: "vencido",
  TERMINATED: "terminado",
  CANCELLED: "cancelado",
};

const TRANSITIONS: Record<ContractStatusValue, ContractStatusValue[]> = {
  DRAFT: ["DRAFT", "PENDING_SIGNATURE", "CANCELLED"],
  PENDING_SIGNATURE: ["DRAFT", "PENDING_SIGNATURE", "CANCELLED"],
  ACTIVE: ["ACTIVE", "EXPIRED", "TERMINATED", "CANCELLED"],
  EXPIRED: ["EXPIRED"],
  TERMINATED: ["TERMINATED"],
  CANCELLED: ["CANCELLED"],
};

export function normalizeContractStatus(status: string): ContractStatusValue {
  const mapped = CONTRACT_STATUS_MAP[status as keyof typeof CONTRACT_STATUS_MAP];
  if (!mapped) throw new DomainError("Estado de contrato inválido");
  return mapped;
}

export function assertCreatableStatus(status: ContractStatusValue) {
  if (status !== "DRAFT" && status !== "PENDING_SIGNATURE") {
    throw new DomainError("Un contrato nuevo solo puede crearse como borrador o pendiente de firma. La activación ocurre al firmar.");
  }
}

export function assertStatusTransition(from: ContractStatusValue, to: ContractStatusValue, viaSignature = false) {
  if (to === "ACTIVE" && from !== "ACTIVE") {
    if (!viaSignature) {
      throw new DomainError("La activación solo ocurre al firmar el contrato");
    }
    if (from !== "DRAFT" && from !== "PENDING_SIGNATURE") {
      throw new DomainError("Solo se puede firmar un contrato en borrador o pendiente de firma");
    }
    return;
  }
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError(`No se puede cambiar el contrato de ${STATUS_LABEL[from]} a ${STATUS_LABEL[to]}`);
  }
}

export function isLeaseActive(status: ContractStatusValue) {
  return status === "ACTIVE";
}

export function assertDateOrder(startDate: Date, endDate: Date) {
  if (!(endDate > startDate)) {
    throw new DomainError("La fecha de fin debe ser posterior a la de inicio");
  }
}

export function assertGuarantor(required: boolean, name?: string | null) {
  if (required && !name?.trim()) {
    throw new DomainError("Debes indicar el nombre del fiador");
  }
}

export function assertTenantEligible(client: { role: string; status: string; deletedAt: Date | null } | null) {
  if (!client || client.deletedAt) throw new DomainError("El cliente seleccionado no existe");
  if (client.role !== "TENANT") throw new DomainError("El cliente seleccionado debe tener el rol Inquilino");
  if (client.status === "BLACKLISTED") throw new DomainError("El cliente está en lista negra");
  if (client.status === "INACTIVE" || client.status === "ARCHIVED") throw new DomainError("El cliente no está activo");
}

export async function loadEligibleTenant(clientProfileId: string) {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    select: {
      id: true,
      fullName: true,
      legalDocumentId: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  });
  assertTenantEligible(client);
  return client!;
}

export async function assertPropertyLeasable(propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!property) throw new DomainError("Inmueble no encontrado");
  if (property.status === "INACTIVE") throw new DomainError("El inmueble está inactivo");
  return property;
}

export async function assertNoActiveOverlap(propertyId: string, startDate: Date, endDate: Date, excludeLeaseId?: string) {
  const overlap = await prisma.lease.findFirst({
    where: {
      propertyId,
      deletedAt: null,
      contractStatus: "ACTIVE",
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeLeaseId ? { NOT: { id: excludeLeaseId } } : {}),
    },
    select: { contractNumber: true },
  });
  if (overlap) {
    throw new DomainError(`Ya hay un contrato vigente (${overlap.contractNumber}) en ese período`);
  }
}

export async function syncPropertyOccupancy(propertyId: string) {
  const activeCount = await prisma.lease.count({
    where: { propertyId, deletedAt: null, contractStatus: "ACTIVE" },
  });
  if (activeCount > 0) {
    await prisma.property.update({ where: { id: propertyId }, data: { status: "RENTED" } });
    return;
  }
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { status: true } });
  if (property?.status === "RENTED") {
    await prisma.property.update({ where: { id: propertyId }, data: { status: "AVAILABLE" } });
  }
}

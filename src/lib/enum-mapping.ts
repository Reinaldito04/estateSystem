import type {
  ClientStatus,
  ContractStatus,
  InterestStatus,
  PriceAdjustmentType,
  PropertyStatus,
  PropertyType,
  ReferenceType,
  SignatureStatus,
  VisitStatus,
} from "@prisma/client";

const normalize = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();

export function toPropertyStatus(value: string | null | undefined): PropertyStatus {
  switch (normalize(value)) {
    case "RESERVED":
    case "RESERVADO":
      return "RESERVED";
    case "RENTED":
    case "RENTADO":
    case "OCUPADO":
    case "OCCUPIED":
      return "RENTED";
    case "MAINTENANCE":
    case "MANTENIMIENTO":
      return "MAINTENANCE";
    case "INACTIVE":
    case "SUSPENDED":
    case "UNAVAILABLE":
    case "SOLD":
    case "VENDIDO":
      return "INACTIVE";
    case "AVAILABLE":
    case "DISPONIBLE":
    default:
      return "AVAILABLE";
  }
}

export function propertyStatusToUi(value: PropertyStatus): string {
  switch (value) {
    case "RESERVED":
      return "reserved";
    case "RENTED":
      return "rented";
    case "MAINTENANCE":
      return "maintenance";
    case "INACTIVE":
      return "suspended";
    case "AVAILABLE":
    default:
      return "available";
  }
}

export function toPropertyType(value: string | null | undefined): PropertyType {
  switch (normalize(value)) {
    case "HOUSE":
    case "TOWNHOUSE":
      return "HOUSE";
    case "STUDIO":
      return "STUDIO";
    case "OFFICE":
      return "OFFICE";
    case "COMMERCIAL":
      return "COMMERCIAL";
    case "WAREHOUSE":
      return "WAREHOUSE";
    case "LAND":
      return "LAND";
    case "PARKING":
      return "PARKING";
    case "OTHER":
      return "OTHER";
    case "APARTMENT":
    default:
      return "APARTMENT";
  }
}

export function toVisitStatus(value: string | null | undefined): VisitStatus {
  switch (normalize(value)) {
    case "CONFIRMED":
      return "CONFIRMED";
    case "COMPLETED":
    case "DONE":
      return "COMPLETED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "NO_SHOW":
    case "NOSHOW":
      return "NO_SHOW";
    case "SCHEDULED":
    default:
      return "SCHEDULED";
  }
}

export function visitStatusToUi(value: VisitStatus): string {
  switch (value) {
    case "CONFIRMED":
      return "confirmed";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "no_show";
    case "SCHEDULED":
    default:
      return "scheduled";
  }
}

export function toInterestStatus(value: string | null | undefined): InterestStatus {
  switch (normalize(value)) {
    case "CONTACTED":
      return "CONTACTED";
    case "VISITING":
    case "VISIT_SCHEDULED":
      return "VISITING";
    case "NEGOTIATING":
      return "NEGOTIATING";
    case "CONVERTED":
      return "CONVERTED";
    case "DISCARDED":
    case "LOST":
      return "DISCARDED";
    case "NEW":
    default:
      return "NEW";
  }
}

export function interestStatusToUi(value: InterestStatus): string {
  switch (value) {
    case "CONTACTED":
      return "contacted";
    case "VISITING":
      return "visit_scheduled";
    case "NEGOTIATING":
      return "negotiating";
    case "CONVERTED":
      return "converted";
    case "DISCARDED":
      return "lost";
    case "NEW":
    default:
      return "new";
  }
}

export function toClientStatus(value: string | null | undefined): ClientStatus {
  switch (normalize(value)) {
    case "INACTIVE":
      return "INACTIVE";
    case "BLACKLISTED":
      return "BLACKLISTED";
    case "ARCHIVED":
      return "ARCHIVED";
    case "ACTIVE":
    case "LEAD":
    default:
      return "ACTIVE";
  }
}

export function clientStatusToUi(value: ClientStatus): string {
  return value.toLowerCase();
}

export function toReferenceType(value: string | null | undefined): ReferenceType {
  switch (normalize(value)) {
    case "LABOR":
    case "LABOUR":
    case "LABORAL":
    case "WORK":
      return "LABOR";
    case "COMMERCIAL":
    case "COMERCIAL":
    case "PROFESSIONAL":
      return "COMMERCIAL";
    case "PERSONAL":
    default:
      return "PERSONAL";
  }
}

export function toContractStatus(value: string | null | undefined): ContractStatus {
  switch (normalize(value)) {
    case "IN_REVIEW":
    case "PENDING_SIGNATURE":
      return "PENDING_SIGNATURE";
    case "ACTIVE":
      return "ACTIVE";
    case "EXPIRED":
      return "EXPIRED";
    case "TERMINATED":
      return "TERMINATED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "DRAFT":
    default:
      return "DRAFT";
  }
}

export function toPriceAdjustmentType(value: string | null | undefined): PriceAdjustmentType {
  switch (normalize(value)) {
    case "IPC":
    case "INDEX":
      return "INDEX";
    case "FIXED_PERCENT":
    case "PERCENTAGE":
      return "PERCENTAGE";
    case "FIXED_AMOUNT":
      return "FIXED_AMOUNT";
    case "NONE":
    default:
      return "NONE";
  }
}

export function toSignatureStatus(value: string | null | undefined): SignatureStatus {
  switch (normalize(value)) {
    case "PENDING":
      return "PENDING";
    case "SENT":
      return "SENT";
    case "SIGNED":
      return "SIGNED";
    case "DECLINED":
    case "CANCELLED":
      return "DECLINED";
    case "EXPIRED":
      return "EXPIRED";
    case "NOT_REQUIRED":
    default:
      return "NOT_REQUIRED";
  }
}

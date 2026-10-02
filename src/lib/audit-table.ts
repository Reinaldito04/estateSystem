import { prisma } from "@/lib/prisma";
import { parsePagination, MAX_PAGE_SIZE } from "@/lib/pagination";

export const AUDIT_ENTITY_TYPES = ["Lease", "Property", "Client", "Transaction", "Issue", "Task", "Asset", "Provider", "MaintenancePlan", "User", "ContractTemplate"] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export function isValidAuditEntityType(type: string): type is AuditEntityType {
  return AUDIT_ENTITY_TYPES.includes(type as AuditEntityType);
}

export async function buildAuditWhere(
  entityType?: string,
  entityId?: string,
  action?: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (entityType) {
    if (!isValidAuditEntityType(entityType)) {
      throw new DomainError("Tipo de entidad de auditoría inválido");
    }
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  return where;
}

export type AuditLog = {
  id: string;
  createdAt: Date;
  entityType: string;
  entityId: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  changesPreview: string;
};

export function formatChanges(changes: unknown): string {
  if (!changes) return "—";
  if (typeof changes !== "object") return String(changes);
  const keys = Object.keys(changes).slice(0, 3);
  if (keys.length === 0) return "—";
  const parts = keys.map((k) => `${k}: ${String(changes[k]).slice(0, 50)}`);
  return parts.join(" | ") + (Object.keys(changes).length > 3 ? " + más" : "");
}

export async function fetchAuditLogs(
  entityType?: string,
  entityId?: string,
  action?: string,
  userId?: string,
  startDate?: Date,
  endDate?: Date,
  { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
) {
  const effectiveLimit = Math.min(limit, MAX_PAGE_SIZE);
  const { skip } = parsePagination(
    new URLSearchParams({
      page: String(page),
      limit: String(effectiveLimit),
    }),
  );

  const where = await buildAuditWhere(
    entityType,
    entityId,
    action,
    userId,
    startDate,
    endDate,
  );

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: effectiveLimit,
      skip,
      include: { user: { select: { id: true, fullName: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userName: log.user?.fullName ?? "Sistema",
      userRole: log.user?.role ?? null,
      ipAddress: log.ipAddress,
      changesPreview: formatChanges(log.changes),
    })),
    total,
    page,
    limit: effectiveLimit,
  };
}
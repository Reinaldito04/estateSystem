import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string | null;
  changes?: unknown;
  request?: Request;
};

export async function recordAudit(input: AuditInput) {
  try {
    const headers = input.request?.headers;
    const ipAddress =
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers?.get("x-real-ip") ||
      null;
    const userAgent = headers?.get("user-agent") || null;

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        changes: (input.changes ?? {}) as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("recordAudit failed:", error);
  }
}

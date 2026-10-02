import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

type AdjustmentType = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE" | "INDEX";

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  // Avoid overflow (e.g. Jan 31 -> Mar 3)
  if (result.getDate() < day) result.setDate(0);
  return result;
}

export function computeAdjustedCanon(
  currentCanon: number,
  type: AdjustmentType,
  value: number | null,
  indexRate?: number,
): number {
  switch (type) {
    case "FIXED_AMOUNT":
      return round2(currentCanon + (value ?? 0));
    case "PERCENTAGE":
      return round2(currentCanon * (1 + (value ?? 0) / 100));
    case "INDEX":
      return round2(currentCanon * (1 + (indexRate ?? value ?? 0) / 100));
    default:
      return currentCanon;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type AdjustmentRunResult = {
  processed: number;
  applied: { leaseId: string; contractNumber: string; previousCanon: number; newCanon: number }[];
  skipped: { leaseId: string; reason: string }[];
};

export async function applyPendingAdjustments(referenceDate = new Date()): Promise<AdjustmentRunResult> {
  const now = referenceDate;
  const candidates = await prisma.lease.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      priceAdjustmentType: { not: "NONE" },
      nextAdjustmentDate: { lte: now },
    },
    select: {
      id: true,
      contractNumber: true,
      monthlyCanonAmount: true,
      priceAdjustmentType: true,
      priceAdjustmentValue: true,
      nextAdjustmentDate: true,
      endDate: true,
    },
  });

  const applied: AdjustmentRunResult["applied"] = [];
  const skipped: AdjustmentRunResult["skipped"] = [];

  for (const lease of candidates) {
    if (lease.endDate < now) {
      skipped.push({ leaseId: lease.id, reason: "Contrato vencido" });
      continue;
    }

    const currentCanon = Number(lease.monthlyCanonAmount);
    const value = lease.priceAdjustmentValue === null ? null : Number(lease.priceAdjustmentValue);
    const newCanon = computeAdjustedCanon(currentCanon, lease.priceAdjustmentType as AdjustmentType, value);

    if (newCanon === currentCanon) {
      skipped.push({ leaseId: lease.id, reason: "Sin cambio de canon" });
      continue;
    }

    const nextDate = lease.nextAdjustmentDate ? addMonths(lease.nextAdjustmentDate, 12) : addMonths(now, 12);

    await prisma.$transaction(async (tx) => {
      await tx.lease.update({
        where: { id: lease.id },
        data: {
          monthlyCanonAmount: new Prisma.Decimal(newCanon),
          nextAdjustmentDate: nextDate,
        },
      });
    });

    await recordAudit({
      entityType: "Lease",
      entityId: lease.id,
      action: "UPDATE",
      changes: {
        adjustment: true,
        previousCanon: currentCanon,
        newCanon,
        nextAdjustmentDate: nextDate.toISOString(),
      },
    });

    applied.push({ leaseId: lease.id, contractNumber: lease.contractNumber, previousCanon: currentCanon, newCanon });
  }

  return { processed: candidates.length, applied, skipped };
}

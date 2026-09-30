import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const horizon = Math.min(365, Math.max(30, Number(searchParams.get("days") || 90)));
    const now = new Date();
    const until = new Date(now.getTime() + horizon * DAY);
    const [leases, adjustments, owners, tenants] = await Promise.all([
      prisma.lease.findMany({
        where: { isActive: true, endDate: { gte: now, lte: until } },
        select: { id: true, contractNumber: true, endDate: true, renewalNoticeDays: true, property: { select: { code: true, title: true } }, tenant: { select: { fullName: true } } },
        orderBy: { endDate: "asc" },
      }),
      prisma.lease.findMany({
        where: { isActive: true, nextAdjustmentDate: { gte: now, lte: until } },
        select: { id: true, contractNumber: true, nextAdjustmentDate: true, priceAdjustmentType: true, property: { select: { code: true, title: true } }, tenant: { select: { fullName: true } } },
        orderBy: { nextAdjustmentDate: "asc" },
      }),
      prisma.owner.findMany({ where: { identityDocumentExpiresAt: { gte: now, lte: until } }, select: { id: true, fullName: true, identityDocumentExpiresAt: true } }),
      prisma.tenant.findMany({ where: { identityDocumentExpiresAt: { gte: now, lte: until } }, select: { id: true, fullName: true, identityDocumentExpiresAt: true } }),
    ]);

    const alerts = [
      ...leases.map((lease) => {
        const days = Math.max(0, Math.ceil((lease.endDate.getTime() - now.getTime()) / DAY));
        return { id: `lease-expiration-${lease.id}`, kind: "LEASE_EXPIRATION", severity: days <= 30 ? "high" : "medium", dueDate: lease.endDate, days, title: `Vencimiento de ${lease.contractNumber}`, description: `${lease.property.code} · ${lease.tenant.fullName}`, leaseId: lease.id };
      }),
      ...adjustments.map((lease) => ({ id: `canon-adjustment-${lease.id}`, kind: "CANON_ADJUSTMENT", severity: "medium", dueDate: lease.nextAdjustmentDate, days: Math.max(0, Math.ceil((lease.nextAdjustmentDate!.getTime() - now.getTime()) / DAY)), title: `Reajuste de canon · ${lease.contractNumber}`, description: `${lease.property.code} · ${lease.priceAdjustmentType}`, leaseId: lease.id })),
      ...owners.map((owner) => ({ id: `owner-id-${owner.id}`, kind: "IDENTITY_EXPIRATION", severity: "medium", dueDate: owner.identityDocumentExpiresAt!, days: Math.max(0, Math.ceil((owner.identityDocumentExpiresAt!.getTime() - now.getTime()) / DAY)), title: `Vence documento de ${owner.fullName}`, description: "Propietario", entityId: owner.id })),
      ...tenants.map((tenant) => ({ id: `tenant-id-${tenant.id}`, kind: "IDENTITY_EXPIRATION", severity: "medium", dueDate: tenant.identityDocumentExpiresAt!, days: Math.max(0, Math.ceil((tenant.identityDocumentExpiresAt!.getTime() - now.getTime()) / DAY)), title: `Vence documento de ${tenant.fullName}`, description: "Inquilino", entityId: tenant.id })),
    ].sort((a, b) => (a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) - (b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY));

    return NextResponse.json({ data: alerts, horizon });
  } catch (error) {
    console.error("Error generating automated alerts:", error);
    return NextResponse.json({ error: "Error al obtener alertas automáticas" }, { status: 500 });
  }
}
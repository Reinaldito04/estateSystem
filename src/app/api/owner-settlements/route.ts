import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildOwnerSettlement } from "@/lib/owner-settlement";
import { nextDocumentNumber } from "@/lib/document-sequence";
import { recordAudit } from "@/lib/audit";
import { handleRouteError } from "@/lib/domain-error";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  ownerId: z.string().uuid("Propietario inválido"),
  periodStart: z.string().min(1, "Fecha de inicio requerida"),
  periodEnd: z.string().min(1, "Fecha de fin requerida"),
  currency: z.string().default("USD"),
  commissionRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId") || "";
    const status = searchParams.get("status") || "";

    const settlements = await prisma.ownerSettlement.findMany({
      where: {
        ...(ownerId && { ownerId }),
        ...(status && { status: status as never }),
      },
      orderBy: { periodEnd: "desc" },
      include: {
        owner: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ data: settlements });
  } catch (error) {
    return handleRouteError(error, "Error al obtener liquidaciones");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());

    const result = await buildOwnerSettlement({
      ownerId: body.ownerId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      currency: body.currency,
      commissionRate: body.commissionRate,
    });

    const user = await getCurrentUser();
    const settlementNumber = await nextDocumentNumber("OWNER_SETTLEMENT", result.periodEnd);

    const settlement = await prisma.ownerSettlement.create({
      data: {
        settlementNumber,
        ownerId: body.ownerId,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        currency: result.currency as never,
        grossIncome: new Prisma.Decimal(result.grossIncome),
        agencyCommission: new Prisma.Decimal(result.agencyCommission),
        commissionRate: new Prisma.Decimal(result.commissionRate),
        expenses: new Prisma.Decimal(result.expenses),
        lateFees: new Prisma.Decimal(result.lateFees),
        netPayout: new Prisma.Decimal(result.netPayout),
        status: "DRAFT",
        notes: body.notes,
        summary: { properties: result.properties } as object,
        createdById: user?.id ?? null,
      },
      include: { owner: { select: { id: true, fullName: true } } },
    });

    await recordAudit({
      entityType: "OwnerSettlement",
      entityId: settlement.id,
      action: "CREATE",
      userId: user?.id,
      changes: { ownerId: body.ownerId, netPayout: result.netPayout },
      request,
    });

    return NextResponse.json({ settlement, ...result }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Error al generar liquidación");
  }
}

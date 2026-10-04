import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createOwnerSettlementDocument } from "@/lib/owner-settlement-pdf";
import { pdfResponse } from "@/lib/pdf-response";
import { handleRouteError, notFoundResponse } from "@/lib/domain-error";

export const runtime = "nodejs";

type SettlementSummary = {
  properties?: {
    propertyId: string;
    code: string;
    title: string;
    income: number;
    expenses: number;
    lateFees: number;
    commission: number;
    net: number;
  }[];
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const settlement = await prisma.ownerSettlement.findUnique({
      where: { id },
      include: { owner: { select: { id: true, fullName: true } } },
    });
    if (!settlement) return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });

    const summary = (settlement.summary ?? {}) as SettlementSummary;

    const buffer = await renderToBuffer(
      createOwnerSettlementDocument({
        agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
        settlementNumber: settlement.settlementNumber,
        owner: { id: settlement.owner.id, fullName: settlement.owner.fullName },
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
        currency: settlement.currency,
        commissionRate: Number(settlement.commissionRate),
        grossIncome: Number(settlement.grossIncome),
        agencyCommission: Number(settlement.agencyCommission),
        expenses: Number(settlement.expenses),
        lateFees: Number(settlement.lateFees),
        netPayout: Number(settlement.netPayout),
        properties: summary.properties ?? [],
      }),
    );

    return pdfResponse(buffer, `liquidacion-${settlement.settlementNumber}.pdf`);
  } catch (error) {
    return handleRouteError(error, "No se pudo generar la liquidación");
  }
}

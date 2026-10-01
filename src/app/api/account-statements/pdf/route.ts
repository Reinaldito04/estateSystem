import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildAccountStatement } from "@/lib/account-statement";
import { createAccountStatementDocument } from "@/lib/account-statement-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await buildAccountStatement({
      propertyId: searchParams.get("propertyId"),
      ownerId: searchParams.get("ownerId"),
      tenantId: searchParams.get("tenantId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    const periodLabel =
      data.period.startDate || data.period.endDate
        ? `${data.period.startDate || "inicio"} a ${data.period.endDate || "hoy"}`
        : "Histórico completo";

    const title =
      data.scope === "OWNER"
        ? "Estado de cuenta al propietario"
        : data.scope === "TENANT"
          ? "Estado de cuenta al inquilino"
          : "Estado de cuenta del inmueble";

    const document = createAccountStatementDocument({
      title,
      agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
      periodLabel,
      properties: data.properties.map((property) => ({
        code: property.code,
        title: property.title,
        address: property.address,
      })),
      incomeByCurrency: data.summary.incomeByCurrency,
      expensesByCurrency: data.summary.expensesByCurrency,
      totalRepairCosts: data.summary.totalRepairCosts,
      transactions: data.transactions.map((transaction) => ({
        id: transaction.id,
        category: transaction.category,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentDate: transaction.paymentDate,
        paymentMethod: transaction.paymentMethod,
        referenceNumber: transaction.referenceNumber,
        property: transaction.property,
        lease: transaction.lease,
      })),
    });

    const buffer = await renderToBuffer(document);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="estado-de-cuenta.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al generar el PDF";
    console.error("Error generating account statement PDF:", error);
    const status = message.includes("Se requiere") || message.includes("No se encontraron") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

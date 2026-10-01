import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAccountStatement } from "@/lib/account-statement";
import { recordAudit } from "@/lib/audit";

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
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al generar estado de cuenta";
    const status = message.includes("Se requiere") || message.includes("No se encontraron") ? 400 : 500;
    if (status === 500) console.error("Error generating account statement:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await buildAccountStatement({
      propertyId: body.propertyId ?? null,
      ownerId: body.ownerId ?? null,
      tenantId: body.tenantId ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
    });

    const audience = data.scope === "TENANT" ? "TENANT" : "OWNER";
    const clientId = body.ownerId ?? body.tenantId ?? null;

    const statement = await prisma.accountStatement.create({
      data: {
        audience,
        propertyId: body.propertyId ?? null,
        clientId,
        periodStart: body.startDate ? new Date(body.startDate) : null,
        periodEnd: body.endDate ? new Date(body.endDate) : null,
        summary: data.summary as object,
      },
    });

    await recordAudit({ entityType: "AccountStatement", entityId: statement.id, action: "CREATE", changes: { audience, propertyId: statement.propertyId }, request });
    return NextResponse.json({ statement, ...data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar estado de cuenta";
    const status = message.includes("Se requiere") || message.includes("No se encontraron") ? 400 : 500;
    if (status === 500) console.error("Error saving account statement:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

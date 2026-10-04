import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createHandoverDocument } from "@/lib/lease-document-pdf";
import { pdfResponse } from "@/lib/pdf-response";
import { handleRouteError, notFoundResponse } from "@/lib/domain-error";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const lease = await prisma.lease.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: { include: { owner: true, assets: { where: { deletedAt: null } }, keys: true } },
        leaseClients: { where: { role: "TENANT" }, include: { client: true } },
      },
    });
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    const tenant = lease.leaseClients[0]?.client;
    if (!tenant) return NextResponse.json({ error: "El contrato no tiene un cliente asignado" }, { status: 400 });
    const formatDate = (value: Date) => new Intl.DateTimeFormat("es-VE").format(value);
    const buffer = await renderToBuffer(
      createHandoverDocument({
        agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
        contractNumber: lease.contractNumber,
        propertyLabel: `${lease.property.code} - ${lease.property.title}`,
        address: lease.property.address,
        ownerName: lease.property.owner.fullName,
        tenantName: tenant.fullName,
        startDate: formatDate(lease.startDate),
        endDate: formatDate(lease.endDate),
        keys: lease.property.keys.map((key) => `${key.keyCount} llave(s) · ${key.holderName} (${key.holderRole})`),
        assets: lease.property.assets.map((asset) => `${asset.quantity} × ${asset.name}${asset.condition ? ` · ${asset.condition}` : ""}`),
      }),
    );
    return pdfResponse(buffer, `acta-${lease.contractNumber}.pdf`);
  } catch (error) {
    return handleRouteError(error, "No se pudo generar el acta");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createInventoryDocument } from "@/lib/lease-document-pdf";
import { pdfResponse } from "@/lib/pdf-response";
import { handleRouteError } from "@/lib/domain-error";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const property = await prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: { assets: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
    });
    if (!property) return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    const buffer = await renderToBuffer(
      createInventoryDocument({
        agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
        propertyLabel: `${property.code} - ${property.title}`,
        address: property.address,
        assets: property.assets.map((asset) => `${asset.quantity} × ${asset.name}${asset.location ? ` · ${asset.location}` : ""} · ${asset.condition}`),
      }),
    );
    return pdfResponse(buffer, `inventario-${property.code}.pdf`);
  } catch (error) {
    return handleRouteError(error, "No se pudo generar el inventario");
  }
}

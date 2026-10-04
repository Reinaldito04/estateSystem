import { isUuid } from "@/lib/route-params";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LEASE_TEMPLATE, renderLeaseTemplate } from "@/lib/contract-templates";
import { createTextDocument } from "@/lib/lease-document-pdf";
import { pdfResponse } from "@/lib/pdf-response";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError, notFoundResponse } from "@/lib/domain-error";

export const runtime = "nodejs";

async function loadLease(id: string) {
  return prisma.lease.findFirst({
    where: { id, deletedAt: null },
    include: {
      property: { include: { owner: true } },
      leaseClients: { where: { role: "TENANT" }, include: { client: true } },
      guarantors: { orderBy: { createdAt: "asc" }, take: 1 },
      template: true,
    },
  });
}

function resolveContent(lease: NonNullable<Awaited<ReturnType<typeof loadLease>>>) {
  if (lease.draftContent) return lease.draftContent;
  const tenant = lease.leaseClients[0]?.client;
  if (!tenant) return null;
  const template = lease.template ?? DEFAULT_LEASE_TEMPLATE;
  return renderLeaseTemplate(template.content, {
    contractNumber: lease.contractNumber,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyCanonAmount: lease.monthlyCanonAmount.toString(),
    depositAmount: lease.depositAmount.toString(),
    reservationAmount: lease.reservationAmount.toString(),
    contractFeeAmount: lease.contractFeeAmount.toString(),
    currency: lease.currency,
    property: lease.property,
    tenant,
    propertyOwner: lease.property.owner,
    guarantorName: lease.guarantors[0]?.fullName,
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const lease = await loadLease(id);
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    const content = resolveContent(lease);
    if (!content) return NextResponse.json({ error: "El contrato no tiene un cliente asignado" }, { status: 400 });
    const hash = createHash("sha256").update(content).digest("hex");
    const buffer = await renderToBuffer(
      createTextDocument({
        agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
        title: `Contrato ${lease.contractNumber}`,
        lines: content.split("\n"),
        footer: `SHA-256 ${hash}`,
      }),
    );
    const response = pdfResponse(buffer, `contrato-${lease.contractNumber}.pdf`);
    response.headers.set("X-Document-Hash", hash);
    return response;
  } catch (error) {
    return handleRouteError(error, "No se pudo generar el PDF del contrato");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const lease = await loadLease(id);
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    const content = resolveContent(lease);
    if (!content) return NextResponse.json({ error: "El contrato no tiene un cliente asignado" }, { status: 400 });
    const hash = createHash("sha256").update(content).digest("hex");
    const version = (await prisma.entityDocument.count({ where: { leaseId: id, documentName: { startsWith: `Contrato ${lease.contractNumber} v` } } })) + 1;
    const user = await getCurrentUser();
    const document = await prisma.entityDocument.create({
      data: {
        entityType: "LEASE",
        leaseId: id,
        documentName: `Contrato ${lease.contractNumber} v${version}`,
        fileUrl: `/api/leases/${id}/pdf`,
        uploadedById: user?.id,
      },
    });
    return NextResponse.json({ id: document.id, version, hash, fileUrl: document.fileUrl }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "No se pudo guardar la versión del contrato");
  }
}

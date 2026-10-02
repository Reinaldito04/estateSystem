import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LEASE_TEMPLATE, renderLeaseTemplate } from "@/lib/contract-templates";
import { z } from "zod";
import { DomainError, handleRouteError } from "@/lib/domain-error";

const draftSchema = z.object({ templateId: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { templateId } = draftSchema.parse(await request.json().catch(() => ({})));
    const lease = await prisma.lease.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: { include: { owner: true } },
        leaseClients: { where: { role: "TENANT" }, include: { client: true } },
        guarantors: { orderBy: { createdAt: "asc" }, take: 1 },
        template: true,
      },
    });
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    if (lease.contractStatus === "EXPIRED" || lease.contractStatus === "TERMINATED" || lease.contractStatus === "CANCELLED") {
      throw new DomainError("No se puede regenerar el borrador de un contrato cerrado");
    }

    const template = templateId && templateId !== DEFAULT_LEASE_TEMPLATE.id
      ? await prisma.contractTemplate.findUnique({ where: { id: templateId } })
      : DEFAULT_LEASE_TEMPLATE;
    if (!template) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

    const tenant = lease.leaseClients[0]?.client;
    if (!tenant) return NextResponse.json({ error: "El contrato no tiene un cliente asignado" }, { status: 400 });

    const draftContent = renderLeaseTemplate(template.content, {
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
    const nextStatus = lease.contractStatus === "ACTIVE" ? "ACTIVE" : "PENDING_SIGNATURE";
    const updated = await prisma.lease.update({
      where: { id },
      data: {
        templateId: template.id === DEFAULT_LEASE_TEMPLATE.id ? null : template.id,
        draftContent,
        contractStatus: nextStatus,
        isActive: nextStatus === "ACTIVE",
      },
    });
    return NextResponse.json({ draftContent, contractStatus: updated.contractStatus, template: { id: template.id, name: template.name } });
  } catch (error) {
    return handleRouteError(error, "No se pudo generar el borrador");
  }
}
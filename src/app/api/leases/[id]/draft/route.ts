import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LEASE_TEMPLATE, renderLeaseTemplate } from "@/lib/contract-templates";
import { z } from "zod";

const draftSchema = z.object({ templateId: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { templateId } = draftSchema.parse(await request.json().catch(() => ({})));
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { property: { include: { owner: true } }, tenant: true, template: true },
    });
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

    const template = templateId && templateId !== DEFAULT_LEASE_TEMPLATE.id
      ? await prisma.contractTemplate.findUnique({ where: { id: templateId } })
      : DEFAULT_LEASE_TEMPLATE;
    if (!template) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });

    const draftContent = renderLeaseTemplate(template.content, {
      contractNumber: lease.contractNumber,
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyCanonAmount: lease.monthlyCanonAmount.toString(),
      depositAmount: lease.depositAmount.toString(),
      property: lease.property,
      tenant: lease.tenant,
      propertyOwner: lease.property.owner,
    });
    const updated = await prisma.lease.update({ where: { id }, data: { templateId: template.id === DEFAULT_LEASE_TEMPLATE.id ? null : template.id, draftContent, contractStatus: "IN_REVIEW" } });
    return NextResponse.json({ draftContent, contractStatus: updated.contractStatus, template: { id: template.id, name: template.name } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "No se pudo generar el borrador" }, { status: 500 });
  }
}
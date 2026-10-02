import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { handleRouteError } from "@/lib/domain-error";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const settlement = await prisma.ownerSettlement.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!settlement) return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
    return NextResponse.json(settlement);
  } catch (error) {
    return handleRouteError(error, "Error al obtener la liquidación");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.ownerSettlement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });

    const settlement = await prisma.ownerSettlement.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.status === "PAID" && { paidAt: new Date() }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: { owner: { select: { id: true, fullName: true } } },
    });

    const user = await getCurrentUser();
    await recordAudit({
      entityType: "OwnerSettlement",
      entityId: settlement.id,
      action: "UPDATE",
      userId: user?.id,
      changes: { status: body.status },
      request,
    });

    return NextResponse.json(settlement);
  } catch (error) {
    return handleRouteError(error, "Error al actualizar la liquidación");
  }
}

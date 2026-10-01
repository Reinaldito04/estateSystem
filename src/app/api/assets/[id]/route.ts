import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional(),
  status: z.enum(["ACTIVE", "UNDER_REPAIR", "RETIRED"]).optional(),
  location: z.string().optional(),
  purchaseDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  purchaseValue: z.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, code: true, title: true } },
        maintenancePlans: true,
      },
    });
    if (!asset) return NextResponse.json({ error: "Activo no encontrado" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error fetching asset:", error);
    return NextResponse.json({ error: "Error al obtener activo" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await request.json());

    const { purchaseValue, ...rest } = data;
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...rest,
        ...(purchaseValue !== undefined && {
          purchaseValue: purchaseValue === null ? null : new Prisma.Decimal(purchaseValue),
        }),
      },
      include: { property: { select: { id: true, code: true, title: true } } },
    });

    await recordAudit({ entityType: "Asset", entityId: id, action: "UPDATE", changes: data, request });
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error updating asset:", error);
    return NextResponse.json({ error: "Error al actualizar activo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordAudit({ entityType: "Asset", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ error: "Error al eliminar activo" }, { status: 500 });
  }
}

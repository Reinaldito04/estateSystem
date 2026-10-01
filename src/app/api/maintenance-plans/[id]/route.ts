import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
const CATEGORIES = ["REVIEW", "MAINTENANCE", "PAYMENT", "CONTRACT", "VISIT", "OTHER"] as const;

const updateSchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  frequency: z.enum(FREQUENCIES).optional(),
  intervalCount: z.number().int().min(1).optional(),
  nextDueDate: z.string().transform((s) => new Date(s)).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await request.json());
    const plan = await prisma.maintenancePlan.update({
      where: { id },
      data: {
        ...data,
        ...(data.assetId !== undefined && { assetId: data.assetId || null }),
        ...(data.providerId !== undefined && { providerId: data.providerId || null }),
      },
      include: { property: { select: { id: true, code: true, title: true } } },
    });
    await recordAudit({ entityType: "MaintenancePlan", entityId: id, action: "UPDATE", changes: data, request });
    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error updating maintenance plan:", error);
    return NextResponse.json({ error: "Error al actualizar plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.maintenancePlan.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ entityType: "MaintenancePlan", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance plan:", error);
    return NextResponse.json({ error: "Error al eliminar plan" }, { status: 500 });
  }
}

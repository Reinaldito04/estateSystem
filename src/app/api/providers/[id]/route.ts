import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().optional(),
  type: z.enum(["LABOR", "MATERIALS", "SERVICE", "MAINTENANCE", "OTHER"]).optional(),
  taxId: z.string().optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  specialty: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const provider = await prisma.serviceProvider.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { dueDate: "desc" }, take: 20, include: { property: { select: { code: true, title: true } } } },
        maintenancePlans: { include: { property: { select: { code: true, title: true } } } },
        issues: { orderBy: { reportDate: "desc" }, take: 20, include: { property: { select: { code: true, title: true } } } },
      },
    });
    if (!provider) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error fetching provider:", error);
    return NextResponse.json({ error: "Error al obtener proveedor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await request.json());
    const provider = await prisma.serviceProvider.update({
      where: { id },
      data: {
        ...data,
        ...(data.email !== undefined && { email: data.email || null }),
      },
    });
    await recordAudit({ entityType: "ServiceProvider", entityId: id, action: "UPDATE", changes: data, request });
    return NextResponse.json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error updating provider:", error);
    return NextResponse.json({ error: "Error al actualizar proveedor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.serviceProvider.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await recordAudit({ entityType: "ServiceProvider", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting provider:", error);
    return NextResponse.json({ error: "Error al eliminar proveedor" }, { status: 500 });
  }
}

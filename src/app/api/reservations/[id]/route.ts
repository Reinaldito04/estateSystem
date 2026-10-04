import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { requiredDate } from "@/lib/schemas";

const updateSchema = z.object({
  type: z.enum(["VISIT", "LEASE_HOLD", "MAINTENANCE", "BLOCK"]).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  startDate: requiredDate().optional(),
  endDate: requiredDate().optional(),
  clientId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const data = updateSchema.parse(await request.json());

    const existing = await prisma.propertyReservation.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

    const startDate = data.startDate ?? existing.startDate;
    const endDate = data.endDate ?? existing.endDate;
    const status = data.status ?? existing.status;

    if (endDate <= startDate) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior al inicio" }, { status: 400 });
    }

    if (status !== "CANCELLED") {
      const overlap = await prisma.propertyReservation.findFirst({
        where: {
          propertyId: existing.propertyId,
          status: { not: "CANCELLED" },
          NOT: { id },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      });
      if (overlap) {
        return NextResponse.json({ error: "El inmueble ya tiene una reserva en ese rango de fechas" }, { status: 409 });
      }
    }

    const reservation = await prisma.propertyReservation.update({
      where: { id },
      data: {
        ...data,
        ...(data.clientId !== undefined && { clientId: data.clientId || null }),
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });

    await recordAudit({ entityType: "PropertyReservation", entityId: id, action: "UPDATE", changes: data, request });
    return NextResponse.json(reservation);
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error updating reservation:", error);
    return NextResponse.json({ error: "Error al actualizar reserva" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    await prisma.propertyReservation.delete({ where: { id } });
    await recordAudit({ entityType: "PropertyReservation", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json({ error: "Error al eliminar reserva" }, { status: 500 });
  }
}

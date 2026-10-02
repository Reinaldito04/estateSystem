import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { requiredDate } from "@/lib/schemas";

const createSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  type: z.enum(["VISIT", "LEASE_HOLD", "MAINTENANCE", "BLOCK"]).default("VISIT"),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).default("PENDING"),
  startDate: requiredDate("La fecha de inicio es requerida"),
  endDate: requiredDate("La fecha de fin es requerida"),
  clientId: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

async function findOverlap(propertyId: string, startDate: Date, endDate: Date, excludeId?: string) {
  return prisma.propertyReservation.findFirst({
    where: {
      propertyId,
      status: { not: "CANCELLED" },
      ...(excludeId && { NOT: { id: excludeId } }),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true, startDate: true, endDate: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.PropertyReservationWhereInput = {
      ...(propertyId && { propertyId }),
      ...(status && { status: status as Prisma.PropertyReservationWhereInput["status"] }),
      ...((from || to) && {
        startDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const reservations = await prisma.propertyReservation.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ data: reservations });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json({ error: "Error al obtener reservas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = createSchema.parse(await request.json());
    if (data.endDate <= data.startDate) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior al inicio" }, { status: 400 });
    }

    const overlap = await findOverlap(data.propertyId, data.startDate, data.endDate);
    if (overlap) {
      return NextResponse.json({ error: "El inmueble ya tiene una reserva en ese rango de fechas" }, { status: 409 });
    }

    const user = await getCurrentUser();
    const reservation = await prisma.propertyReservation.create({
      data: {
        ...data,
        clientId: data.clientId || null,
        createdById: user?.id ?? null,
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });

    await recordAudit({ entityType: "PropertyReservation", entityId: reservation.id, action: "CREATE", changes: data, request });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error creating reservation:", error);
    return NextResponse.json({ error: "Error al crear reserva" }, { status: 500 });
  }
}

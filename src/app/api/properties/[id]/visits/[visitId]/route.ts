import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const visitUpdateSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  visitedAt: z.string().transform((value) => new Date(value)).nullable().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  try {
    const { id, visitId } = await params;
    const body = visitUpdateSchema.parse(await request.json());
    const visit = await prisma.propertyVisit.updateMany({ where: { id: visitId, propertyId: id }, data: body });
    if (visit.count === 0) return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar visita" }, { status: 500 });
  }
}
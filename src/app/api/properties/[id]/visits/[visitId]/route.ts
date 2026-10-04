import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { toVisitStatus } from "@/lib/enum-mapping";

const visitUpdateSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  visitedAt: z.string().transform((value) => new Date(value)).nullable().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  try {
    const { id, visitId } = await params;
    if (!isUuid(id) || !isUuid(visitId)) return notFoundResponse();
    const body = visitUpdateSchema.parse(await request.json());
    const { status, ...visitFields } = body;
    const visit = await prisma.propertyVisit.updateMany({
      where: { id: visitId, propertyId: id },
      data: {
        ...visitFields,
        ...(status !== undefined && { status: toVisitStatus(status) }),
      },
    });
    if (visit.count === 0) return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    return NextResponse.json({ error: "Error al actualizar visita" }, { status: 500 });
  }
}
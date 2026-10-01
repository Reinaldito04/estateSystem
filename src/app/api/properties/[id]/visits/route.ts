import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { toVisitStatus, visitStatusToUi } from "@/lib/enum-mapping";

const visitSchema = z.object({
  visitorName: z.string().min(1, "Visitante es requerido"),
  visitorPhone: z.string().optional(),
  visitorEmail: z.string().email().optional().or(z.literal("")),
  purpose: z.string().optional(),
  scheduledAt: z.string().transform((value) => new Date(value)),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visits = await prisma.propertyVisit.findMany({ where: { propertyId: id }, orderBy: { scheduledAt: "desc" } });
  return NextResponse.json({ data: visits.map((visit) => ({ ...visit, status: visitStatusToUi(visit.status) })) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = visitSchema.parse(await request.json());
    const visit = await prisma.propertyVisit.create({ data: { ...body, status: toVisitStatus(body.status), propertyId: id } });
    return NextResponse.json({ ...visit, status: visitStatusToUi(visit.status) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Error al registrar visita" }, { status: 500 });
  }
}
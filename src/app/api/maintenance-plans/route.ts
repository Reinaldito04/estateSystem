import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
const CATEGORIES = ["REVIEW", "MAINTENANCE", "PAYMENT", "CONTRACT", "VISIT", "OTHER"] as const;

const createSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  assetId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Título es requerido"),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).default("MAINTENANCE"),
  frequency: z.enum(FREQUENCIES).default("MONTHLY"),
  intervalCount: z.number().int().min(1).default(1),
  nextDueDate: z.string().transform((s) => new Date(s)),
  createdById: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const active = searchParams.get("active");

    const where: Prisma.MaintenancePlanWhereInput = {
      ...(propertyId && { propertyId }),
      ...(active === "true" && { isActive: true }),
      ...(active === "false" && { isActive: false }),
    };

    const plans = await prisma.maintenancePlan.findMany({
      where,
      orderBy: { nextDueDate: "asc" },
      include: {
        property: { select: { id: true, code: true, title: true } },
        asset: { select: { id: true, name: true } },
        provider: { select: { id: true, companyName: true } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("Error fetching maintenance plans:", error);
    return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = createSchema.parse(await request.json());
    const plan = await prisma.maintenancePlan.create({
      data: {
        propertyId: data.propertyId,
        assetId: data.assetId || null,
        providerId: data.providerId || null,
        title: data.title,
        description: data.description,
        category: data.category,
        frequency: data.frequency,
        intervalCount: data.intervalCount,
        nextDueDate: data.nextDueDate,
        createdById: data.createdById,
      },
      include: { property: { select: { id: true, code: true, title: true } } },
    });

    const task = await prisma.task.create({
      data: {
        title: plan.title,
        description: plan.description,
        category: plan.category,
        dueDate: plan.nextDueDate,
        recurrence: plan.frequency,
        planId: plan.id,
        propertyId: plan.propertyId,
        assetId: plan.assetId,
        providerId: plan.providerId,
      },
    });

    await recordAudit({ entityType: "MaintenancePlan", entityId: plan.id, action: "CREATE", changes: { title: plan.title }, request });
    return NextResponse.json({ plan, task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error creating maintenance plan:", error);
    return NextResponse.json({ error: "Error al crear plan" }, { status: 500 });
  }
}

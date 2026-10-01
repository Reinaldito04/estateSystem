import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { nextDueDate } from "@/lib/task-schedule";
import { z } from "zod";

const CATEGORIES = ["REVIEW", "MAINTENANCE", "PAYMENT", "CONTRACT", "VISIT", "OTHER"] as const;
const STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().transform((s) => new Date(s)).optional(),
  startAt: z.string().transform((s) => new Date(s)).optional().nullable(),
  endAt: z.string().transform((s) => new Date(s)).optional().nullable(),
  allDay: z.boolean().optional(),
  recurrence: z.enum(FREQUENCIES).optional(),
  propertyId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  leaseId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
        lease: { select: { id: true, contractNumber: true } },
        provider: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, fullName: true } },
        plan: true,
      },
    });
    if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json({ error: "Error al obtener tarea" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await request.json());

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

    const becomingDone = data.status === "DONE" && existing.status !== "DONE";
    const leavingDone = data.status !== undefined && data.status !== "DONE" && existing.status === "DONE";

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        ...(data.propertyId !== undefined && { propertyId: data.propertyId || null }),
        ...(data.clientId !== undefined && { clientId: data.clientId || null }),
        ...(data.leaseId !== undefined && { leaseId: data.leaseId || null }),
        ...(data.providerId !== undefined && { providerId: data.providerId || null }),
        ...(data.assetId !== undefined && { assetId: data.assetId || null }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
        ...(becomingDone && { completedAt: new Date() }),
        ...(leavingDone && { completedAt: null }),
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });

    let nextTask = null;
    if (becomingDone && task.planId) {
      const plan = await prisma.maintenancePlan.findUnique({ where: { id: task.planId } });
      if (plan && plan.isActive) {
        const next = nextDueDate(new Date(), plan.frequency, plan.intervalCount);
        if (next) {
          await prisma.maintenancePlan.update({
            where: { id: plan.id },
            data: { lastCompletedAt: new Date(), nextDueDate: next },
          });
          nextTask = await prisma.task.create({
            data: {
              title: plan.title,
              description: plan.description,
              category: plan.category,
              dueDate: next,
              recurrence: plan.frequency,
              planId: plan.id,
              propertyId: plan.propertyId,
              assetId: plan.assetId,
              providerId: plan.providerId,
            },
          });
        } else {
          await prisma.maintenancePlan.update({
            where: { id: plan.id },
            data: { lastCompletedAt: new Date(), isActive: false },
          });
        }
      }
    }

    await recordAudit({ entityType: "Task", entityId: id, action: "UPDATE", changes: data, request });
    return NextResponse.json({ task, nextTask });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Error al actualizar tarea" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    await recordAudit({ entityType: "Task", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Error al eliminar tarea" }, { status: 500 });
  }
}

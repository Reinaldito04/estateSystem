import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const CATEGORIES = ["REVIEW", "MAINTENANCE", "PAYMENT", "CONTRACT", "VISIT", "OTHER"] as const;
const STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;

const createSchema = z.object({
  title: z.string().min(1, "Título es requerido"),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).default("OTHER"),
  status: z.enum(STATUSES).default("PENDING"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  dueDate: z.string().transform((s) => new Date(s)),
  startAt: z.string().transform((s) => new Date(s)).optional().nullable(),
  endAt: z.string().transform((s) => new Date(s)).optional().nullable(),
  allDay: z.boolean().default(true),
  recurrence: z.enum(FREQUENCIES).default("ONCE"),
  propertyId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  leaseId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  createdById: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const propertyId = searchParams.get("propertyId");
    const clientId = searchParams.get("clientId");
    const leaseId = searchParams.get("leaseId");
    const assigneeId = searchParams.get("assigneeId");
    const providerId = searchParams.get("providerId");
    const assetId = searchParams.get("assetId");
    const planId = searchParams.get("planId");
    const search = searchParams.get("search") || "";

    const where: Prisma.TaskWhereInput = {
      ...(status && { status: status as Prisma.TaskWhereInput["status"] }),
      ...(category && { category: category as Prisma.TaskWhereInput["category"] }),
      ...(propertyId && { propertyId }),
      ...(clientId && { clientId }),
      ...(leaseId && { leaseId }),
      ...(assigneeId && { assigneeId }),
      ...(providerId && { providerId }),
      ...(assetId && { assetId }),
      ...(planId && { planId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...((from || to) && {
        dueDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
        lease: { select: { id: true, contractNumber: true } },
        provider: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Error al obtener tareas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = createSchema.parse(await request.json());
    const task = await prisma.task.create({
      data: {
        ...data,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        propertyId: data.propertyId || null,
        clientId: data.clientId || null,
        leaseId: data.leaseId || null,
        providerId: data.providerId || null,
        assetId: data.assetId || null,
        assigneeId: data.assigneeId || null,
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });

    await recordAudit({ entityType: "Task", entityId: task.id, action: "CREATE", changes: { title: task.title }, request });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Error al crear tarea" }, { status: 500 });
  }
}

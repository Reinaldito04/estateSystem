import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const issueSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  clientId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  issueType: z.string().min(1, "Tipo de avería es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
  status: z.enum(["REPORTED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).default("REPORTED"),
  reportDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  reportedByType: z.enum(["CLIENT", "OWNER", "USER", "SYSTEM"]).default("CLIENT"),
  reportedByUserId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  repairDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  repairDetails: z.string().optional(),
  repairCost: z.number().min(0).default(0),
  receiptUrl: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const propertyId = searchParams.get("propertyId") || "";
    const clientId = searchParams.get("clientId") || searchParams.get("tenantId") || "";
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyIssueWhereInput = {
      ...(search && {
        OR: [
          { issueType: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { code: { contains: search, mode: "insensitive" } } },
          { client: { fullName: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(status && { status: status as Prisma.PropertyIssueWhereInput["status"] }),
      ...(propertyId && { propertyId }),
      ...(clientId && { clientId }),
    };

    const [issues, total, totalCost] = await Promise.all([
      prisma.propertyIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportDate: "desc" },
        include: {
          property: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      prisma.propertyIssue.count({ where }),
      prisma.propertyIssue.aggregate({
        where,
        _sum: { repairCost: true },
      }),
    ]);

    return NextResponse.json({
      data: issues.map(({ client, ...issue }) => ({ ...issue, tenant: client })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCost: totalCost._sum.repairCost || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Error al obtener averías" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = issueSchema.parse(body);
    const { clientId: requestedClientId, tenantId: legacyClientId, reportDate, ...issueData } = validatedData;
    const clientId = requestedClientId || legacyClientId || null;

    const issue = await prisma.propertyIssue.create({
      data: {
        ...issueData,
        ...(reportDate ? { reportDate } : {}),
        clientId,
        repairCost: new Prisma.Decimal(validatedData.repairCost),
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return NextResponse.json({ ...issue, tenant: issue.client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating issue:", error);
    return NextResponse.json({ error: "Error al crear avería" }, { status: 500 });
  }
}
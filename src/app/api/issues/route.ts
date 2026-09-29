import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const issueSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  tenantId: z.string().uuid("Inquilino es requerido"),
  issueType: z.string().min(1, "Tipo de avería es requerido"),
  description: z.string().min(1, "Descripción es requerida"),
  status: z.enum(["REPORTED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).default("REPORTED"),
  repairDate: z.string().transform((s) => new Date(s)).optional(),
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
    const tenantId = searchParams.get("tenantId") || "";
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyIssueWhereInput = {
      ...(search && {
        OR: [
          { issueType: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { code: { contains: search, mode: "insensitive" } } },
          { tenant: { fullName: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(status && { status: status as Prisma.PropertyIssueWhereInput["status"] }),
      ...(propertyId && { propertyId }),
      ...(tenantId && { tenantId }),
    };

    const [issues, total, totalCost] = await Promise.all([
      prisma.propertyIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportDate: "desc" },
        include: {
          property: { select: { id: true, code: true, title: true } },
          tenant: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      prisma.propertyIssue.count({ where }),
      prisma.propertyIssue.aggregate({
        where,
        _sum: { repairCost: true },
      }),
    ]);

    return NextResponse.json({
      data: issues,
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

    const issue = await prisma.propertyIssue.create({
      data: {
        ...validatedData,
        repairCost: new Prisma.Decimal(validatedData.repairCost),
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        tenant: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating issue:", error);
    return NextResponse.json({ error: "Error al crear avería" }, { status: 500 });
  }
}
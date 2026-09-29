import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const tenantSchema = z.object({
  fullName: z.string().min(1, "Nombre completo es requerido"),
  documentId: z.string().min(1, "Documento de identidad es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Teléfono es requerido"),
  workPlace: z.string().optional(),
  monthlyIncome: z.number().positive().optional().nullable(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { documentId: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { leases: true, propertyIssues: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json({ error: "Error al obtener inquilinos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = tenantSchema.parse(body);

    const existingTenant = await prisma.tenant.findUnique({
      where: { documentId: validatedData.documentId },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Ya existe un inquilino con este documento de identidad" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.create({
      data: {
        ...validatedData,
        monthlyIncome: validatedData.monthlyIncome ? new Prisma.Decimal(validatedData.monthlyIncome) : null,
      },
      include: {
        _count: { select: { leases: true, propertyIssues: true } },
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating tenant:", error);
    return NextResponse.json({ error: "Error al crear inquilino" }, { status: 500 });
  }
}
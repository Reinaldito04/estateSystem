import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const leaseSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  tenantId: z.string().uuid("Inquilino es requerido"),
  contractNumber: z.string().min(1, "Número de contrato es requerido"),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  monthlyCanonAmount: z.number().positive("Canon mensual debe ser positivo"),
  depositAmount: z.number().min(0).default(0),
  reservationAmount: z.number().min(0).default(0),
  contractFeeAmount: z.number().min(0).default(0),
  contractFileUrl: z.string().optional(),
  isActive: z.boolean().default(true),
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

    const where: Prisma.LeaseWhereInput = {
      ...(search && {
        OR: [
          { contractNumber: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { code: { contains: search, mode: "insensitive" } } },
          { tenant: { fullName: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(status === "active" && { isActive: true }),
      ...(status === "expired" && { isActive: false }),
      ...(status === "expiring" && {
        isActive: true,
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      ...(propertyId && { propertyId }),
      ...(tenantId && { tenantId }),
    };

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { id: true, code: true, title: true, address: true } },
          tenant: { select: { id: true, fullName: true, phone: true, email: true } },
          _count: { select: { transactions: true, notices: true } },
        },
      }),
      prisma.lease.count({ where }),
    ]);

    return NextResponse.json({
      data: leases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leases:", error);
    return NextResponse.json({ error: "Error al obtener contratos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = leaseSchema.parse(body);

    const existingLease = await prisma.lease.findUnique({
      where: { contractNumber: validatedData.contractNumber },
    });

    if (existingLease) {
      return NextResponse.json(
        { error: "Ya existe un contrato con este número" },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.create({
      data: {
        ...validatedData,
        monthlyCanonAmount: new Prisma.Decimal(validatedData.monthlyCanonAmount),
        depositAmount: new Prisma.Decimal(validatedData.depositAmount),
        reservationAmount: new Prisma.Decimal(validatedData.reservationAmount),
        contractFeeAmount: new Prisma.Decimal(validatedData.contractFeeAmount),
      },
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        tenant: { select: { id: true, fullName: true, phone: true, email: true } },
        _count: { select: { transactions: true, notices: true } },
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating lease:", error);
    return NextResponse.json({ error: "Error al crear contrato" }, { status: 500 });
  }
}
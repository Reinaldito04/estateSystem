import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const propertySchema = z.object({
  code: z.string().min(1, "Código es requerido"),
  ownerId: z.string().uuid("Propietario es requerido"),
  title: z.string().min(1, "Título es requerido"),
  address: z.string().min(1, "Dirección es requerida"),
  city: z.string().min(1, "Ciudad es requerida"),
  condoName: z.string().optional(),
  condoAccountNumber: z.string().optional(),
  electricityAccountNumber: z.string().optional(),
  internetProvider: z.string().optional(),
  internetAccountNumber: z.string().optional(),
  status: z.string().default("available"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const ownerId = searchParams.get("ownerId") || "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
          { address: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
      ...(ownerId && { ownerId }),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { id: true, fullName: true, phone: true } },
          photos: { orderBy: { uploadedAt: "asc" } },
          _count: { select: { leases: true, transactions: true, issues: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Error al obtener inmuebles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = propertySchema.parse(body);

    const existingProperty = await prisma.property.findUnique({
      where: { code: validatedData.code },
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: "Ya existe un inmueble con este código" },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: validatedData,
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        photos: true,
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Error al crear inmueble" }, { status: 500 });
  }
}
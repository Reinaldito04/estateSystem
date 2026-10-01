import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).default("GOOD"),
  status: z.enum(["ACTIVE", "UNDER_REPAIR", "RETIRED"]).default("ACTIVE"),
  location: z.string().optional(),
  purchaseDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  purchaseValue: z.number().min(0).optional().nullable(),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).default("USD"),
  notes: z.string().optional(),
  createdById: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";

    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...(propertyId && { propertyId }),
      ...(status && { status: status as Prisma.AssetWhereInput["status"] }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { property: { select: { id: true, code: true, title: true } } },
    });

    return NextResponse.json({ data: assets });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Error al obtener inventario" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const property = await prisma.property.findUnique({ where: { id: data.propertyId }, select: { id: true } });
    if (!property) return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });

    const asset = await prisma.asset.create({
      data: {
        ...data,
        purchaseValue: data.purchaseValue === undefined || data.purchaseValue === null ? null : new Prisma.Decimal(data.purchaseValue),
        purchaseDate: data.purchaseDate ?? null,
      },
      include: { property: { select: { id: true, code: true, title: true } } },
    });

    await recordAudit({ entityType: "Asset", entityId: asset.id, action: "CREATE", changes: { name: asset.name }, request });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Error al crear activo" }, { status: 500 });
  }
}

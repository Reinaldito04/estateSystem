import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { propertyStatusToUi, toPropertyStatus, toPropertyType } from "@/lib/enum-mapping";
import { recordAudit } from "@/lib/audit";

const propertySchema = z.object({
  code: z.string().min(1, "Código es requerido"),
  ownerId: z.string().uuid("Propietario es requerido"),
  title: z.string().min(1, "Título es requerido"),
  address: z.string().min(1, "Dirección es requerida"),
  city: z.string().min(1, "Ciudad es requerida"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  propertyType: z.string().min(1).default("APARTMENT"),
  totalAreaSqm: z.number().min(0).nullable().optional(),
  builtAreaSqm: z.number().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  parkingSpaces: z.number().int().min(0).nullable().optional(),
  amenities: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.string()).default({}),
  condoName: z.string().optional(),
  condoAccountNumber: z.string().optional(),
  electricityAccountNumber: z.string().optional(),
  internetProvider: z.string().optional(),
  internetAccountNumber: z.string().optional(),
  condoAdministration: z.string().optional(),
  condoFeeAmount: z.number().min(0).nullable().optional(),
  condoContact: z.string().optional(),
  electricityProvider: z.string().optional(),
  electricityMeterNumber: z.string().optional(),
  electricityTariff: z.string().optional(),
  videoUrl: z.string().optional(),
  floorPlanUrl: z.string().optional(),
  virtualTourUrl: z.string().optional(),
  captureCommission: z.number().min(0).max(100).nullable().optional(),
  captureExclusive: z.boolean().default(false),
  captureContractUrl: z.string().optional(),
  status: z.string().default("available"),
  tagIds: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const ownerId = searchParams.get("ownerId") || "";
    const tagId = searchParams.get("tagId") || "";
    const propertyType = searchParams.get("propertyType") || "";
    const city = searchParams.get("city") || "";
    const minCanon = searchParams.get("minCanon") || "";
    const maxCanon = searchParams.get("maxCanon") || "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
          { address: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: toPropertyStatus(status) }),
      ...(ownerId && { ownerId }),
      ...(tagId && { tags: { some: { tagId } } }),
      ...(propertyType && { propertyType: toPropertyType(propertyType) }),
      ...(city && { city: { equals: city, mode: "insensitive" as const } }),
      ...((minCanon || maxCanon) && {
        leases: {
          some: {
            isActive: true,
            monthlyCanonAmount: {
              ...(minCanon && { gte: Number(minCanon) }),
              ...(maxCanon && { lte: Number(maxCanon) }),
            },
          },
        },
      }),
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
          tags: { include: { tag: true } },
          _count: { select: { leases: true, transactions: true, issues: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      data: properties.map((property) => ({
        ...property,
        status: propertyStatusToUi(property.status),
        tags: property.tags.map((propertyTag) => propertyTag.tag),
      })),
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
    const { tagIds, ...validatedData } = propertySchema.parse(body);

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
      data: {
        ...validatedData,
        propertyType: toPropertyType(validatedData.propertyType),
        status: toPropertyStatus(validatedData.status),
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        photos: true,
        tags: { include: { tag: true } },
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    await recordAudit({ entityType: "Property", entityId: property.id, action: "CREATE", changes: { code: property.code, title: property.title }, request });
    return NextResponse.json({ ...property, status: propertyStatusToUi(property.status), tags: property.tags.map((propertyTag) => propertyTag.tag) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating property:", error);
    return NextResponse.json({ error: "Error al crear inmueble" }, { status: 500 });
  }
}
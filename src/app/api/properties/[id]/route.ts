import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPropertyFilename, removePropertyFile } from "@/lib/property-file-storage";
import { calculateLeaseBalance } from "@/lib/lease-balance";
import { z } from "zod";
import { propertyStatusToUi, toPropertyStatus, toPropertyType } from "@/lib/enum-mapping";
import { recordAudit } from "@/lib/audit";

const propertyUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  ownerId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  propertyType: z.string().min(1).optional(),
  totalAreaSqm: z.number().min(0).nullable().optional(),
  builtAreaSqm: z.number().min(0).nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  parkingSpaces: z.number().int().min(0).nullable().optional(),
  amenities: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
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
  captureExclusive: z.boolean().optional(),
  captureContractUrl: z.string().optional(),
  status: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        photos: { orderBy: { uploadedAt: "asc" } },
        interests: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" } },
        leases: {
          include: {
            leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, phone: true } } } },
            transactions: { select: { category: true, amount: true, paymentDate: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          orderBy: { paymentDate: "desc" },
          take: 20,
        },
        issues: {
          include: {
            client: { select: { id: true, fullName: true } },
          },
          orderBy: { reportDate: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        keys: { orderBy: { assignedAt: "desc" } },
        visits: { orderBy: { scheduledAt: "desc" } },
        tags: { include: { tag: true } },
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...property,
      status: propertyStatusToUi(property.status),
      tags: property.tags.map((propertyTag) => propertyTag.tag),
      leases: property.leases.map(({ transactions, leaseClients, ...lease }) => ({
        ...lease,
        tenant: leaseClients[0]?.client || null,
        balance: calculateLeaseBalance(
          lease.startDate,
          lease.endDate,
          Number(lease.monthlyCanonAmount),
          transactions.map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
          })),
        ),
      })),
      issues: property.issues.map(({ client, ...issue }) => ({ ...issue, tenant: client })),
    });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json({ error: "Error al obtener inmueble" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = propertyUpdateSchema.parse(body);

    if (validatedData.code) {
      const existingProperty = await prisma.property.findFirst({
        where: { code: validatedData.code, NOT: { id } },
      });
      if (existingProperty) {
        return NextResponse.json(
          { error: "Ya existe un inmueble con este código" },
          { status: 400 }
        );
      }
    }

    const { ownerId, propertyType, status, tagIds, ...propertyFields } = validatedData;

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...propertyFields,
        ...(ownerId !== undefined && { owner: { connect: { id: ownerId } } }),
        ...(propertyType !== undefined && { propertyType: toPropertyType(propertyType) }),
        ...(status !== undefined && { status: toPropertyStatus(status) }),
        ...(tagIds !== undefined && {
          tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        photos: true,
        tags: { include: { tag: true } },
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    await recordAudit({ entityType: "Property", entityId: id, action: "UPDATE", changes: validatedData, request });
    return NextResponse.json({
      ...property,
      status: propertyStatusToUi(property.status),
      tags: property.tags.map((propertyTag) => propertyTag.tag),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating property:", error);
    return NextResponse.json({ error: "Error al actualizar inmueble" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: { leases: true, transactions: true, issues: true, photos: true, documents: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    if (property.leases.length > 0 || property.transactions.length > 0 || property.issues.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un inmueble que tiene contratos, transacciones o averías asociadas" },
        { status: 400 }
      );
    }

    const filePrefix = `/api/properties/${id}/media/`;
    const filenames = [...property.photos.map((photo) => photo.photoUrl), ...property.documents.map((document) => document.fileUrl)]
      .filter((fileUrl) => fileUrl.startsWith(filePrefix))
      .map((fileUrl) => fileUrl.slice(filePrefix.length))
      .filter(isValidPropertyFilename);

    await prisma.property.delete({ where: { id } });
    await Promise.all(filenames.map((filename) =>
      removePropertyFile(id, filename).catch((error) => {
        console.error("Error removing property file:", error);
      })
    ));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ error: "Error al eliminar inmueble" }, { status: 500 });
  }
}
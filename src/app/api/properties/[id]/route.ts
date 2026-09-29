import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const propertyUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  ownerId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  condoName: z.string().optional(),
  condoAccountNumber: z.string().optional(),
  electricityAccountNumber: z.string().optional(),
  internetProvider: z.string().optional(),
  internetAccountNumber: z.string().optional(),
  status: z.string().optional(),
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
        leases: {
          include: {
            tenant: { select: { id: true, fullName: true, phone: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          orderBy: { paymentDate: "desc" },
          take: 20,
        },
        issues: {
          include: {
            tenant: { select: { id: true, fullName: true } },
          },
          orderBy: { reportDate: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    return NextResponse.json(property);
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

    const property = await prisma.property.update({
      where: { id },
      data: validatedData,
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        photos: true,
        _count: { select: { leases: true, transactions: true, issues: true } },
      },
    });

    return NextResponse.json(property);
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
      include: { leases: true, transactions: true, issues: true },
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

    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json({ error: "Error al eliminar inmueble" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ownerUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  bankDetails: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await prisma.owner.findUnique({
      where: { id },
      include: {
        properties: {
          include: {
            _count: { select: { leases: true, transactions: true, issues: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        _count: { select: { properties: true } },
      },
    });

    if (!owner) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(owner);
  } catch (error) {
    console.error("Error fetching owner:", error);
    return NextResponse.json({ error: "Error al obtener propietario" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = ownerUpdateSchema.parse(body);

    if (validatedData.documentId) {
      const existingOwner = await prisma.owner.findFirst({
        where: { documentId: validatedData.documentId, NOT: { id } },
      });
      if (existingOwner) {
        return NextResponse.json(
          { error: "Ya existe un propietario con este documento de identidad" },
          { status: 400 }
        );
      }
    }

    const owner = await prisma.owner.update({
      where: { id },
      data: validatedData,
      include: {
        _count: { select: { properties: true } },
      },
    });

    return NextResponse.json(owner);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating owner:", error);
    return NextResponse.json({ error: "Error al actualizar propietario" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const owner = await prisma.owner.findUnique({
      where: { id },
      include: { properties: true },
    });

    if (!owner) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 });
    }

    if (owner.properties.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un propietario que tiene inmuebles asociados" },
        { status: 400 }
      );
    }

    await prisma.owner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting owner:", error);
    return NextResponse.json({ error: "Error al eliminar propietario" }, { status: 500 });
  }
}
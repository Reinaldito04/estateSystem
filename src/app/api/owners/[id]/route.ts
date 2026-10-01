import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const ownerUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  bankDetails: z.string().optional(),
});

type ClientProfileRecord = {
  id: string;
  fullName: string;
  legalDocumentId: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  bankDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { properties: number };
};

function toOwner(profile: ClientProfileRecord) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    documentId: profile.legalDocumentId,
    email: profile.email,
    phone: profile.phone,
    alternatePhone: profile.alternatePhone,
    address: profile.address,
    bankDetails: profile.bankDetails,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    _count: profile._count ?? { properties: 0 },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await prisma.clientProfile.findFirst({
      where: { id, role: "OWNER" },
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

    return NextResponse.json({
      ...toOwner(owner),
      properties: owner.properties,
      documents: owner.documents,
    });
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
      const existingOwner = await prisma.clientProfile.findFirst({
        where: { legalDocumentId: validatedData.documentId, NOT: { id } },
      });
      if (existingOwner) {
        return NextResponse.json(
          { error: "Ya existe un propietario con este documento de identidad" },
          { status: 400 }
        );
      }
    }

    const owner = await prisma.clientProfile.update({
      where: { id },
      data: {
        ...(validatedData.fullName !== undefined && { fullName: validatedData.fullName }),
        ...(validatedData.documentId !== undefined && { legalDocumentId: validatedData.documentId }),
        ...(validatedData.email !== undefined && { email: validatedData.email || null }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.alternatePhone !== undefined && { alternatePhone: validatedData.alternatePhone }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
        ...(validatedData.bankDetails !== undefined && { bankDetails: validatedData.bankDetails }),
      },
      include: {
        _count: { select: { properties: true } },
      },
    });

    return NextResponse.json(toOwner(owner));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
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

    const owner = await prisma.clientProfile.findFirst({
      where: { id, role: "OWNER" },
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

    await prisma.clientProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting owner:", error);
    return NextResponse.json({ error: "Error al eliminar propietario" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const tenantUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  workPlace: z.string().optional(),
  monthlyIncome: z.number().positive().optional().nullable(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        leases: {
          include: {
            property: true,
          },
          orderBy: { createdAt: "desc" },
        },
        propertyIssues: {
          include: {
            property: true,
          },
          orderBy: { reportDate: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        _count: { select: { leases: true, propertyIssues: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Inquilino no encontrado" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Error al obtener inquilino" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = tenantUpdateSchema.parse(body);

    if (validatedData.documentId) {
      const existingTenant = await prisma.tenant.findFirst({
        where: { documentId: validatedData.documentId, NOT: { id } },
      });
      if (existingTenant) {
        return NextResponse.json(
          { error: "Ya existe un inquilino con este documento de identidad" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...validatedData,
        monthlyIncome: validatedData.monthlyIncome ? new Prisma.Decimal(validatedData.monthlyIncome) : null,
      },
      include: {
        _count: { select: { leases: true, propertyIssues: true } },
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Error al actualizar inquilino" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { leases: true, propertyIssues: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Inquilino no encontrado" }, { status: 404 });
    }

    if (tenant.leases.length > 0 || tenant.propertyIssues.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un inquilino que tiene contratos o averías asociadas" },
        { status: 400 }
      );
    }

    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({ error: "Error al eliminar inquilino" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { Prisma } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { optionalDate } from "@/lib/schemas";

const issueUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional(),
  issueType: z.string().min(1, "Tipo de avería es requerido").optional(),
  description: z.string().min(1, "Descripción es requerida").optional(),
  status: z.enum(["REPORTED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).optional(),
  reportDate: optionalDate(),
  reportedByType: z.enum(["CLIENT", "OWNER", "USER", "SYSTEM"]).optional(),
  reportedByUserId: z.string().uuid().optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
  repairDate: optionalDate(),
  repairDetails: z.string().optional(),
  repairCost: z.number().min(0, "El costo no puede ser negativo").optional(),
  receiptUrl: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const issue = await prisma.propertyIssue.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            owner: { select: { id: true, fullName: true, phone: true } },
          },
        },
        client: true,
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Avería no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ...issue, tenant: issue.client });
  } catch (error) {
    console.error("Error fetching issue:", error);
    return NextResponse.json({ error: "Error al obtener avería" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = issueUpdateSchema.parse(body);

    const { clientId, tenantId: legacyClientId, providerId, reportDate, ...issueFields } = validatedData;
    const updateData: Prisma.PropertyIssueUpdateInput = {
      ...issueFields,
      ...(reportDate ? { reportDate } : {}),
    };
    if (clientId || legacyClientId) updateData.client = { connect: { id: clientId || legacyClientId } };
    if (providerId !== undefined) {
      updateData.provider = providerId ? { connect: { id: providerId } } : { disconnect: true };
    }
    if (validatedData.repairCost !== undefined) {
      updateData.repairCost = new Prisma.Decimal(validatedData.repairCost);
    }

    const issue = await prisma.propertyIssue.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true, phone: true } },
        provider: { select: { id: true, companyName: true } },
      },
    });

    await recordAudit({ entityType: "PropertyIssue", entityId: id, action: "UPDATE", changes: validatedData, request });
    return NextResponse.json({ ...issue, tenant: issue.client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error updating issue:", error);
    return NextResponse.json({ error: "Error al actualizar avería" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.propertyIssue.delete({ where: { id } });
    await recordAudit({ entityType: "PropertyIssue", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting issue:", error);
    return NextResponse.json({ error: "Error al eliminar avería" }, { status: 500 });
  }
}
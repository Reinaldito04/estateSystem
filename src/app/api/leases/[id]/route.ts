import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { calculateLeaseBalance } from "@/lib/lease-balance";

const leaseUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  contractNumber: z.string().min(1).optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  monthlyCanonAmount: z.number().positive().optional(),
  depositAmount: z.number().min(0).optional(),
  reservationAmount: z.number().min(0).optional(),
  contractFeeAmount: z.number().min(0).optional(),
  contractFileUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  contractStatus: z.enum(["DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  renewalMode: z.enum(["MANUAL", "AUTOMATIC"]).optional(),
  renewalNoticeDays: z.number().int().min(1).max(365).optional(),
  priceAdjustmentType: z.enum(["NONE", "IPC", "FIXED_PERCENT", "INDEX"]).optional(),
  priceAdjustmentValue: z.number().min(0).nullable().optional(),
  priceAdjustmentIndex: z.string().optional(),
  nextAdjustmentDate: z.string().transform((s) => new Date(s)).nullable().optional(),
  guarantorRequired: z.boolean().optional(),
  guarantorName: z.string().optional(),
  guarantorDocumentId: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email().optional().or(z.literal("")),
  templateId: z.string().uuid().nullable().optional(),
  draftContent: z.string().optional(),
  signatureProvider: z.string().optional(),
  signatureEnvelopeId: z.string().optional(),
  signatureStatus: z.enum(["NOT_REQUIRED", "PENDING", "SENT", "SIGNED", "DECLINED", "EXPIRED"]).optional(),
  signedAt: z.string().transform((s) => new Date(s)).nullable().optional(),
  signedIp: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            owner: { select: { id: true, fullName: true, phone: true, email: true } },
          },
        },
        tenant: true,
        transactions: {
          orderBy: { paymentDate: "desc" },
        },
        notices: {
          orderBy: { issueDate: "desc" },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
        _count: { select: { transactions: true, notices: true } },
        template: { select: { id: true, name: true, contractType: true } },
        signatureEvents: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...lease,
      balance: calculateLeaseBalance(
        lease.startDate,
        lease.endDate,
        Number(lease.monthlyCanonAmount),
        lease.transactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
        })),
      ),
    });
  } catch (error) {
    console.error("Error fetching lease:", error);
    return NextResponse.json({ error: "Error al obtener contrato" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = leaseUpdateSchema.parse(body);

    if (validatedData.contractNumber) {
      const existingLease = await prisma.lease.findFirst({
        where: { contractNumber: validatedData.contractNumber, NOT: { id } },
      });
      if (existingLease) {
        return NextResponse.json(
          { error: "Ya existe un contrato con este número" },
          { status: 400 }
        );
      }
    }

    const updateData: Prisma.LeaseUpdateInput = { ...validatedData };
    if (validatedData.monthlyCanonAmount) {
      updateData.monthlyCanonAmount = new Prisma.Decimal(validatedData.monthlyCanonAmount);
    }
    if (validatedData.depositAmount !== undefined) {
      updateData.depositAmount = new Prisma.Decimal(validatedData.depositAmount);
    }
    if (validatedData.reservationAmount !== undefined) {
      updateData.reservationAmount = new Prisma.Decimal(validatedData.reservationAmount);
    }
    if (validatedData.contractFeeAmount !== undefined) {
      updateData.contractFeeAmount = new Prisma.Decimal(validatedData.contractFeeAmount);
    }
    if (validatedData.priceAdjustmentValue !== undefined) {
      updateData.priceAdjustmentValue = validatedData.priceAdjustmentValue === null ? null : new Prisma.Decimal(validatedData.priceAdjustmentValue);
    }

    const lease = await prisma.lease.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        tenant: { select: { id: true, fullName: true, phone: true, email: true } },
        _count: { select: { transactions: true, notices: true } },
      },
    });

    return NextResponse.json(lease);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating lease:", error);
    return NextResponse.json({ error: "Error al actualizar contrato" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: { transactions: true, notices: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    if (lease.transactions.length > 0 || lease.notices.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un contrato que tiene transacciones o notificaciones asociadas" },
        { status: 400 }
      );
    }

    await prisma.lease.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lease:", error);
    return NextResponse.json({ error: "Error al eliminar contrato" }, { status: 500 });
  }
}
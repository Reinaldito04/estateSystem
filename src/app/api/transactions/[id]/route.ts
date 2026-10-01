import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const transactionUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  leaseId: z.string().uuid().optional().nullable(),
  category: z.enum([
    "RENT_CANON",
    "RESERVATION",
    "SECURITY_DEPOSIT",
    "CONTRACT_FEE",
    "CONDO_FEE",
    "ELECTRICITY",
    "INTERNET",
    "OTHER_SERVICE",
  ]).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
  paymentDate: z.string().transform((s) => new Date(s)).optional(),
  dueDate: z.string().transform((s) => new Date(s)).optional().nullable(),
  paymentMethod: z.string().min(1).optional(),
  referenceNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, code: true, title: true } },
        lease: { select: { id: true, contractNumber: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json({ error: "Error al obtener transacción" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = transactionUpdateSchema.parse(body);
    const { leaseId, amount, dueDate, ...rest } = validatedData;

    const updateData: Prisma.TransactionUpdateInput = {
      ...rest,
      ...(leaseId !== undefined && {
        lease: leaseId ? { connect: { id: leaseId } } : { disconnect: true },
      }),
      ...(dueDate !== undefined && { dueDate }),
    };
    if (amount !== undefined) {
      updateData.amount = new Prisma.Decimal(amount);
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true } },
        lease: { select: { id: true, contractNumber: true } },
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Error al actualizar transacción" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 });
  }
}
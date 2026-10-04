import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requiredDate, optionalDate, spanishEnum } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError, notFoundResponse } from "@/lib/domain-error";
import { assertTransactionLinks } from "@/lib/payment-rules";

const transactionUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  leaseId: z.string().uuid().optional().nullable(),
  category: spanishEnum(
    [
      "RENT_CANON",
      "RESERVATION",
      "SECURITY_DEPOSIT",
      "CONTRACT_FEE",
      "CONDO_FEE",
      "ELECTRICITY",
      "INTERNET",
      "OTHER_SERVICE",
    ],
    "Selecciona una categoría válida",
  ).optional(),
  amount: z.number().positive("Monto debe ser positivo").optional(),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
  paymentDate: requiredDate("La fecha de pago es requerida").optional(),
  dueDate: optionalDate(),
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
    if (!isUuid(id)) return notFoundResponse();
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
    if (!isUuid(id)) return notFoundResponse();
    const body = await request.json();
    const validatedData = transactionUpdateSchema.parse(body);
    const current = await prisma.transaction.findUnique({ where: { id }, select: { propertyId: true, leaseId: true } });
    if (!current) return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    await assertTransactionLinks(validatedData.propertyId ?? current.propertyId, validatedData.leaseId === undefined ? current.leaseId : validatedData.leaseId);
    const { leaseId, amount, dueDate, ...rest } = validatedData;

    const updateData: Prisma.TransactionUpdateInput = {
      ...rest,
      ...(rest.category !== undefined && { category: rest.category as Prisma.TransactionUpdateInput["category"] }),
      ...(leaseId !== undefined && {
        lease: leaseId ? { connect: { id: leaseId } } : { disconnect: true },
      }),
      ...(dueDate !== undefined && { dueDate }),
    } as Prisma.TransactionUpdateInput;
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

    const user = await getCurrentUser();
    await recordAudit({ entityType: "Transaction", entityId: id, action: "UPDATE", userId: user?.id, changes: validatedData, request });
    return NextResponse.json(transaction);
  } catch (error) {
    return handleRouteError(error, "Error al actualizar transacción");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    await prisma.transaction.delete({ where: { id } });
    const user = await getCurrentUser();
    await recordAudit({ entityType: "Transaction", entityId: id, action: "DELETE", userId: user?.id, request });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Error al eliminar transacción");
  }
}
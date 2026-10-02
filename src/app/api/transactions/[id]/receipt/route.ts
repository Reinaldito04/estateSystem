import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createReceiptDocument } from "@/lib/lease-document-pdf";
import { pdfResponse } from "@/lib/pdf-response";
import { handleRouteError } from "@/lib/domain-error";
import { nextDocumentNumber } from "@/lib/document-sequence";

export const runtime = "nodejs";

const CATEGORY_LABELS: Record<string, string> = {
  RENT_CANON: "Canon",
  RESERVATION: "Reserva",
  SECURITY_DEPOSIT: "Depósito",
  CONTRACT_FEE: "Gastos de contrato",
  CONDO_FEE: "Condominio",
  ELECTRICITY: "Electricidad",
  INTERNET: "Internet",
  OTHER_SERVICE: "Otro servicio",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        property: { select: { code: true, title: true, deletedAt: true } },
        lease: { select: { contractNumber: true, deletedAt: true } },
      },
    });
    if (!transaction || transaction.property.deletedAt) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    let receiptNumber = transaction.receiptNumber;
    if (!receiptNumber) {
      receiptNumber = await nextDocumentNumber("RECEIPT", transaction.paymentDate);
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { receiptNumber, receiptIssuedAt: new Date() },
      });
    }

    const buffer = await renderToBuffer(
      createReceiptDocument({
        agencyName: process.env.AGENCY_NAME || "Inmobiliaria",
        receiptNumber,
        paymentDate: transaction.paymentDate,
        propertyLabel: `${transaction.property.code} - ${transaction.property.title}`,
        contractNumber: transaction.lease && !transaction.lease.deletedAt ? transaction.lease.contractNumber : null,
        category: CATEGORY_LABELS[transaction.category] || transaction.category,
        amount: `${transaction.currency} ${Number(transaction.amount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
        status: transaction.status,
        method: transaction.paymentMethod,
        reference: transaction.referenceNumber,
        description: transaction.description,
      }),
    );
    return pdfResponse(buffer, `recibo-${transaction.id.slice(0, 8)}.pdf`);
  } catch (error) {
    return handleRouteError(error, "No se pudo generar el recibo");
  }
}

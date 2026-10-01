import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { calculateLeaseBalance } from "@/lib/lease-balance";

const leaseUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  clientProfileId: z.string().uuid().optional(),
  contractNumber: z.string().min(1).optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  monthlyCanonAmount: z.number().positive().optional(),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).optional(),
  depositAmount: z.number().min(0).optional(),
  reservationAmount: z.number().min(0).optional(),
  contractFeeAmount: z.number().min(0).optional(),
  contractFileUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  contractStatus: z.enum(["DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "ACTIVE", "EXPIRED", "TERMINATED", "CANCELLED"]).optional(),
  renewalMode: z.enum(["MANUAL", "AUTOMATIC", "NONE"]).optional(),
  renewalNoticeDays: z.number().int().min(1).max(365).optional(),
  priceAdjustmentType: z.enum(["NONE", "IPC", "FIXED_PERCENT", "FIXED_AMOUNT", "PERCENTAGE", "INDEX"]).optional(),
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

const CONTRACT_STATUS_MAP = {
  DRAFT: "DRAFT",
  IN_REVIEW: "PENDING_SIGNATURE",
  PENDING_SIGNATURE: "PENDING_SIGNATURE",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  TERMINATED: "TERMINATED",
  CANCELLED: "CANCELLED",
} as const;

const PRICE_ADJUSTMENT_MAP = {
  NONE: "NONE",
  IPC: "INDEX",
  FIXED_PERCENT: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  PERCENTAGE: "PERCENTAGE",
  INDEX: "INDEX",
} as const;

async function validateClient(clientProfileId: string) {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    select: { id: true, fullName: true, legalDocumentId: true, email: true, phone: true, role: true },
  });
  if (!client || client.role !== "TENANT") {
    throw new Error("El cliente seleccionado debe tener el rol Inquilino");
  }

  return client;
}

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
        leaseClients: { where: { role: "TENANT" }, include: { client: true } },
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
        signature: true,
        guarantors: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    const { leaseClients, signature, guarantors, ...leaseData } = lease;
    const guarantor = guarantors[0];
    return NextResponse.json({
      ...leaseData,
      clientProfileId: leaseClients[0]?.client.id || null,
      tenant: leaseClients[0]?.client || null,
      guarantors,
      signature,
      guarantorRequired: guarantors.length > 0,
      guarantorName: guarantor?.fullName ?? null,
      guarantorDocumentId: guarantor?.legalDocumentId ?? null,
      guarantorPhone: guarantor?.phone ?? null,
      guarantorEmail: guarantor?.email ?? null,
      signatureStatus: signature?.status ?? "NOT_REQUIRED",
      signatureProvider: signature?.provider ?? null,
      signatureEnvelopeId: signature?.envelopeId ?? null,
      signatureMethod: signature?.method ?? "NONE",
      signedBy: signature?.signedBy ?? null,
      signatureHash: signature?.signatureHash ?? null,
      signatureData: signature?.signatureData ?? null,
      signatureConsentAt: signature?.signatureConsentAt ?? null,
      signedAt: signature?.signedAt ?? null,
      signedIp: signature?.signedIp ?? null,
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

    const {
      clientProfileId,
      guarantorRequired,
      guarantorName,
      guarantorDocumentId,
      guarantorPhone,
      guarantorEmail,
      signatureProvider,
      signatureEnvelopeId,
      signatureStatus,
      signedAt,
      signedIp,
      contractStatus,
      priceAdjustmentType,
      ...leaseFields
    } = validatedData;

    const updateData: Prisma.LeaseUpdateInput = {
      ...leaseFields,
      ...(contractStatus !== undefined && { contractStatus: CONTRACT_STATUS_MAP[contractStatus] }),
      ...(priceAdjustmentType !== undefined && { priceAdjustmentType: PRICE_ADJUSTMENT_MAP[priceAdjustmentType] }),
    };
    if (clientProfileId) {
      await validateClient(clientProfileId);
      updateData.leaseClients = {
        deleteMany: { role: "TENANT" },
        create: { clientId: clientProfileId, role: "TENANT" },
      };
    }
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

    const hasGuarantorInput =
      guarantorRequired !== undefined ||
      guarantorName !== undefined ||
      guarantorDocumentId !== undefined ||
      guarantorPhone !== undefined ||
      guarantorEmail !== undefined;

    if (hasGuarantorInput) {
      const shouldKeepGuarantor = guarantorRequired === true || (guarantorRequired === undefined && Boolean(guarantorName));
      if (shouldKeepGuarantor && guarantorName) {
        updateData.guarantors = {
          deleteMany: {},
          create: {
            fullName: guarantorName,
            legalDocumentId: guarantorDocumentId,
            phone: guarantorPhone,
            email: guarantorEmail || null,
          },
        };
      } else if (guarantorRequired === false) {
        updateData.guarantors = { deleteMany: {} };
      }
    }

    const hasSignatureInput =
      signatureProvider !== undefined ||
      signatureEnvelopeId !== undefined ||
      signatureStatus !== undefined ||
      signedAt !== undefined ||
      signedIp !== undefined;

    if (hasSignatureInput) {
      const status = signatureStatus ?? "NOT_REQUIRED";
      if (status === "NOT_REQUIRED") {
        await prisma.leaseSignature.deleteMany({ where: { leaseId: id } });
      } else {
        updateData.signature = {
          upsert: {
            create: {
              provider: signatureProvider,
              envelopeId: signatureEnvelopeId,
              status,
              signedAt: signedAt ?? undefined,
              signedIp,
            },
            update: {
              ...(signatureProvider !== undefined && { provider: signatureProvider }),
              ...(signatureEnvelopeId !== undefined && { envelopeId: signatureEnvelopeId }),
              status,
              ...(signedAt !== undefined && { signedAt }),
              ...(signedIp !== undefined && { signedIp }),
            },
          },
        };
      }
    }

    const lease = await prisma.lease.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, legalDocumentId: true, phone: true, email: true } } } },
        guarantors: true,
        signature: true,
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

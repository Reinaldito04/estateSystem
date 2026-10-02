import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requiredDate, optionalDate } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { calculateLeaseBalance } from "@/lib/lease-balance";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError } from "@/lib/domain-error";
import {
  assertDateOrder,
  assertGuarantor,
  assertNoActiveOverlap,
  assertPropertyLeasable,
  assertStatusTransition,
  isLeaseActive,
  loadEligibleTenant,
  normalizeContractStatus,
  syncPropertyOccupancy,
} from "@/lib/lease-workflow";

const leaseUpdateSchema = z.object({
  propertyId: z.string().uuid().optional(),
  clientProfileId: z.string().uuid().optional(),
  contractNumber: z.string().min(1).optional(),
  startDate: requiredDate().optional(),
  endDate: requiredDate().optional(),
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
  nextAdjustmentDate: optionalDate(),
  guarantorRequired: z.boolean().optional(),
  guarantorName: z.string().optional(),
  guarantorDocumentId: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email("Correo del fiador inválido").optional().or(z.literal("")),
  templateId: z.string().uuid().nullable().optional(),
  draftContent: z.string().optional(),
  signatureProvider: z.string().optional(),
  signatureEnvelopeId: z.string().optional(),
  signatureStatus: z.enum(["NOT_REQUIRED", "PENDING", "SENT", "SIGNED", "DECLINED", "EXPIRED"]).optional(),
  signedAt: optionalDate(),
  signedIp: z.string().optional(),
});

const PRICE_ADJUSTMENT_MAP = {
  NONE: "NONE",
  IPC: "INDEX",
  FIXED_PERCENT: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  PERCENTAGE: "PERCENTAGE",
  INDEX: "INDEX",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lease = await prisma.lease.findFirst({
      where: { id, deletedAt: null },
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
          category: transaction.category,
          amount: Number(transaction.amount),
          paymentDate: transaction.paymentDate,
          status: transaction.status,
          currency: transaction.currency,
        })),
        new Date(),
        lease.currency,
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
    const current = await prisma.lease.findFirst({ where: { id, deletedAt: null } });
    if (!current) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    const nextStatus = validatedData.contractStatus
      ? normalizeContractStatus(validatedData.contractStatus)
      : current.contractStatus;
    assertStatusTransition(current.contractStatus, nextStatus);
    const startDate = validatedData.startDate ?? current.startDate;
    const endDate = validatedData.endDate ?? current.endDate;
    const propertyId = validatedData.propertyId ?? current.propertyId;
    assertDateOrder(startDate, endDate);
    if (validatedData.propertyId) await assertPropertyLeasable(validatedData.propertyId);
    if (nextStatus === "ACTIVE") await assertNoActiveOverlap(propertyId, startDate, endDate, id);

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
      priceAdjustmentType,
      ...leaseFields
    } = validatedData;

    const updateData: Prisma.LeaseUpdateInput = {
      ...leaseFields,
      contractStatus: nextStatus,
      isActive: isLeaseActive(nextStatus),
      ...(priceAdjustmentType !== undefined && { priceAdjustmentType: PRICE_ADJUSTMENT_MAP[priceAdjustmentType] }),
    };
    if (clientProfileId) {
      await loadEligibleTenant(clientProfileId);
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
      const requiresGuarantor = guarantorRequired === true;
      assertGuarantor(requiresGuarantor, guarantorName);
      const shouldKeepGuarantor = requiresGuarantor || (guarantorRequired === undefined && Boolean(guarantorName));
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

    if (nextStatus !== "ACTIVE" || validatedData.propertyId) {
      await syncPropertyOccupancy(lease.propertyId);
      if (current.propertyId !== lease.propertyId) await syncPropertyOccupancy(current.propertyId);
    }
    const user = await getCurrentUser();
    await recordAudit({
      entityType: "Lease",
      entityId: id,
      action: "UPDATE",
      userId: user?.id,
      changes: { contractStatus: nextStatus },
      request,
    });

    return NextResponse.json(lease);
  } catch (error) {
    return handleRouteError(error, "Error al actualizar contrato");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lease = await prisma.lease.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, propertyId: true, contractStatus: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    await prisma.lease.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        ...(lease.contractStatus === "ACTIVE" ? { contractStatus: "CANCELLED" } : {}),
      },
    });
    await syncPropertyOccupancy(lease.propertyId);
    const user = await getCurrentUser();
    await recordAudit({ entityType: "Lease", entityId: id, action: "DELETE", userId: user?.id, request });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Error al eliminar contrato");
  }
}

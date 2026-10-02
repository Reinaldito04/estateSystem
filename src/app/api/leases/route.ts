import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requiredDate, optionalDate } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { calculateLeaseBalance } from "@/lib/lease-balance";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError } from "@/lib/domain-error";
import { parsePagination } from "@/lib/pagination";
import {
  assertCreatableStatus,
  assertDateOrder,
  assertGuarantor,
  assertPropertyLeasable,
  isLeaseActive,
  loadEligibleTenant,
  normalizeContractStatus,
} from "@/lib/lease-workflow";

const leaseSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  clientProfileId: z.string().uuid("Cliente inquilino es requerido"),
  contractNumber: z.string().min(1, "Número de contrato es requerido"),
  startDate: requiredDate("La fecha de inicio es requerida"),
  endDate: requiredDate("La fecha de fin es requerida"),
  monthlyCanonAmount: z.number().positive("Canon mensual debe ser positivo"),
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).default("USD"),
  depositAmount: z.number().min(0).default(0),
  reservationAmount: z.number().min(0).default(0),
  contractFeeAmount: z.number().min(0).default(0),
  contractFileUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  contractStatus: z.enum(["DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "ACTIVE", "EXPIRED", "TERMINATED", "CANCELLED"]).default("DRAFT"),
  renewalMode: z.enum(["MANUAL", "AUTOMATIC", "NONE"]).default("MANUAL"),
  renewalNoticeDays: z.number().int().min(1).max(365).default(30),
  priceAdjustmentType: z.enum(["NONE", "IPC", "FIXED_PERCENT", "FIXED_AMOUNT", "PERCENTAGE", "INDEX"]).default("NONE"),
  priceAdjustmentValue: z.number().min(0).nullable().optional(),
  priceAdjustmentIndex: z.string().optional(),
  nextAdjustmentDate: optionalDate(),
  guarantorRequired: z.boolean().default(false),
  guarantorName: z.string().optional(),
  guarantorDocumentId: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email("Correo del fiador inválido").optional().or(z.literal("")),
  templateId: z.string().uuid().nullable().optional(),
  draftContent: z.string().optional(),
  signatureProvider: z.string().optional(),
  signatureEnvelopeId: z.string().optional(),
  signatureStatus: z.enum(["NOT_REQUIRED", "PENDING", "SENT", "SIGNED", "DECLINED", "EXPIRED"]).default("NOT_REQUIRED"),
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

function toBalanceInput(transaction: { category: string; amount: unknown; paymentDate: Date; status: string; currency: string }) {
  return {
    category: transaction.category,
    amount: Number(transaction.amount),
    paymentDate: transaction.paymentDate,
    status: transaction.status,
    currency: transaction.currency,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const propertyId = searchParams.get("propertyId") || "";
    const tenantId = searchParams.get("tenantId") || "";
    const where: Prisma.LeaseWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { contractNumber: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { code: { contains: search, mode: "insensitive" } } },
          { leaseClients: { some: { role: "TENANT", client: { fullName: { contains: search, mode: "insensitive" } } } } },
        ],
      }),
      ...(status === "active" && { isActive: true }),
      ...(status === "expired" && { isActive: false }),
      ...(status === "expiring" && {
        isActive: true,
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
      ...(propertyId && { propertyId }),
      ...(tenantId && { leaseClients: { some: { clientId: tenantId, role: "TENANT" } } }),
    };

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { id: true, code: true, title: true, address: true } },
          leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, legalDocumentId: true, phone: true, email: true } } } },
          transactions: { select: { category: true, amount: true, paymentDate: true, status: true, currency: true } },
          _count: { select: { transactions: true, notices: true } },
          template: { select: { id: true, name: true, contractType: true } },
          signature: true,
          guarantors: true,
        },
      }),
      prisma.lease.count({ where }),
    ]);

    return NextResponse.json({
      data: leases.map(({ transactions, ...lease }) => ({
        ...lease,
        clientProfileId: lease.leaseClients[0]?.client.id || null,
        tenant: lease.leaseClients[0]?.client || null,
        leaseClients: undefined,
        signatureStatus: lease.signature?.status ?? "NOT_REQUIRED",
        signatureProvider: lease.signature?.provider ?? null,
        guarantorName: lease.guarantors[0]?.fullName ?? null,
        balance: calculateLeaseBalance(
          lease.startDate,
          lease.endDate,
          Number(lease.monthlyCanonAmount),
          transactions.map(toBalanceInput),
          new Date(),
          lease.currency,
        ),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leases:", error);
    return NextResponse.json({ error: "Error al obtener contratos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = leaseSchema.parse(body);
    const contractStatus = normalizeContractStatus(validatedData.contractStatus);
    assertCreatableStatus(contractStatus);
    assertDateOrder(validatedData.startDate, validatedData.endDate);
    assertGuarantor(validatedData.guarantorRequired, validatedData.guarantorName);
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
      ...leaseData
    } = validatedData;
    await loadEligibleTenant(clientProfileId);
    await assertPropertyLeasable(validatedData.propertyId);

    const existingLease = await prisma.lease.findUnique({
      where: { contractNumber: validatedData.contractNumber },
    });

    if (existingLease) {
      return NextResponse.json(
        { error: "Ya existe un contrato con este número" },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.create({
      data: {
        ...leaseData,
        contractStatus,
        isActive: isLeaseActive(contractStatus),
        priceAdjustmentType: PRICE_ADJUSTMENT_MAP[leaseData.priceAdjustmentType],
        leaseClients: { create: { clientId: clientProfileId, role: "TENANT" } },
        ...(guarantorRequired && guarantorName
          ? {
              guarantors: {
                create: {
                  fullName: guarantorName,
                  legalDocumentId: guarantorDocumentId,
                  phone: guarantorPhone,
                  email: guarantorEmail || null,
                },
              },
            }
          : {}),
        ...(signatureStatus !== "NOT_REQUIRED"
          ? {
              signature: {
                create: {
                  provider: signatureProvider,
                  envelopeId: signatureEnvelopeId,
                  status: signatureStatus,
                  signedAt: signedAt ?? undefined,
                  signedIp,
                },
              },
            }
          : {}),
        monthlyCanonAmount: new Prisma.Decimal(leaseData.monthlyCanonAmount),
        depositAmount: new Prisma.Decimal(leaseData.depositAmount),
        reservationAmount: new Prisma.Decimal(leaseData.reservationAmount),
        contractFeeAmount: new Prisma.Decimal(leaseData.contractFeeAmount),
        priceAdjustmentValue: leaseData.priceAdjustmentValue === null || leaseData.priceAdjustmentValue === undefined ? null : new Prisma.Decimal(leaseData.priceAdjustmentValue),
      },
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, legalDocumentId: true, phone: true, email: true } } } },
        guarantors: true,
        signature: true,
        _count: { select: { transactions: true, notices: true } },
      },
    });

    const user = await getCurrentUser();
    await recordAudit({ entityType: "Lease", entityId: lease.id, action: "CREATE", userId: user?.id, changes: { contractNumber: lease.contractNumber, contractStatus }, request });
    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Error al crear contrato");
  }
}
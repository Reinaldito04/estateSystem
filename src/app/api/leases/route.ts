import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { calculateLeaseBalance } from "@/lib/lease-balance";

const leaseSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  clientProfileId: z.string().uuid("Cliente inquilino es requerido"),
  contractNumber: z.string().min(1, "Número de contrato es requerido"),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  monthlyCanonAmount: z.number().positive("Canon mensual debe ser positivo"),
  depositAmount: z.number().min(0).default(0),
  reservationAmount: z.number().min(0).default(0),
  contractFeeAmount: z.number().min(0).default(0),
  contractFileUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  contractStatus: z.enum(["DRAFT", "IN_REVIEW", "PENDING_SIGNATURE", "ACTIVE", "EXPIRED", "CANCELLED"]).default("DRAFT"),
  renewalMode: z.enum(["MANUAL", "AUTOMATIC"]).default("MANUAL"),
  renewalNoticeDays: z.number().int().min(1).max(365).default(30),
  priceAdjustmentType: z.enum(["NONE", "IPC", "FIXED_PERCENT", "INDEX"]).default("NONE"),
  priceAdjustmentValue: z.number().min(0).nullable().optional(),
  priceAdjustmentIndex: z.string().optional(),
  nextAdjustmentDate: z.string().transform((s) => new Date(s)).nullable().optional(),
  guarantorRequired: z.boolean().default(false),
  guarantorName: z.string().optional(),
  guarantorDocumentId: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email().optional().or(z.literal("")),
  templateId: z.string().uuid().nullable().optional(),
  draftContent: z.string().optional(),
  signatureProvider: z.string().optional(),
  signatureEnvelopeId: z.string().optional(),
  signatureStatus: z.enum(["NOT_REQUIRED", "PENDING", "SENT", "SIGNED", "DECLINED", "EXPIRED"]).default("NOT_REQUIRED"),
  signedAt: z.string().transform((s) => new Date(s)).nullable().optional(),
  signedIp: z.string().optional(),
});

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const propertyId = searchParams.get("propertyId") || "";
    const tenantId = searchParams.get("tenantId") || "";
    const skip = (page - 1) * limit;

    const where: Prisma.LeaseWhereInput = {
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
          transactions: { select: { category: true, amount: true, paymentDate: true } },
          _count: { select: { transactions: true, notices: true } },
          template: { select: { id: true, name: true, contractType: true } },
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
        balance: calculateLeaseBalance(
          lease.startDate,
          lease.endDate,
          Number(lease.monthlyCanonAmount),
          transactions.map((transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
          })),
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
    const { clientProfileId, ...leaseData } = validatedData;
    await validateClient(clientProfileId);

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
        leaseClients: { create: { clientId: clientProfileId, role: "TENANT" } },
        monthlyCanonAmount: new Prisma.Decimal(leaseData.monthlyCanonAmount),
        depositAmount: new Prisma.Decimal(leaseData.depositAmount),
        reservationAmount: new Prisma.Decimal(leaseData.reservationAmount),
        contractFeeAmount: new Prisma.Decimal(leaseData.contractFeeAmount),
        priceAdjustmentValue: leaseData.priceAdjustmentValue === null || leaseData.priceAdjustmentValue === undefined ? null : new Prisma.Decimal(leaseData.priceAdjustmentValue),
      },
      include: {
        property: { select: { id: true, code: true, title: true, address: true } },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, legalDocumentId: true, phone: true, email: true } } } },
        _count: { select: { transactions: true, notices: true } },
      },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating lease:", error);
    return NextResponse.json({ error: "Error al crear contrato" }, { status: 500 });
  }
}
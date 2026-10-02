import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { clientStatusToUi, toClientStatus } from "@/lib/enum-mapping";

const clientUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  legalDocumentId: z.string().min(1).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "COMMON_LAW"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(["TENANT", "BUYER", "PROSPECT", "GUARANTOR"]).optional(),
  status: z.string().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  riskSummary: z.string().optional(),
  notes: z.string().optional(),
  workPlace: z.string().optional(),
  monthlyIncome: z.coerce.number().min(0).optional().nullable(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredPropertyType: z.string().optional(),
  maxBudget: z.coerce.number().min(0).optional().nullable(),
  housingRequirement: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.clientProfile.findUnique({
      where: { id },
      include: {
        references: { orderBy: { createdAt: "desc" } },
        communications: { orderBy: { createdAt: "desc" } },
        riskDocuments: { orderBy: { uploadedAt: "desc" } },
        leaseClients: {
          where: { role: "TENANT" },
          orderBy: { createdAt: "desc" },
          include: {
            lease: {
              select: {
                id: true,
                contractNumber: true,
                startDate: true,
                endDate: true,
                monthlyCanonAmount: true,
                contractStatus: true,
                isActive: true,
                property: { select: { id: true, code: true, title: true, address: true } },
                transactions: {
                  orderBy: { paymentDate: "desc" },
                  select: { id: true, amount: true, category: true, paymentDate: true, paymentMethod: true, description: true },
                },
              },
            },
          },
        },
        propertyIssues: {
          orderBy: { reportDate: "desc" },
          select: { id: true, issueType: true, description: true, status: true, reportDate: true, property: { select: { code: true, title: true } } },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
          select: { id: true, documentName: true, fileUrl: true, uploadedAt: true },
        },
        _count: { select: { communications: true, references: true, riskDocuments: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...client,
      status: clientStatusToUi(client.status),
      tenantOperations: client.role === "TENANT"
        ? {
            id: client.id,
            leases: client.leaseClients.map(({ lease }) => ({
              ...lease,
              monthlyCanonAmount: Number(lease.monthlyCanonAmount),
              transactions: lease.transactions.map((transaction) => ({
                ...transaction,
                amount: Number(transaction.amount),
              })),
            })),
            propertyIssues: client.propertyIssues,
            documents: client.documents,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = clientUpdateSchema.parse(body);
    const { monthlyIncome, maxBudget, ...clientPayload } = validatedData;

    if (validatedData.legalDocumentId) {
      const existingClient = await prisma.clientProfile.findFirst({
        where: { legalDocumentId: validatedData.legalDocumentId, NOT: { id } },
      });

      if (existingClient) {
        return NextResponse.json(
          { error: "Ya existe un cliente con esta identificación legal" },
          { status: 400 }
        );
      }
    }

    const client = await prisma.clientProfile.update({
      where: { id },
      data: {
        ...clientPayload,
        status: clientPayload.status === undefined ? undefined : toClientStatus(clientPayload.status),
        email: clientPayload.email === "" ? null : clientPayload.email,
        monthlyIncome:
          monthlyIncome !== undefined && monthlyIncome !== null
            ? new Prisma.Decimal(monthlyIncome)
            : monthlyIncome === null
              ? null
              : undefined,
        maxBudget:
          maxBudget !== undefined && maxBudget !== null
            ? new Prisma.Decimal(maxBudget)
            : maxBudget === null
              ? null
              : undefined,
      },
      include: {
        _count: { select: { communications: true, references: true, riskDocuments: true } },
      },
    });

    return NextResponse.json({ ...client, status: clientStatusToUi(client.status) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.clientProfile.findUnique({ where: { id } });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    await prisma.clientProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}

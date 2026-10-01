import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { clientStatusToUi, toClientStatus } from "@/lib/enum-mapping";

const clientSchema = z.object({
  fullName: z.string().min(1, "El nombre es requerido"),
  legalDocumentId: z.string().min(1, "La identificación legal es requerida"),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "COMMON_LAW"]).optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "El teléfono es requerido"),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(["TENANT", "BUYER", "PROSPECT", "GUARANTOR"]).default("PROSPECT"),
  status: z.string().default("active"),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  riskSummary: z.string().optional(),
  notes: z.string().optional(),
  workPlace: z.string().optional(),
  monthlyIncome: z.coerce.number().positive().optional().nullable(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredPropertyType: z.string().optional(),
  maxBudget: z.coerce.number().positive().optional().nullable(),
  housingRequirement: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const skip = (page - 1) * limit;

    const where: Prisma.ClientProfileWhereInput = {
      ...(role === "TENANT" && { role: "TENANT" }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { legalDocumentId: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.clientProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { communications: true, references: true, riskDocuments: true } },
        },
      }),
      prisma.clientProfile.count({ where }),
    ]);

    return NextResponse.json({
      data: clients.map((client) => ({ ...client, status: clientStatusToUi(client.status) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = clientSchema.parse(body);
    const { monthlyIncome, maxBudget, ...clientPayload } = validatedData;

    const existingClient = await prisma.clientProfile.findUnique({
      where: { legalDocumentId: validatedData.legalDocumentId },
    });

    if (existingClient) {
      return NextResponse.json(
        { error: "Ya existe un cliente con esta identificación legal" },
        { status: 400 }
      );
    }

    const client = await prisma.clientProfile.create({
      data: {
        ...clientPayload,
        status: toClientStatus(clientPayload.status),
        monthlyIncome: monthlyIncome !== undefined && monthlyIncome !== null
          ? new Prisma.Decimal(monthlyIncome)
          : null,
        maxBudget: maxBudget !== undefined && maxBudget !== null
          ? new Prisma.Decimal(maxBudget)
          : null,
      },
      include: {
        _count: { select: { communications: true, references: true, riskDocuments: true } },
      },
    });

    return NextResponse.json({ ...client, status: clientStatusToUi(client.status) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}

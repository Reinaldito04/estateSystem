import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ownerSchema = z.object({
  fullName: z.string().min(1, "Nombre completo es requerido"),
  documentId: z.string().min(1, "Documento de identidad es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Teléfono es requerido"),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  bankDetails: z.string().optional(),
});

type ClientProfileRecord = {
  id: string;
  fullName: string;
  legalDocumentId: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  bankDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { properties: number };
};

function toOwner(profile: ClientProfileRecord) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    documentId: profile.legalDocumentId,
    email: profile.email,
    phone: profile.phone,
    alternatePhone: profile.alternatePhone,
    address: profile.address,
    bankDetails: profile.bankDetails,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    _count: profile._count ?? { properties: 0 },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where = {
      role: "OWNER" as const,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { legalDocumentId: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [owners, total] = await Promise.all([
      prisma.clientProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { properties: true } },
        },
      }),
      prisma.clientProfile.count({ where }),
    ]);

    return NextResponse.json({
      data: owners.map(toOwner),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json({ error: "Error al obtener propietarios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ownerSchema.parse(body);

    const existingOwner = await prisma.clientProfile.findUnique({
      where: { legalDocumentId: validatedData.documentId },
    });

    if (existingOwner) {
      return NextResponse.json(
        { error: "Ya existe un propietario con este documento de identidad" },
        { status: 400 }
      );
    }

    const owner = await prisma.clientProfile.create({
      data: {
        fullName: validatedData.fullName,
        legalDocumentId: validatedData.documentId,
        email: validatedData.email || null,
        phone: validatedData.phone,
        alternatePhone: validatedData.alternatePhone,
        address: validatedData.address,
        bankDetails: validatedData.bankDetails,
        role: "OWNER",
        status: "ACTIVE",
      },
      include: {
        _count: { select: { properties: true } },
      },
    });

    return NextResponse.json(toOwner(owner), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating owner:", error);
    return NextResponse.json({ error: "Error al crear propietario" }, { status: 500 });
  }
}

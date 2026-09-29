import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const transactionSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  leaseId: z.string().uuid().optional(),
  category: z.enum([
    "RENT_CANON",
    "RESERVATION",
    "SECURITY_DEPOSIT",
    "CONTRACT_FEE",
    "CONDO_FEE",
    "ELECTRICITY",
    "INTERNET",
    "OTHER_SERVICE",
  ]),
  amount: z.number().positive("Monto debe ser positivo"),
  paymentDate: z.string().transform((s) => new Date(s)),
  paymentMethod: z.string().min(1, "Método de pago es requerido"),
  referenceNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const propertyId = searchParams.get("propertyId") || "";
    const leaseId = searchParams.get("leaseId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      ...(search && {
        OR: [
          { referenceNumber: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { code: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(category && { category: category as Prisma.TransactionWhereInput["category"] }),
      ...(propertyId && { propertyId }),
      ...(leaseId && { leaseId }),
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const [transactions, total, totalAmount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          property: { select: { id: true, code: true, title: true } },
          lease: { select: { id: true, contractNumber: true } },
        },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: totalAmount._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Error al obtener transacciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = transactionSchema.parse(body);

    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        amount: new Prisma.Decimal(validatedData.amount),
      },
      include: {
        property: { select: { id: true, code: true, title: true } },
        lease: { select: { id: true, contractNumber: true } },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Error al crear transacción" }, { status: 500 });
  }
}
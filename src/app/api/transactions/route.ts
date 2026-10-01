import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const transactionSchema = z.object({
  propertyId: z.string().uuid("Inmueble es requerido"),
  leaseId: z.string().uuid().optional().nullable(),
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
  currency: z.enum(["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"]).default("USD"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).default("PAID"),
  paymentDate: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)).optional().nullable(),
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
    const status = searchParams.get("status") || "";
    const currency = searchParams.get("currency") || "";
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
      ...(status && { status: status as Prisma.TransactionWhereInput["status"] }),
      ...(currency && { currency: currency as Prisma.TransactionWhereInput["currency"] }),
      ...((startDate || endDate) && {
        paymentDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [transactions, total, totalsByCurrency] = await Promise.all([
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
      prisma.transaction.groupBy({
        by: ["currency"],
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
        byCurrency: totalsByCurrency.map((row) => ({
          currency: row.currency,
          total: row._sum.amount || 0,
        })),
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
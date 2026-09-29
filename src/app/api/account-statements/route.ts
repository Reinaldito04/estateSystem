import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId es requerido" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    const dateFilter: Prisma.TransactionWhereInput = {
      propertyId,
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const transactions = await prisma.transaction.findMany({
      where: dateFilter,
      orderBy: { paymentDate: "asc" },
      include: {
        lease: { select: { id: true, contractNumber: true } },
      },
    });

    const incomeCategories = ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE", "CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"];
    const expenseCategories = ["CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"];

    const income = transactions
      .filter((t) => incomeCategories.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => expenseCategories.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const issues = await prisma.propertyIssue.findMany({
      where: {
        propertyId,
        ...(startDate && endDate && {
          repairDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
    });

    const repairCosts = issues.reduce((sum, i) => sum + Number(i.repairCost), 0);

    const balance = income - expenses - repairCosts;

    return NextResponse.json({
      property,
      period: { startDate, endDate },
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        totalRepairCosts: repairCosts,
        balance,
      },
      transactions,
      issues,
    });
  } catch (error) {
    console.error("Error generating account statement:", error);
    return NextResponse.json({ error: "Error al generar estado de cuenta" }, { status: 500 });
  }
}
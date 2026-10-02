import { prisma } from "@/lib/prisma";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/account-statement";
import { calculateLeaseBalance } from "@/lib/lease-balance";

export const DEFAULT_COMMISSION_RATE = Number(process.env.AGENCY_COMMISSION_RATE || 0.1);

export type OwnerSettlementParams = {
  ownerId: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  currency?: string;
  commissionRate?: number;
};

export type OwnerSettlementPropertyLine = {
  propertyId: string;
  code: string;
  title: string;
  income: number;
  expenses: number;
  lateFees: number;
  commission: number;
  net: number;
};

export type OwnerSettlementResult = {
  owner: { id: string; fullName: string };
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  commissionRate: number;
  grossIncome: number;
  agencyCommission: number;
  expenses: number;
  lateFees: number;
  netPayout: number;
  properties: OwnerSettlementPropertyLine[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function buildOwnerSettlement(params: OwnerSettlementParams): Promise<OwnerSettlementResult> {
  const periodStart = new Date(params.periodStart);
  const periodEnd = new Date(params.periodEnd);
  const currency = params.currency || "USD";
  const commissionRate = params.commissionRate ?? DEFAULT_COMMISSION_RATE;

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    throw new Error("Período inválido");
  }
  if (periodStart > periodEnd) {
    throw new Error("La fecha de inicio no puede ser posterior a la de fin");
  }

  const owner = await prisma.clientProfile.findFirst({
    where: { id: params.ownerId, role: "OWNER", deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!owner) throw new Error("Propietario no encontrado");

  const properties = await prisma.property.findMany({
    where: { ownerId: params.ownerId, deletedAt: null },
    select: {
      id: true,
      code: true,
      title: true,
      leases: {
        where: { deletedAt: null },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          monthlyCanonAmount: true,
          currency: true,
          lateFeeType: true,
          lateFeeValue: true,
          lateFeeGraceDays: true,
          transactions: {
            where: {
              status: "PAID",
              paymentDate: { gte: periodStart, lte: periodEnd },
            },
            select: { category: true, amount: true, currency: true, paymentDate: true, status: true },
          },
        },
      },
      issues: {
        where: { reportDate: { gte: periodStart, lte: periodEnd } },
        select: { id: true, reportDate: true, repairCost: true },
      },
    },
  });

  // Transactions may exist without a lease (e.g. condo fees); fetch paid ones for the period
  const directTransactions = await prisma.transaction.findMany({
    where: {
      property: { ownerId: params.ownerId, deletedAt: null },
      status: "PAID",
      paymentDate: { gte: periodStart, lte: periodEnd },
      currency: currency as never,
    },
    select: { propertyId: true, category: true, amount: true, currency: true, paymentDate: true, status: true },
  });

  const lines: OwnerSettlementPropertyLine[] = properties.map((property) => {
    const periodTransactions = directTransactions.filter((t) => t.propertyId === property.id);
    const income = periodTransactions
      .filter((t) => (INCOME_CATEGORIES as readonly string[]).includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = periodTransactions
      .filter((t) => (EXPENSE_CATEGORIES as readonly string[]).includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const repairCosts = property.issues.reduce((sum, issue) => sum + Number(issue.repairCost), 0);

    const lateFees = property.leases.reduce((sum, lease) => {
      const balance = calculateLeaseBalance(
        lease.startDate,
        lease.endDate,
        Number(lease.monthlyCanonAmount),
        lease.transactions.map((t) => ({
          category: t.category,
          amount: Number(t.amount),
          paymentDate: t.paymentDate,
          status: t.status,
          currency: t.currency,
        })),
        periodEnd,
        lease.currency,
        { type: lease.lateFeeType, value: lease.lateFeeValue === null ? null : Number(lease.lateFeeValue), graceDays: lease.lateFeeGraceDays },
      );
      return sum + balance.lateFeeAmount;
    }, 0);

    const totalExpenses = round2(expenses + repairCosts);
    const commission = round2(income * commissionRate);
    const net = round2(income + lateFees - commission - totalExpenses);

    return {
      propertyId: property.id,
      code: property.code,
      title: property.title,
      income: round2(income),
      expenses: totalExpenses,
      lateFees: round2(lateFees),
      commission,
      net,
    };
  });

  const grossIncome = round2(lines.reduce((sum, line) => sum + line.income, 0));
  const expenses = round2(lines.reduce((sum, line) => sum + line.expenses, 0));
  const lateFees = round2(lines.reduce((sum, line) => sum + line.lateFees, 0));
  const agencyCommission = round2(lines.reduce((sum, line) => sum + line.commission, 0));
  const netPayout = round2(grossIncome + lateFees - agencyCommission - expenses);

  return {
    owner,
    periodStart,
    periodEnd,
    currency,
    commissionRate,
    grossIncome,
    agencyCommission,
    expenses,
    lateFees,
    netPayout,
    properties: lines,
  };
}

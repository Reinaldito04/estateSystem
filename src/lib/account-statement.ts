import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INCOME_CATEGORIES = ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"] as const;
export const EXPENSE_CATEGORIES = ["CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"] as const;

export type AccountStatementParams = {
  propertyId?: string | null;
  ownerId?: string | null;
  tenantId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

function sumByCurrency(
  transactions: { amount: unknown; currency: string; category: string }[],
  categories: readonly string[],
) {
  const map = new Map<string, number>();
  for (const transaction of transactions) {
    if (!categories.includes(transaction.category)) continue;
    map.set(transaction.currency, (map.get(transaction.currency) ?? 0) + Number(transaction.amount));
  }
  return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }));
}

export async function buildAccountStatement(params: AccountStatementParams) {
  const { propertyId, ownerId, tenantId, startDate, endDate } = params;

  if (!propertyId && !ownerId && !tenantId) {
    throw new Error("Se requiere propertyId, ownerId o tenantId");
  }

  const propertyWhere: Prisma.PropertyWhereInput = propertyId
    ? { id: propertyId }
    : ownerId
      ? { ownerId }
      : { leases: { some: { leaseClients: { some: { clientId: tenantId! } } } } };

  const properties = await prisma.property.findMany({
    where: propertyWhere,
    include: { owner: { select: { id: true, fullName: true, phone: true, email: true } } },
  });

  if (properties.length === 0) {
    throw new Error("No se encontraron inmuebles");
  }

  const propertyIds = properties.map((property) => property.id);
  const dateFilter =
    startDate || endDate
      ? {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        }
      : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      propertyId: propertyId ?? { in: propertyIds },
      ...(tenantId && { lease: { is: { leaseClients: { some: { clientId: tenantId } } } } }),
      ...(dateFilter && { paymentDate: dateFilter }),
    },
    orderBy: { paymentDate: "asc" },
    include: {
      property: { select: { id: true, code: true, title: true } },
      lease: { select: { id: true, contractNumber: true } },
    },
  });

  const issues = await prisma.propertyIssue.findMany({
    where: {
      propertyId: propertyId ?? { in: propertyIds },
      ...(dateFilter && { reportDate: dateFilter }),
    },
    include: { property: { select: { id: true, code: true, title: true } } },
  });

  const incomeByCurrency = sumByCurrency(transactions, INCOME_CATEGORIES);
  const expensesByCurrency = sumByCurrency(transactions, EXPENSE_CATEGORIES);
  const totalRepairCosts = issues.reduce((sum, issue) => sum + Number(issue.repairCost), 0);

  const scope = propertyId ? "PROPERTY" : ownerId ? "OWNER" : "TENANT";

  return {
    scope,
    property: propertyId ? properties[0] : null,
    properties,
    period: { startDate, endDate },
    summary: { incomeByCurrency, expensesByCurrency, totalRepairCosts },
    transactions,
    issues,
  };
}

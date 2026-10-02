import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLeaseBalance } from "@/lib/lease-balance";

const DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const horizon = new Date(now.getTime() + 90 * DAY);

    const [
      owners,
      tenants,
      properties,
      availableProperties,
      activeLeases,
      pendingIssues,
      monthTransactions,
      recentTransactions,
      expiringCandidates,
      analyticsProperties,
      sixMonthTransactions,
    ] = await Promise.all([
      prisma.clientProfile.count({ where: { role: "OWNER", deletedAt: null } }),
      prisma.clientProfile.count({ where: { role: "TENANT", deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { status: "AVAILABLE", deletedAt: null } }),
      prisma.lease.count({ where: { isActive: true, deletedAt: null } }),
      prisma.propertyIssue.count({ where: { status: { in: ["REPORTED", "IN_PROGRESS"] } } }),
      prisma.transaction.groupBy({
        by: ["currency"],
        where: { status: "PAID", paymentDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { property: { select: { code: true, title: true } } },
      }),
      prisma.lease.findMany({
        where: { isActive: true, deletedAt: null, endDate: { gte: now, lte: horizon } },
        include: {
          property: { select: { code: true, title: true } },
          leaseClients: { where: { role: "TENANT" }, select: { client: { select: { fullName: true } } } },
        },
        orderBy: { endDate: "asc" },
      }),
      prisma.property.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          createdAt: true,
          leases: {
            where: { deletedAt: null },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              monthlyCanonAmount: true,
              currency: true,
              isActive: true,
              lateFeeType: true,
              lateFeeValue: true,
              lateFeeGraceDays: true,
              transactions: {
                where: { status: "PAID" },
                select: { category: true, amount: true, currency: true, paymentDate: true, status: true },
              },
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { status: "PAID", paymentDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { amount: true, currency: true, paymentDate: true, category: true, propertyId: true },
      }),
    ]);

    const occupiedStatuses = new Set(["RENTED", "OCCUPIED"]);
    const occupiedProperties = analyticsProperties.filter((property) => occupiedStatuses.has(property.status)).length;
    const occupancyRate = properties > 0 ? Math.round((occupiedProperties / properties) * 1000) / 10 : 0;
    const vacancyRate = properties > 0 ? Math.round(((properties - occupiedProperties) / properties) * 1000) / 10 : 0;

    const debtBuckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    let totalDebt = 0;
    const debtByCurrency = new Map<string, number>();
    const propertyPnL: { propertyId: string; code: string; title: string; income: number; expenses: number; net: number; currency: string }[] = [];

    for (const property of analyticsProperties) {
      let propertyIncome = 0;
      let propertyExpenses = 0;
      let propertyCurrency = "USD";
      for (const lease of property.leases) {
        propertyCurrency = lease.currency;
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
          now,
          lease.currency,
          { type: lease.lateFeeType, value: lease.lateFeeValue === null ? null : Number(lease.lateFeeValue), graceDays: lease.lateFeeGraceDays },
        );
        totalDebt += balance.debtAmount;
        debtByCurrency.set(lease.currency, (debtByCurrency.get(lease.currency) ?? 0) + balance.debtAmount);
        if (balance.debtAmount > 0) {
          if (balance.debtDays <= 30) debtBuckets.days30 += balance.debtAmount;
          else if (balance.debtDays <= 60) debtBuckets.days60 += balance.debtAmount;
          else if (balance.debtDays <= 90) debtBuckets.days90 += balance.debtAmount;
          else debtBuckets.over90 += balance.debtAmount;
        }
        for (const transaction of lease.transactions) {
          const amount = Number(transaction.amount);
          if (["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"].includes(transaction.category)) propertyIncome += amount;
          else propertyExpenses += amount;
        }
      }
      propertyPnL.push({
        propertyId: property.id,
        code: property.code,
        title: property.title,
        income: Math.round(propertyIncome * 100) / 100,
        expenses: Math.round(propertyExpenses * 100) / 100,
        net: Math.round((propertyIncome - propertyExpenses) * 100) / 100,
        currency: propertyCurrency,
      });
    }

    const monthLabels: { month: string; income: number; expenses: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const label = date.toISOString().slice(0, 7);
      let income = 0;
      let expenses = 0;
      for (const transaction of sixMonthTransactions) {
        if (transaction.paymentDate.toISOString().slice(0, 7) !== label) continue;
        if (["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"].includes(transaction.category)) income += Number(transaction.amount);
        else expenses += Number(transaction.amount);
      }
      monthLabels.push({ month: label, income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100 });
    }

    const avgDaysOnMarket = analyticsProperties.length
      ? Math.round(
          analyticsProperties.reduce((sum, property) => {
            const firstLease = property.leases.reduce<Date | null>((earliest, lease) => {
              const start = new Date(lease.startDate);
              return !earliest || start < earliest ? start : earliest;
            }, null);
            const end = firstLease ?? now;
            return sum + Math.max(0, Math.floor((end.getTime() - new Date(property.createdAt).getTime()) / DAY));
          }, 0) / analyticsProperties.length,
        )
      : 0;

    const analytics = {
      occupancy: {
        total: properties,
        occupied: occupiedProperties,
        available: availableProperties,
        occupancyRate,
        vacancyRate,
        avgDaysOnMarket,
      },
      debtAging: {
        total: Math.round(totalDebt * 100) / 100,
        byCurrency: Array.from(debtByCurrency.entries()).map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 })),
        buckets: {
          days30: Math.round(debtBuckets.days30 * 100) / 100,
          days60: Math.round(debtBuckets.days60 * 100) / 100,
          days90: Math.round(debtBuckets.days90 * 100) / 100,
          over90: Math.round(debtBuckets.over90 * 100) / 100,
        },
      },
      monthly: monthLabels,
      propertyPerformance: propertyPnL.sort((a, b) => b.net - a.net).slice(0, 10),
    };

    const expiringLeases = expiringCandidates.filter((lease) => {
      const daysLeft = (lease.endDate.getTime() - now.getTime()) / DAY;
      return daysLeft <= lease.renewalNoticeDays;
    });

    return NextResponse.json({
      stats: {
        owners,
        tenants,
        properties,
        availableProperties,
        activeLeases,
        pendingIssues,
        expiringLeases: expiringLeases.length,
        monthIncomeByCurrency: monthTransactions.map((row) => ({
          currency: row.currency,
          total: row._sum.amount || 0,
        })),
      },
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction.id,
        category: transaction.category,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        paymentDate: transaction.paymentDate,
        property: transaction.property,
      })),
      upcomingExpirations: expiringLeases.slice(0, 5).map((lease) => ({
        id: lease.id,
        contractNumber: lease.contractNumber,
        property: lease.property,
        tenant: lease.leaseClients[0]?.client.fullName || "Sin inquilino",
        endDate: lease.endDate,
        daysLeft: Math.max(0, Math.ceil((lease.endDate.getTime() - now.getTime()) / DAY)),
        canon: lease.monthlyCanonAmount,
        currency: lease.currency,
      })),
      analytics,
    });
  } catch (error) {
    console.error("Error building dashboard data:", error);
    return NextResponse.json({ error: "Error al cargar el panel" }, { status: 500 });
  }
}

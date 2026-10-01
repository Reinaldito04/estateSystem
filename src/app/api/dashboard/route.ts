import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    ] = await Promise.all([
      prisma.clientProfile.count({ where: { role: "OWNER", deletedAt: null } }),
      prisma.clientProfile.count({ where: { role: "TENANT", deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { status: "AVAILABLE", deletedAt: null } }),
      prisma.lease.count({ where: { isActive: true, deletedAt: null } }),
      prisma.propertyIssue.count({ where: { status: { in: ["REPORTED", "IN_PROGRESS"] } } }),
      prisma.transaction.groupBy({
        by: ["currency"],
        where: { paymentDate: { gte: startOfMonth } },
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
    ]);

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
    });
  } catch (error) {
    console.error("Error building dashboard data:", error);
    return NextResponse.json({ error: "Error al cargar el panel" }, { status: 500 });
  }
}

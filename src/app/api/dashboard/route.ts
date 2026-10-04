import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLeaseBalance } from "@/lib/lease-balance";
import {
  buildMonthlyCashflow,
  collectionRate,
  computeConversion,
  computeDelta,
  debtBucketForDays,
  monthSpanWithin,
  parseDashboardRange,
  periodWindow,
  pickPrimaryCurrency,
  rangeMonths,
  round2,
  type FunnelStep,
} from "@/lib/dashboard";

const DAY = 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = ["TERMINATED", "EXPIRED", "CANCELLED"];

type CountGroup = { _count?: { _all?: number } };

function countsFromGroups<T extends CountGroup & Record<string, unknown>>(
  groups: T[],
  key: keyof T,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const group of groups) {
    const value = group[key];
    if (typeof value === "string") result[value] = group._count?._all ?? 0;
  }
  return result;
}

function tally<T>(items: T[], getKey: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function toSortedBreakdown(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([key, total]) => ({ key, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseDashboardRange(searchParams.get("range"));
    const months = rangeMonths(range);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { currentStart: periodStart, previousStart, previousEnd } = periodWindow(months, now);
    const horizon = new Date(now.getTime() + 90 * DAY);
    const next30 = new Date(now.getTime() + 30 * DAY);

    const [
      clientRoleGroups,
      propertyStatusGroups,
      propertyTypeGroups,
      propertyCityGroups,
      activePlans,
      allLeases,
      paidTransactions,
      monthPaidByCurrency,
      interests,
      visits,
      reservations,
      issues,
      tasks,
      settlements,
      recentTransactions,
    ] = await Promise.all([
      prisma.clientProfile.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.property.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.property.groupBy({ by: ["propertyType"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.property.groupBy({ by: ["city"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.maintenancePlan.count({ where: { isActive: true } }),
      prisma.lease.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          contractNumber: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          monthlyCanonAmount: true,
          currency: true,
          isActive: true,
          contractStatus: true,
          renewalNoticeDays: true,
          nextAdjustmentDate: true,
          lateFeeType: true,
          lateFeeValue: true,
          lateFeeGraceDays: true,
          property: { select: { id: true, code: true, title: true, status: true, propertyType: true, city: true, createdAt: true } },
          leaseClients: { where: { role: "TENANT" }, select: { client: { select: { fullName: true } } } },
          transactions: {
            where: { status: "PAID" },
            select: { category: true, amount: true, currency: true, paymentDate: true, status: true },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { status: "PAID", paymentDate: { gte: previousStart } },
        select: { amount: true, currency: true, category: true, paymentMethod: true, paymentDate: true },
      }),
      prisma.transaction.groupBy({
        by: ["currency"],
        where: { status: "PAID", paymentDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.propertyInterest.findMany({ where: { createdAt: { gte: previousStart } }, select: { status: true, createdAt: true } }),
      prisma.propertyVisit.findMany({ select: { status: true, scheduledAt: true, createdAt: true } }),
      prisma.propertyReservation.findMany({ select: { status: true, type: true, startDate: true, createdAt: true } }),
      prisma.propertyIssue.findMany({ select: { status: true, issueType: true, reportDate: true, repairDate: true, repairCost: true } }),
      prisma.task.findMany({ select: { status: true, dueDate: true } }),
      prisma.ownerSettlement.findMany({
        select: { status: true, netPayout: true, agencyCommission: true, commissionRate: true, currency: true, paidAt: true, createdAt: true },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { property: { select: { code: true, title: true } } },
      }),
    ]);

    const currencyCounts: Record<string, number> = {};
    for (const lease of allLeases) {
      currencyCounts[lease.currency] = (currencyCounts[lease.currency] ?? 0) + 1;
    }
    const availableCurrencies = Object.keys(currencyCounts).sort();
    const requestedCurrency = searchParams.get("currency");
    const primaryCurrency =
      requestedCurrency && availableCurrencies.includes(requestedCurrency)
        ? requestedCurrency
        : pickPrimaryCurrency(currencyCounts);

    const inRange = (date: Date, start: Date, end: Date) => date >= start && date < end;
    const currentPaid = paidTransactions.filter(
      (row) => row.currency === primaryCurrency && row.paymentDate >= periodStart,
    );
    const previousPaid = paidTransactions.filter(
      (row) => row.currency === primaryCurrency && inRange(row.paymentDate, previousStart, previousEnd),
    );
    const sumPaid = (rows: typeof paidTransactions, categories: string[]) =>
      rows.reduce((sum, row) => (categories.includes(row.category) ? sum + Number(row.amount) : sum), 0);

    const INCOME = ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"];

    const clientCounts = countsFromGroups(clientRoleGroups, "role");
    const statusCounts = countsFromGroups(propertyStatusGroups, "status");
    const typeCounts = countsFromGroups(propertyTypeGroups, "propertyType");
    const cityCounts = countsFromGroups(propertyCityGroups, "city");

    const propertiesTotal = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

    // Occupancy is derived from active leases so an out-of-date property status
    // does not distort the rate.
    const occupiedPropertyIds = new Set(allLeases.filter((lease) => lease.isActive).map((lease) => lease.property.id));
    const occupiedProperties = occupiedPropertyIds.size;
    const occupancyRate = propertiesTotal > 0 ? round2((occupiedProperties / propertiesTotal) * 100) : 0;
    const vacancyRate = propertiesTotal > 0 ? round2(((propertiesTotal - occupiedProperties) / propertiesTotal) * 100) : 0;

    // ---------------------------------------------------------------------
    // Portfolio
    // ---------------------------------------------------------------------
    const rentRollByCurrency = new Map<string, number>();
    let canonSum = 0;
    let canonCount = 0;
    for (const lease of allLeases) {
      if (!lease.isActive) continue;
      const canon = Number(lease.monthlyCanonAmount);
      rentRollByCurrency.set(lease.currency, (rentRollByCurrency.get(lease.currency) ?? 0) + canon);
      if (lease.currency === primaryCurrency) {
        canonSum += canon;
        canonCount += 1;
      }
    }

    const avgDaysOnMarket = allLeases.length
      ? Math.round(
          allLeases.reduce((sum, lease) => {
            const start = new Date(lease.startDate);
            return sum + Math.max(0, Math.floor((start.getTime() - new Date(lease.property.createdAt).getTime()) / DAY));
          }, 0) / allLeases.length,
        )
      : 0;

    const activeLeases = allLeases.filter((lease) => lease.isActive);

    // ---------------------------------------------------------------------
    // Finance
    // ---------------------------------------------------------------------
    const cashflow = buildMonthlyCashflow(
      currentPaid.map((row) => ({ amount: Number(row.amount), paymentDate: row.paymentDate, category: row.category })),
      months,
      now,
    );

    const byCategory = new Map<string, number>();
    const byMethod = new Map<string, number>();
    const byCurrency = new Map<string, number>();
    for (const row of paidTransactions.filter((item) => item.paymentDate >= periodStart)) {
      const amount = Number(row.amount);
      byCurrency.set(row.currency, (byCurrency.get(row.currency) ?? 0) + amount);
      if (row.currency !== primaryCurrency) continue;
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + amount);
      byMethod.set(row.paymentMethod, (byMethod.get(row.paymentMethod) ?? 0) + amount);
    }

    const sumCanonPaid = (rows: typeof paidTransactions) =>
      rows.reduce((sum, row) => (row.category === "RENT_CANON" ? sum + Number(row.amount) : sum), 0);

    const currentCollected = sumCanonPaid(currentPaid);
    const previousCollected = sumCanonPaid(previousPaid);
    let currentExpected = 0;
    let previousExpected = 0;
    for (const lease of activeLeases) {
      if (lease.currency !== primaryCurrency) continue;
      const canon = Number(lease.monthlyCanonAmount);
      const currentFrom = lease.startDate > periodStart ? lease.startDate : periodStart;
      currentExpected += canon * monthSpanWithin(currentFrom, now);
      const previousFrom = lease.startDate > previousStart ? lease.startDate : previousStart;
      previousExpected += canon * monthSpanWithin(previousFrom, previousEnd);
    }

    const debtBuckets = { days30: 0, days60: 0, days90: 0, over90: 0 };
    let totalDebt = 0;
    const debtByCurrency = new Map<string, number>();
    const topDebtors: { leaseId: string; contractNumber: string; tenant: string; property: string; amount: number; days: number; currency: string }[] = [];
    const propertyPnL: { propertyId: string; code: string; title: string; income: number; expenses: number; net: number; currency: string }[] = [];

    for (const lease of allLeases) {
      if (lease.isActive) {
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
          {
            type: lease.lateFeeType,
            value: lease.lateFeeValue === null ? null : Number(lease.lateFeeValue),
            graceDays: lease.lateFeeGraceDays,
          },
        );

        totalDebt += balance.debtAmount;
        debtByCurrency.set(lease.currency, (debtByCurrency.get(lease.currency) ?? 0) + balance.debtAmount);
        const bucket = debtBucketForDays(balance.debtDays);
        if (bucket && balance.debtAmount > 0) debtBuckets[bucket] += balance.debtAmount;
        if (lease.currency === primaryCurrency && balance.debtAmount > 0) {
          topDebtors.push({
            leaseId: lease.id,
            contractNumber: lease.contractNumber,
            tenant: lease.leaseClients[0]?.client.fullName || "Sin inquilino",
            property: `${lease.property.code} · ${lease.property.title}`,
            amount: round2(balance.debtAmount),
            days: balance.debtDays,
            currency: lease.currency,
          });
        }
      }

      let propertyIncome = 0;
      let propertyExpenses = 0;
      for (const transaction of lease.transactions) {
        const amount = Number(transaction.amount);
        if (INCOME.includes(transaction.category)) propertyIncome += amount;
        else propertyExpenses += amount;
      }
      propertyPnL.push({
        propertyId: lease.property.id,
        code: lease.property.code,
        title: lease.property.title,
        income: round2(propertyIncome),
        expenses: round2(propertyExpenses),
        net: round2(propertyIncome - propertyExpenses),
        currency: lease.currency,
      });
    }

    topDebtors.sort((a, b) => b.amount - a.amount);

    // ---------------------------------------------------------------------
    // Pipeline
    // ---------------------------------------------------------------------
    const currentInterests = interests.filter((item) => item.createdAt >= periodStart);
    const previousInterests = interests.filter((item) => inRange(item.createdAt, previousStart, previousEnd));
    const currentVisits = visits.filter((item) => item.createdAt >= periodStart);
    const previousVisits = visits.filter((item) => inRange(item.createdAt, previousStart, previousEnd));
    const currentReservations = reservations.filter((item) => item.createdAt >= periodStart);
    const previousReservations = reservations.filter((item) => inRange(item.createdAt, previousStart, previousEnd));
    const currentNewLeases = allLeases.filter((lease) => lease.createdAt >= periodStart);
    const previousNewLeases = allLeases.filter((lease) => inRange(lease.createdAt, previousStart, previousEnd));
    const currentTerminated = allLeases.filter(
      (lease) => TERMINAL_STATUSES.includes(lease.contractStatus) && lease.endDate >= periodStart && lease.endDate <= now,
    );
    const previousTerminated = allLeases.filter(
      (lease) => TERMINAL_STATUSES.includes(lease.contractStatus) && inRange(lease.endDate, previousStart, previousEnd),
    );

    const funnel: FunnelStep[] = [
      { key: "interest", label: "Interesados", count: currentInterests.length },
      { key: "visit", label: "Visitas", count: currentVisits.length },
      { key: "reservation", label: "Reservas", count: currentReservations.length },
      { key: "lease", label: "Contratos", count: currentNewLeases.length },
    ];
    const conversion = computeConversion(funnel);
    const upcomingVisits = visits.filter((visit) => visit.scheduledAt >= now && (visit.status === "SCHEDULED" || visit.status === "CONFIRMED")).length;
    const upcomingReservations = reservations.filter(
      (reservation) => reservation.startDate >= now && (reservation.status === "PENDING" || reservation.status === "CONFIRMED"),
    ).length;

    // ---------------------------------------------------------------------
    // Contracts
    // ---------------------------------------------------------------------
    const newByMonth = new Map<string, number>();
    const terminatedByMonth = new Map<string, number>();
    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const key = monthOf(new Date(now.getFullYear(), now.getMonth() - offset, 1));
      newByMonth.set(key, 0);
      terminatedByMonth.set(key, 0);
    }
    for (const lease of allLeases) {
      const createdKey = monthOf(new Date(lease.createdAt));
      if (newByMonth.has(createdKey)) newByMonth.set(createdKey, (newByMonth.get(createdKey) ?? 0) + 1);
      if (TERMINAL_STATUSES.includes(lease.contractStatus)) {
        const endKey = monthOf(new Date(lease.endDate));
        if (terminatedByMonth.has(endKey)) terminatedByMonth.set(endKey, (terminatedByMonth.get(endKey) ?? 0) + 1);
      }
    }

    const durationMonths = allLeases.map((lease) => {
      const start = new Date(lease.startDate).getTime();
      const end = new Date(lease.endDate).getTime();
      return Math.max(0, Math.round((end - start) / DAY / 30.44));
    });
    const avgDurationMonths = durationMonths.length ? round2(durationMonths.reduce((sum, value) => sum + value, 0) / durationMonths.length) : 0;

    const canonByType = new Map<string, { total: number; count: number }>();
    for (const lease of activeLeases) {
      if (lease.currency !== primaryCurrency) continue;
      const current = canonByType.get(lease.property.propertyType) ?? { total: 0, count: 0 };
      current.total += Number(lease.monthlyCanonAmount);
      current.count += 1;
      canonByType.set(lease.property.propertyType, current);
    }

    const expiringLeases = allLeases
      .filter((lease) => {
        if (!lease.isActive || lease.endDate < now || lease.endDate > horizon) return false;
        const daysLeft = Math.ceil((lease.endDate.getTime() - now.getTime()) / DAY);
        return daysLeft <= lease.renewalNoticeDays;
      })
      .map((lease) => ({
        id: lease.id,
        contractNumber: lease.contractNumber,
        property: { code: lease.property.code, title: lease.property.title },
        tenant: lease.leaseClients[0]?.client.fullName || "Sin inquilino",
        endDate: lease.endDate,
        daysLeft: Math.max(0, Math.ceil((lease.endDate.getTime() - now.getTime()) / DAY)),
        canon: lease.monthlyCanonAmount,
        currency: lease.currency,
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const upcomingAdjustments = allLeases
      .filter((lease) => lease.isActive && lease.nextAdjustmentDate && lease.nextAdjustmentDate >= now && lease.nextAdjustmentDate <= horizon)
      .map((lease) => ({
        id: lease.id,
        contractNumber: lease.contractNumber,
        property: `${lease.property.code} · ${lease.property.title}`,
        nextAdjustmentDate: lease.nextAdjustmentDate as Date,
        canon: lease.monthlyCanonAmount,
        currency: lease.currency,
      }))
      .sort((a, b) => a.nextAdjustmentDate.getTime() - b.nextAdjustmentDate.getTime())
      .slice(0, 8);

    // ---------------------------------------------------------------------
    // Operations
    // ---------------------------------------------------------------------
    const issueByStatus = new Map<string, number>();
    const issueByType = new Map<string, number>();
    let totalRepairCost = 0;
    let currentResolved = 0;
    let previousResolved = 0;
    let resolvedCount = 0;
    let resolutionDaysSum = 0;
    for (const issue of issues) {
      issueByStatus.set(issue.status, (issueByStatus.get(issue.status) ?? 0) + 1);
      issueByType.set(issue.issueType, (issueByType.get(issue.issueType) ?? 0) + 1);
      totalRepairCost += Number(issue.repairCost);
      if (issue.status === "RESOLVED" && issue.repairDate) {
        resolvedCount += 1;
        resolutionDaysSum += Math.max(0, (new Date(issue.repairDate).getTime() - new Date(issue.reportDate).getTime()) / DAY);
        if (issue.repairDate >= periodStart) currentResolved += 1;
        else if (inRange(new Date(issue.repairDate), previousStart, previousEnd)) previousResolved += 1;
      }
    }
    const openIssues = (issueByStatus.get("REPORTED") ?? 0) + (issueByStatus.get("IN_PROGRESS") ?? 0);

    const taskByStatus = new Map<string, number>();
    let overdueTasks = 0;
    let upcomingTasks = 0;
    for (const task of tasks) {
      taskByStatus.set(task.status, (taskByStatus.get(task.status) ?? 0) + 1);
      if ((task.status === "PENDING" || task.status === "IN_PROGRESS") && task.dueDate < now) overdueTasks += 1;
      if ((task.status === "PENDING" || task.status === "IN_PROGRESS") && task.dueDate >= now && task.dueDate <= next30) upcomingTasks += 1;
    }
    const openTaskCount = tasks.length - (taskByStatus.get("CANCELLED") ?? 0);
    const complianceRate = openTaskCount > 0 ? round2(((taskByStatus.get("DONE") ?? 0) / openTaskCount) * 100) : 0;

    // ---------------------------------------------------------------------
    // Settlements & commission
    // ---------------------------------------------------------------------
    const settlementStatusCounts = new Map<string, number>();
    let pendingPayout = 0;
    let paidThisPeriod = 0;
    for (const settlement of settlements) {
      settlementStatusCounts.set(settlement.status, (settlementStatusCounts.get(settlement.status) ?? 0) + 1);
      if (settlement.status === "DRAFT" || settlement.status === "ISSUED") pendingPayout += Number(settlement.netPayout);
      if (settlement.status === "PAID" && settlement.paidAt && settlement.paidAt >= periodStart) paidThisPeriod += Number(settlement.netPayout);
    }
    const currentSettlements = settlements.filter((settlement) => settlement.createdAt >= periodStart);
    const previousSettlements = settlements.filter((settlement) => inRange(settlement.createdAt, previousStart, previousEnd));
    const sumCommission = (rows: typeof settlements) => rows.reduce((sum, settlement) => sum + Number(settlement.agencyCommission), 0);
    const currentCommission = sumCommission(currentSettlements);
    const previousCommission = sumCommission(previousSettlements);
    const avgCommissionRate = currentSettlements.length
      ? round2((currentSettlements.reduce((sum, settlement) => sum + Number(settlement.commissionRate), 0) / currentSettlements.length) * 100)
      : 0;

    const currentIncome = sumPaid(currentPaid, INCOME);
    const previousIncome = sumPaid(previousPaid, INCOME);
    const currentExpenses = currentPaid.reduce((sum, row) => sum + Number(row.amount), 0) - currentIncome;
    const previousExpenses = previousPaid.reduce((sum, row) => sum + Number(row.amount), 0) - previousIncome;
    const activeNow = activeLeases.length;
    const previousActiveEstimate = activeNow - currentNewLeases.length + currentTerminated.length;

    const metric = (current: number, previous: number) => ({
      current: round2(current),
      previous: round2(previous),
      deltaPct: computeDelta(current, previous),
    });

    return NextResponse.json({
      range,
      generatedAt: now.toISOString(),
      periodStart: periodStart.toISOString(),
      previousPeriodStart: previousStart.toISOString(),
      primaryCurrency,
      availableCurrencies: availableCurrencies.length > 0 ? availableCurrencies : [primaryCurrency],
      stats: {
        owners: clientCounts.OWNER ?? 0,
        tenants: clientCounts.TENANT ?? 0,
        prospects: (clientCounts.PROSPECT ?? 0) + (clientCounts.BUYER ?? 0),
        properties: propertiesTotal,
        availableProperties: Math.max(0, propertiesTotal - occupiedProperties),
        activeLeases: activeNow,
        pendingIssues: openIssues,
        expiringLeases: expiringLeases.length,
        monthIncomeByCurrency: monthPaidByCurrency.map((row) => ({ currency: row.currency, total: row._sum.amount || 0 })),
      },
      comparison: {
        income: metric(currentIncome, previousIncome),
        expenses: metric(currentExpenses, previousExpenses),
        net: metric(currentIncome - currentExpenses, previousIncome - previousExpenses),
        collected: metric(currentCollected, previousCollected),
        newContracts: metric(currentNewLeases.length, previousNewLeases.length),
        terminatedContracts: metric(currentTerminated.length, previousTerminated.length),
        interests: metric(currentInterests.length, previousInterests.length),
        visits: metric(currentVisits.length, previousVisits.length),
        reservations: metric(currentReservations.length, previousReservations.length),
        resolvedIssues: metric(currentResolved, previousResolved),
        agencyCommission: metric(currentCommission, previousCommission),
        activeLeases: metric(activeNow, previousActiveEstimate),
      },
      portfolio: {
        occupancy: {
          total: propertiesTotal,
          occupied: occupiedProperties,
          available: Math.max(0, propertiesTotal - occupiedProperties),
          occupancyRate,
          vacancyRate,
          avgDaysOnMarket,
        },
        rentRollByCurrency: Array.from(rentRollByCurrency.entries())
          .map(([currency, total]) => ({ currency, total: round2(total) }))
          .sort((a, b) => b.total - a.total),
        avgCanon: canonCount > 0 ? round2(canonSum / canonCount) : 0,
        byStatus: Object.entries(statusCounts).map(([key, count]) => ({ key, count })),
        byType: Object.entries(typeCounts).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
        byCity: Object.entries(cityCounts)
          .map(([key, count]) => ({ key: key === "null" ? "Sin ciudad" : key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      },
      finance: {
        cashflow,
        collection: {
          expected: round2(currentExpected),
          collected: round2(currentCollected),
          rate: collectionRate(currentExpected, currentCollected),
          previousExpected: round2(previousExpected),
          previousCollected: round2(previousCollected),
          previousRate: collectionRate(previousExpected, previousCollected),
          deltaPct: computeDelta(currentCollected, previousCollected),
          currency: primaryCurrency,
        },
        incomeByCategory: toSortedBreakdown(byCategory),
        incomeByMethod: toSortedBreakdown(byMethod),
        incomeByCurrency: toSortedBreakdown(byCurrency),
        debtAging: {
          total: round2(totalDebt),
          byCurrency: Array.from(debtByCurrency.entries())
            .map(([currency, total]) => ({ currency, total: round2(total) }))
            .sort((a, b) => b.total - a.total),
          buckets: {
            days30: round2(debtBuckets.days30),
            days60: round2(debtBuckets.days60),
            days90: round2(debtBuckets.days90),
            over90: round2(debtBuckets.over90),
          },
        },
        topDebtors: topDebtors.slice(0, 5),
      },
      pipeline: {
        funnel,
        conversion,
        interestsByStatus: tally(currentInterests, (item) => item.status),
        visits: { byStatus: tally(visits, (item) => item.status), upcoming: upcomingVisits },
        reservations: { byStatus: tally(reservations, (item) => item.status), upcoming: upcomingReservations },
      },
      contracts: {
        newByMonth: Array.from(newByMonth.entries()).map(([month, count]) => ({ month, count })),
        terminatedByMonth: Array.from(terminatedByMonth.entries()).map(([month, count]) => ({ month, count })),
        byStatus: Object.entries(tally(allLeases, (lease) => lease.contractStatus)).map(([key, count]) => ({ key, count })),
        upcomingRenewals: expiringLeases.slice(0, 6),
        upcomingAdjustments,
        avgCanonByType: Array.from(canonByType.entries())
          .map(([key, value]) => ({ key, avgCanon: value.count > 0 ? round2(value.total / value.count) : 0 }))
          .sort((a, b) => b.avgCanon - a.avgCanon),
        avgDurationMonths,
      },
      operations: {
        issues: {
          open: openIssues,
          resolved: issueByStatus.get("RESOLVED") ?? 0,
          byStatus: Array.from(issueByStatus.entries()).map(([key, count]) => ({ key, count })),
          byType: Array.from(issueByType.entries())
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6),
          avgResolutionDays: resolvedCount > 0 ? round2(resolutionDaysSum / resolvedCount) : 0,
          totalRepairCost: round2(totalRepairCost),
          currency: primaryCurrency,
        },
        maintenance: {
          activePlans,
          overdueTasks,
          upcomingTasks,
          completedTasks: taskByStatus.get("DONE") ?? 0,
          complianceRate,
        },
      },
      settlements: {
        pending: (settlementStatusCounts.get("DRAFT") ?? 0) + (settlementStatusCounts.get("ISSUED") ?? 0),
        pendingPayout: round2(pendingPayout),
        paidThisPeriod: round2(paidThisPeriod),
        agencyCommission: round2(currentCommission),
        avgCommissionRate,
        currency: primaryCurrency,
      },
      analytics: {
        propertyPerformance: propertyPnL.sort((a, b) => b.net - a.net).slice(0, 10),
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
    });
  } catch (error) {
    console.error("Error building dashboard data:", error);
    return NextResponse.json({ error: "Error al cargar el panel" }, { status: 500 });
  }
}

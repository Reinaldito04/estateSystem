export type DashboardRange = "3m" | "6m" | "12m";

export type AmountRow = { key: string; total: number };
export type CountRow = { key: string; count: number };
export type CurrencyAmount = { currency: string; total: number };
export type ComparisonMetric = { current: number; previous: number; deltaPct: number | null };

export type DashboardData = {
  range: DashboardRange;
  generatedAt: string;
  periodStart: string;
  previousPeriodStart: string;
  primaryCurrency: string;
  availableCurrencies: string[];
  stats: {
    owners: number;
    tenants: number;
    prospects: number;
    properties: number;
    availableProperties: number;
    activeLeases: number;
    pendingIssues: number;
    expiringLeases: number;
    monthIncomeByCurrency: CurrencyAmount[];
  };
  comparison: {
    income: ComparisonMetric;
    expenses: ComparisonMetric;
    net: ComparisonMetric;
    collected: ComparisonMetric;
    newContracts: ComparisonMetric;
    terminatedContracts: ComparisonMetric;
    interests: ComparisonMetric;
    visits: ComparisonMetric;
    reservations: ComparisonMetric;
    resolvedIssues: ComparisonMetric;
    agencyCommission: ComparisonMetric;
    activeLeases: ComparisonMetric;
  };
  portfolio: {
    occupancy: {
      total: number;
      occupied: number;
      available: number;
      occupancyRate: number;
      vacancyRate: number;
      avgDaysOnMarket: number;
    };
    rentRollByCurrency: CurrencyAmount[];
    avgCanon: number;
    byStatus: CountRow[];
    byType: CountRow[];
    byCity: CountRow[];
  };
  finance: {
    cashflow: { month: string; income: number; expenses: number; net: number }[];
    collection: {
      expected: number;
      collected: number;
      rate: number;
      previousExpected: number;
      previousCollected: number;
      previousRate: number;
      deltaPct: number | null;
      currency: string;
    };
    incomeByCategory: AmountRow[];
    incomeByMethod: AmountRow[];
    incomeByCurrency: AmountRow[];
    debtAging: {
      total: number;
      byCurrency: CurrencyAmount[];
      buckets: { days30: number; days60: number; days90: number; over90: number };
    };
    topDebtors: {
      leaseId: string;
      contractNumber: string;
      tenant: string;
      property: string;
      amount: number;
      days: number;
      currency: string;
    }[];
  };
  pipeline: {
    funnel: { key: string; label: string; count: number }[];
    conversion: number[];
    interestsByStatus: Record<string, number>;
    visits: { byStatus: Record<string, number>; upcoming: number };
    reservations: { byStatus: Record<string, number>; upcoming: number };
  };
  contracts: {
    newByMonth: { month: string; count: number }[];
    terminatedByMonth: { month: string; count: number }[];
    byStatus: CountRow[];
    upcomingRenewals: {
      id: string;
      contractNumber: string;
      property: { code: string; title: string };
      tenant: string;
      endDate: string;
      daysLeft: number;
      canon: string | number;
      currency: string;
    }[];
    upcomingAdjustments: {
      id: string;
      contractNumber: string;
      property: string;
      nextAdjustmentDate: string;
      canon: string | number;
      currency: string;
    }[];
    avgCanonByType: { key: string; avgCanon: number }[];
    avgDurationMonths: number;
  };
  operations: {
    issues: {
      open: number;
      resolved: number;
      byStatus: CountRow[];
      byType: CountRow[];
      avgResolutionDays: number;
      totalRepairCost: number;
      currency: string;
    };
    maintenance: {
      activePlans: number;
      overdueTasks: number;
      upcomingTasks: number;
      completedTasks: number;
      complianceRate: number;
    };
  };
  settlements: {
    pending: number;
    pendingPayout: number;
    paidThisPeriod: number;
    agencyCommission: number;
    avgCommissionRate: number;
    currency: string;
  };
  analytics: {
    propertyPerformance: {
      propertyId: string;
      code: string;
      title: string;
      income: number;
      expenses: number;
      net: number;
      currency: string;
    }[];
  };
  recentTransactions: {
    id: string;
    category: string;
    amount: string | number;
    currency: string;
    status: string;
    description: string | null;
    paymentDate: string;
    property: { code: string; title: string };
  }[];
};

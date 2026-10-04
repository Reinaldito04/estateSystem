export type DashboardRange = "3m" | "6m" | "12m";

export const DASHBOARD_RANGES: { value: DashboardRange; label: string; months: number }[] = [
  { value: "3m", label: "3 meses", months: 3 },
  { value: "6m", label: "6 meses", months: 6 },
  { value: "12m", label: "12 meses", months: 12 },
];

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "6m";

export function parseDashboardRange(value: string | null | undefined): DashboardRange {
  const match = DASHBOARD_RANGES.find((range) => range.value === value);
  return match ? match.value : DEFAULT_DASHBOARD_RANGE;
}

export function rangeMonths(range: DashboardRange): number {
  return DASHBOARD_RANGES.find((item) => item.value === range)?.months ?? 6;
}

export const INCOME_CATEGORIES = ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"] as const;
export const EXPENSE_CATEGORIES = ["CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"] as const;

export function isIncomeCategory(category: string): boolean {
  return (INCOME_CATEGORIES as readonly string[]).includes(category);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export type TrendTransaction = {
  amount: number;
  paymentDate: Date;
  category: string;
};

export type MonthlyCashflow = { month: string; income: number; expenses: number; net: number };

export function buildMonthlyCashflow(
  transactions: TrendTransaction[],
  months: number,
  now: Date,
): MonthlyCashflow[] {
  const buckets: MonthlyCashflow[] = [];
  const index = new Map<string, MonthlyCashflow>();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const bucket: MonthlyCashflow = { month: monthKey(date), income: 0, expenses: 0, net: 0 };
    buckets.push(bucket);
    index.set(bucket.month, bucket);
  }

  for (const transaction of transactions) {
    const bucket = index.get(monthKey(transaction.paymentDate));
    if (!bucket) continue;
    if (isIncomeCategory(transaction.category)) bucket.income += transaction.amount;
    else bucket.expenses += transaction.amount;
  }

  return buckets.map((bucket) => ({
    month: bucket.month,
    income: round2(bucket.income),
    expenses: round2(bucket.expenses),
    net: round2(bucket.income - bucket.expenses),
  }));
}

export type SummaryTransaction = {
  amount: number;
  currency: string;
  category: string;
  paymentMethod: string;
};

export type AmountBreakdown = { key: string; total: number };

function toSortedBreakdown(map: Map<string, number>): AmountBreakdown[] {
  return Array.from(map.entries())
    .map(([key, total]) => ({ key, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

export function summarizeTransactions(transactions: SummaryTransaction[]) {
  let income = 0;
  let expenses = 0;
  const byCategory = new Map<string, number>();
  const byMethod = new Map<string, number>();
  const byCurrency = new Map<string, number>();

  for (const transaction of transactions) {
    byCategory.set(transaction.category, (byCategory.get(transaction.category) ?? 0) + transaction.amount);
    byMethod.set(transaction.paymentMethod, (byMethod.get(transaction.paymentMethod) ?? 0) + transaction.amount);
    byCurrency.set(transaction.currency, (byCurrency.get(transaction.currency) ?? 0) + transaction.amount);
    if (isIncomeCategory(transaction.category)) income += transaction.amount;
    else expenses += transaction.amount;
  }

  return {
    income: round2(income),
    expenses: round2(expenses),
    net: round2(income - expenses),
    byCategory: toSortedBreakdown(byCategory),
    byMethod: toSortedBreakdown(byMethod),
    byCurrency: toSortedBreakdown(byCurrency),
  };
}

export type DebtBucket = "days30" | "days60" | "days90" | "over90";

export function debtBucketForDays(days: number): DebtBucket | null {
  if (days <= 0) return null;
  if (days <= 30) return "days30";
  if (days <= 60) return "days60";
  if (days <= 90) return "days90";
  return "over90";
}

export function collectionRate(expected: number, collected: number): number {
  if (expected <= 0) return 0;
  return Math.round((collected / expected) * 1000) / 10;
}

export function pickPrimaryCurrency(counts: Record<string, number>, fallback = "USD"): string {
  let best = fallback;
  let max = -1;
  for (const [currency, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = currency;
    }
  }
  return best;
}

export type PeriodWindow = { currentStart: Date; previousStart: Date; previousEnd: Date };

export function periodWindow(months: number, now: Date): PeriodWindow {
  const currentStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - (2 * months - 1), 1);
  return { currentStart, previousStart, previousEnd: currentStart };
}

export function monthSpanWithin(from: Date, to: Date): number {
  if (to < from) return 0;
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  return Math.max(0, months);
}

export function computeDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export type FunnelStep = { key: string; label: string; count: number };

export function computeConversion(funnel: FunnelStep[]): number[] {
  const rates: number[] = [];
  for (let index = 1; index < funnel.length; index += 1) {
    const previous = funnel[index - 1].count;
    const current = funnel[index].count;
    rates.push(previous > 0 ? Math.round((current / previous) * 1000) / 10 : 0);
  }
  return rates;
}

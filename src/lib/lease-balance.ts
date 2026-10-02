type RentTransaction = {
  category: string;
  amount: number | string;
  paymentDate: Date | string;
  status?: string;
  currency?: string;
};

export type LeaseBalance = {
  rentDue: number;
  paidRent: number;
  debtAmount: number;
  overdueInstallments: number;
  debtDays: number;
  lateFeeAmount: number;
  totalDue: number;
  paidByCurrency: { currency: string; total: number }[];
};

export type LateFeeConfig = {
  type?: string | null;
  value?: number | string | null;
  graceDays?: number | null;
};

export function calculateLateFee(
  debtAmount: number,
  debtDays: number,
  config?: LateFeeConfig,
): number {
  if (!config || !config.type || config.type === "NONE") return 0;
  if (debtAmount <= 0) return 0;
  const grace = config.graceDays ?? 0;
  const chargeableDays = Math.max(0, debtDays - grace);
  if (chargeableDays <= 0) return 0;
  const value = toNumber(config.value);
  if (value <= 0) return 0;
  switch (config.type) {
    case "FIXED":
      return round2(value);
    case "PERCENT_DAILY":
      return round2(debtAmount * (value / 100) * chargeableDays);
    case "PERCENT_MONTHLY":
      return round2(debtAmount * (value / 100) * (chargeableDays / 30));
    default:
      return 0;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function countsAsPaidRent(transaction: RentTransaction, currency?: string) {
  if (transaction.category !== "RENT_CANON") return false;
  if (transaction.status && transaction.status !== "PAID") return false;
  if (currency && transaction.currency && transaction.currency !== currency) return false;
  return true;
}

function toNumber(value: number | string | unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calculateLeaseBalance(
  startDate: Date | string,
  endDate: Date | string,
  monthlyCanonAmount: number | string,
  transactions: RentTransaction[],
  referenceDate = new Date(),
  currency?: string,
  lateFeeConfig?: LateFeeConfig,
): LeaseBalance {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  const today = startOfDay(referenceDate);
  const dueThrough = today < end ? today : end;
  const monthlyCanon = toNumber(monthlyCanonAmount);
  const installments: Date[] = [];

  for (let dueDate = new Date(start); dueDate <= dueThrough; dueDate = addMonths(dueDate, 1)) {
    installments.push(new Date(dueDate));
  }

  const paidTransactions = transactions.filter((transaction) => countsAsPaidRent(transaction, currency));
  const paidRent = paidTransactions.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const paidByCurrencyMap = new Map<string, number>();
  for (const transaction of transactions.filter((item) => countsAsPaidRent(item, currency))) {
    const code = transaction.currency || currency || "USD";
    paidByCurrencyMap.set(code, (paidByCurrencyMap.get(code) ?? 0) + toNumber(transaction.amount));
  }
  const rentDue = installments.length * monthlyCanon;
  const debtAmount = Math.max(0, rentDue - paidRent);
  let remainingPaid = paidRent;
  let overdueInstallments = 0;
  let oldestUnpaidDate: Date | null = null;

  for (const dueDate of installments) {
    if (remainingPaid >= monthlyCanon) {
      remainingPaid -= monthlyCanon;
    } else {
      overdueInstallments += 1;
      oldestUnpaidDate ??= dueDate;
      remainingPaid = 0;
    }
  }

  const debtDays = oldestUnpaidDate
    ? Math.max(0, Math.floor((today.getTime() - oldestUnpaidDate.getTime()) / 86400000))
    : 0;

  const lateFeeAmount = calculateLateFee(debtAmount, debtDays, lateFeeConfig);

  return {
    rentDue,
    paidRent,
    debtAmount,
    overdueInstallments,
    debtDays,
    lateFeeAmount,
    totalDue: round2(debtAmount + lateFeeAmount),
    paidByCurrency: Array.from(paidByCurrencyMap.entries()).map(([code, total]) => ({ currency: code, total })),
  };
}
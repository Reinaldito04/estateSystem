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
  paidByCurrency: { currency: string; total: number }[];
};

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

export function calculateLeaseBalance(
  startDate: Date | string,
  endDate: Date | string,
  monthlyCanonAmount: number | string,
  transactions: RentTransaction[],
  referenceDate = new Date(),
  currency?: string,
): LeaseBalance {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  const today = startOfDay(referenceDate);
  const dueThrough = today < end ? today : end;
  const monthlyCanon = Number(monthlyCanonAmount);
  const installments: Date[] = [];

  for (let dueDate = new Date(start); dueDate <= dueThrough; dueDate = addMonths(dueDate, 1)) {
    installments.push(new Date(dueDate));
  }

  const paidTransactions = transactions.filter((transaction) => countsAsPaidRent(transaction, currency));
  const paidRent = paidTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const paidByCurrencyMap = new Map<string, number>();
  for (const transaction of transactions.filter((item) => countsAsPaidRent(item))) {
    const code = transaction.currency || currency || "USD";
    paidByCurrencyMap.set(code, (paidByCurrencyMap.get(code) ?? 0) + Number(transaction.amount));
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

  return {
    rentDue,
    paidRent,
    debtAmount,
    overdueInstallments,
    debtDays,
    paidByCurrency: Array.from(paidByCurrencyMap.entries()).map(([code, total]) => ({ currency: code, total })),
  };
}
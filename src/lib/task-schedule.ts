import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import type { RecurrenceFrequency } from "@prisma/client";

export function nextDueDate(
  from: Date,
  frequency: RecurrenceFrequency,
  intervalCount = 1,
): Date | null {
  const step = Math.max(1, intervalCount);
  switch (frequency) {
    case "ONCE":
      return null;
    case "DAILY":
      return addDays(from, step);
    case "WEEKLY":
      return addWeeks(from, step);
    case "MONTHLY":
      return addMonths(from, step);
    case "QUARTERLY":
      return addMonths(from, 3 * step);
    case "SEMIANNUAL":
      return addMonths(from, 6 * step);
    case "ANNUAL":
      return addYears(from, step);
    default:
      return null;
  }
}

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  ONCE: "Única vez",
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

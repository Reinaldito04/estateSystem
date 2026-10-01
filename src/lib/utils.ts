import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Decimal } from "@prisma/client/runtime/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | Decimal): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateDaysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const PAYMENT_CATEGORIES = [
  { value: "RENT_CANON", label: "Canon de Alquiler" },
  { value: "RESERVATION", label: "Pago de Reserva" },
  { value: "SECURITY_DEPOSIT", label: "Depósito de Garantía" },
  { value: "CONTRACT_FEE", label: "Gastos de Contrato" },
  { value: "CONDO_FEE", label: "Condominio" },
  { value: "ELECTRICITY", label: "Electricidad" },
  { value: "INTERNET", label: "Internet" },
  { value: "OTHER_SERVICE", label: "Otros Servicios" },
] as const;

export const ISSUE_STATUSES = [
  { value: "REPORTED", label: "Reportada", color: "bg-yellow-100 text-yellow-800" },
  { value: "IN_PROGRESS", label: "En Proceso", color: "bg-blue-100 text-blue-800" },
  { value: "RESOLVED", label: "Resuelta", color: "bg-green-100 text-green-800" },
  { value: "CANCELLED", label: "Cancelada", color: "bg-gray-100 text-gray-800" },
] as const;

export const PAYMENT_METHODS = [
  "Transferencia",
  "Zelle",
  "Efectivo",
  "Pago Móvil",
  "Tarjeta de Débito",
  "Tarjeta de Crédito",
  "Cheque",
  "Otro",
] as const;

export type PaymentCategory = (typeof PAYMENT_CATEGORIES)[number]["value"];
export type IssueStatus = (typeof ISSUE_STATUSES)[number]["value"];
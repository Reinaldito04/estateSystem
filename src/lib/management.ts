export const ASSET_CONDITIONS = [
  { value: "NEW", label: "Nuevo" },
  { value: "GOOD", label: "Bueno" },
  { value: "FAIR", label: "Regular" },
  { value: "POOR", label: "Malo" },
  { value: "DAMAGED", label: "Dañado" },
] as const;

export const ASSET_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "UNDER_REPAIR", label: "En reparación" },
  { value: "RETIRED", label: "Retirado" },
] as const;

export const PROVIDER_TYPES = [
  { value: "LABOR", label: "Mano de obra" },
  { value: "MATERIALS", label: "Materiales" },
  { value: "SERVICE", label: "Servicio" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "OTHER", label: "Otro" },
] as const;

export const TASK_CATEGORIES = [
  { value: "REVIEW", label: "Revisión" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "PAYMENT", label: "Pago" },
  { value: "CONTRACT", label: "Contrato" },
  { value: "VISIT", label: "Visita" },
  { value: "OTHER", label: "Otra" },
] as const;

export const TASK_STATUSES = [
  { value: "PENDING", label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  { value: "IN_PROGRESS", label: "En proceso", color: "bg-blue-100 text-blue-800" },
  { value: "DONE", label: "Completada", color: "bg-emerald-100 text-emerald-800" },
  { value: "CANCELLED", label: "Cancelada", color: "bg-gray-100 text-gray-800" },
] as const;

export const TASK_PRIORITIES = [
  { value: "LOW", label: "Baja" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
] as const;

export const RECURRENCE_OPTIONS = [
  { value: "ONCE", label: "Única vez" },
  { value: "DAILY", label: "Diaria" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "SEMIANNUAL", label: "Semestral" },
  { value: "ANNUAL", label: "Anual" },
] as const;

export const RESERVATION_TYPES = [
  { value: "VISIT", label: "Visita" },
  { value: "LEASE_HOLD", label: "Apartado de alquiler" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "BLOCK", label: "Bloqueo" },
] as const;

export const RESERVATION_STATUSES = [
  { value: "PENDING", label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  { value: "CONFIRMED", label: "Confirmada", color: "bg-emerald-100 text-emerald-800" },
  { value: "CANCELLED", label: "Cancelada", color: "bg-gray-100 text-gray-800" },
  { value: "COMPLETED", label: "Completada", color: "bg-blue-100 text-blue-800" },
] as const;

export function labelOf(options: readonly { value: string; label: string }[], value: string | null | undefined) {
  return options.find((option) => option.value === value)?.label || value || "-";
}

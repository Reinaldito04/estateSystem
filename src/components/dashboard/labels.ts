export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  RENTED: "Alquilado",
  MAINTENANCE: "Mantenimiento",
  INACTIVE: "Inactivo",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  STUDIO: "Estudio",
  OFFICE: "Oficina",
  COMMERCIAL: "Local comercial",
  WAREHOUSE: "Galpón",
  LAND: "Terreno",
  PARKING: "Estacionamiento",
  OTHER: "Otro",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_SIGNATURE: "Pendiente de firma",
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  TERMINATED: "Terminado",
  CANCELLED: "Cancelado",
};

export const INTEREST_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  VISITING: "Visitando",
  NEGOTIATING: "Negociando",
  CONVERTED: "Convertido",
  DISCARDED: "Descartado",
};

export const VISIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reportada",
  IN_PROGRESS: "En proceso",
  RESOLVED: "Resuelta",
  CANCELLED: "Cancelada",
};

export const PAYMENT_CATEGORY_LABELS: Record<string, string> = {
  RENT_CANON: "Canon de alquiler",
  RESERVATION: "Reserva",
  SECURITY_DEPOSIT: "Depósito de garantía",
  CONTRACT_FEE: "Gastos de contrato",
  CONDO_FEE: "Condominio",
  ELECTRICITY: "Electricidad",
  INTERNET: "Internet",
  OTHER_SERVICE: "Otros servicios",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Transferencia: "Transferencia",
  Zelle: "Zelle",
  Efectivo: "Efectivo",
  "Pago Móvil": "Pago Móvil",
  "Tarjeta de Débito": "Tarjeta de débito",
  "Tarjeta de Crédito": "Tarjeta de crédito",
  Cheque: "Cheque",
  Otro: "Otro",
};

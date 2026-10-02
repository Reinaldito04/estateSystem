export const DEFAULT_LEASE_TEMPLATE = {
  id: "default-lease-template",
  name: "Arrendamiento estándar",
  contractType: "LEASE",
  description: "Borrador base con las etiquetas principales del contrato.",
  content: `CONTRATO DE ARRENDAMIENTO

Número: {{contrato.numero}}
Moneda: {{contrato.moneda}}

Entre {{propietario.nombre}}, titular del documento {{propietario.documento}}, en adelante el propietario, y {{inquilino.nombre}}, titular del documento {{inquilino.documento}}, en adelante el inquilino, se celebra el presente contrato de arrendamiento.

PRIMERA. OBJETO. El propietario da en arrendamiento el inmueble {{inmueble.codigo}} - {{inmueble.titulo}}, ubicado en {{inmueble.direccion}}.

SEGUNDA. VIGENCIA. El contrato rige desde {{contrato.inicio}} hasta {{contrato.fin}}.

TERCERA. CANON. El inquilino pagará un canon mensual de {{contrato.canon}}. El depósito de garantía es {{contrato.deposito}}. La reserva es {{contrato.reserva}} y los gastos de contrato son {{contrato.gastos}}.

CUARTA. FIADOR. Fiador solidario: {{fiador.nombre}}.

QUINTA. OBLIGACIONES. El inquilino conservará el inmueble, pagará el canon en la fecha acordada y no cederá el contrato sin autorización escrita. El propietario mantendrá la posesión pacífica y atenderá las reparaciones estructurales.

SEXTA. ENTREGA. Al inicio y al final se levantará acta de entrega e inventario. El depósito se devolverá descontando cánones, servicios y daños no atribuibles al uso normal.

SÉPTIMA. TERMINACIÓN. El incumplimiento de pago o el uso distinto al pactado permite terminar el contrato. Cualquier renovación o reajuste debe constar por escrito.

Propietario: {{propietario.nombre}}
Inquilino: {{inquilino.nombre}}
Contacto del inquilino: {{inquilino.telefono}} / {{inquilino.email}}`,
};

type LeaseTemplateData = {
  contractNumber: string;
  startDate: Date | string;
  endDate: Date | string;
  monthlyCanonAmount: number | string;
  depositAmount: number | string;
  reservationAmount?: number | string;
  contractFeeAmount?: number | string;
  currency?: string;
  property: { code: string; title: string; address: string };
  tenant: { fullName: string; legalDocumentId?: string | null; phone?: string | null; email?: string | null };
  propertyOwner: { fullName: string; legalDocumentId?: string | null };
  guarantorName?: string | null;
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-VE").format(new Date(value));
}

export function formatTemplateMoney(value: number | string | null | undefined, currency = "USD") {
  const amount = Number(value ?? 0);
  return `${currency} ${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderLeaseTemplate(content: string, lease: LeaseTemplateData) {
  const currency = lease.currency || "USD";
  const variables: Record<string, string> = {
    "contrato.numero": lease.contractNumber,
    "contrato.inicio": formatDate(lease.startDate),
    "contrato.fin": formatDate(lease.endDate),
    "contrato.canon": formatTemplateMoney(lease.monthlyCanonAmount, currency),
    "contrato.deposito": formatTemplateMoney(lease.depositAmount, currency),
    "contrato.reserva": formatTemplateMoney(lease.reservationAmount, currency),
    "contrato.gastos": formatTemplateMoney(lease.contractFeeAmount, currency),
    "contrato.moneda": currency,
    "inmueble.codigo": lease.property.code,
    "inmueble.titulo": lease.property.title,
    "inmueble.direccion": lease.property.address,
    "inquilino.nombre": lease.tenant.fullName,
    "inquilino.documento": lease.tenant.legalDocumentId || "—",
    "inquilino.telefono": lease.tenant.phone || "—",
    "inquilino.email": lease.tenant.email || "—",
    "propietario.nombre": lease.propertyOwner.fullName,
    "propietario.documento": lease.propertyOwner.legalDocumentId || "—",
    "fiador.nombre": lease.guarantorName || "No aplica",
  };

  return content.replace(/{{\s*([^}]+)\s*}}/g, (_match, key: string) => variables[key.trim()] ?? "—");
}

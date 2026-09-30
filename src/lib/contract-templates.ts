export const DEFAULT_LEASE_TEMPLATE = {
  id: "default-lease-template",
  name: "Arrendamiento estándar",
  contractType: "LEASE",
  description: "Borrador base con las etiquetas principales del contrato.",
  content: `CONTRATO DE ARRENDAMIENTO\n\nEntre las partes, para el inmueble {{inmueble.codigo}} - {{inmueble.titulo}}, ubicado en {{inmueble.direccion}}, y el inquilino {{inquilino.nombre}}, se acuerda un canon mensual de {{contrato.canon}}.\n\nEl contrato estará vigente desde {{contrato.inicio}} hasta {{contrato.fin}}. El depósito de garantía acordado es de {{contrato.deposito}}.\n\nPropietario: {{propietario.nombre}}\nInquilino: {{inquilino.nombre}}\nNúmero de contrato: {{contrato.numero}}`,
};

type LeaseTemplateData = {
  contractNumber: string;
  startDate: Date | string;
  endDate: Date | string;
  monthlyCanonAmount: number | string;
  depositAmount: number | string;
  property: { code: string; title: string; address: string };
  tenant: { fullName: string };
  propertyOwner: { fullName: string };
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-VE").format(new Date(value));
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(Number(value));
}

export function renderLeaseTemplate(content: string, lease: LeaseTemplateData) {
  const variables: Record<string, string> = {
    "contrato.numero": lease.contractNumber,
    "contrato.inicio": formatDate(lease.startDate),
    "contrato.fin": formatDate(lease.endDate),
    "contrato.canon": formatMoney(lease.monthlyCanonAmount),
    "contrato.deposito": formatMoney(lease.depositAmount),
    "inmueble.codigo": lease.property.code,
    "inmueble.titulo": lease.property.title,
    "inmueble.direccion": lease.property.address,
    "inquilino.nombre": lease.tenant.fullName,
    "propietario.nombre": lease.propertyOwner.fullName,
  };

  return content.replace(/{{\s*([^}]+)\s*}}/g, (match, key: string) => variables[key.trim()] ?? match);
}
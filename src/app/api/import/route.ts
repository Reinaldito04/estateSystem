import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const ROLES = ["OWNER", "TENANT", "BUYER", "PROSPECT", "GUARANTOR"] as const;
const MARITAL = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "COMMON_LAW"] as const;
const RISK = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "STUDIO", "OFFICE", "COMMERCIAL", "WAREHOUSE", "LAND", "PARKING", "OTHER"] as const;
const PROPERTY_STATUS = ["AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "INACTIVE"] as const;
const CURRENCIES = ["USD", "EUR", "MXN", "COP", "ARS", "CLP", "PEN", "BRL", "OTHER"] as const;

type RowInput = Record<string, unknown>;

const clean = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
};

const cleanNumber = (value: unknown): number | undefined => {
  const text = clean(value);
  if (text === undefined) return undefined;
  const normalized = text.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
};

const clientSchema = z.object({
  fullName: z.string().min(1, "Nombre requerido"),
  legalDocumentId: z.string().min(1, "Documento requerido"),
  phone: z.string().min(1, "Teléfono requerido"),
  email: z.string().email("Correo inválido").optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(ROLES).optional(),
  maritalStatus: z.enum(MARITAL).optional(),
  riskLevel: z.enum(RISK).optional(),
  notes: z.string().optional(),
  workPlace: z.string().optional(),
  monthlyIncome: z.number().min(0).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredPropertyType: z.string().optional(),
  maxBudget: z.number().min(0).optional(),
  housingRequirement: z.string().optional(),
});

const propertySchema = z.object({
  code: z.string().min(1, "Código requerido"),
  title: z.string().min(1, "Título requerido"),
  address: z.string().min(1, "Dirección requerida"),
  city: z.string().min(1, "Ciudad requerida"),
  ownerDocumentId: z.string().min(1, "Documento del propietario requerido"),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  status: z.enum(PROPERTY_STATUS).optional(),
  totalAreaSqm: z.number().min(0).optional(),
  builtAreaSqm: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  condoFeeAmount: z.number().min(0).optional(),
  askingRentAmount: z.number().min(0).optional(),
  askingRentCurrency: z.enum(CURRENCIES).optional(),
});

const UPPER = (value: string | undefined) => (value ? value.toUpperCase().replace(/\s+/g, "_") : undefined);

function clientPayload(row: RowInput) {
  return clientSchema.safeParse({
    fullName: clean(row.fullName ?? row.nombre ?? row.name),
    legalDocumentId: clean(row.legalDocumentId ?? row.documento ?? row.documentId),
    phone: clean(row.phone ?? row.telefono),
    email: clean(row.email ?? row.correo),
    alternatePhone: clean(row.alternatePhone ?? row.telefonoAlterno),
    address: clean(row.address ?? row.direccion),
    city: clean(row.city ?? row.ciudad),
    role: UPPER(clean(row.role ?? row.rol)),
    maritalStatus: UPPER(clean(row.maritalStatus ?? row.estadoCivil)),
    riskLevel: UPPER(clean(row.riskLevel ?? row.riesgo)),
    notes: clean(row.notes ?? row.notas),
    workPlace: clean(row.workPlace ?? row.trabajo),
    monthlyIncome: cleanNumber(row.monthlyIncome ?? row.ingresoMensual),
    emergencyContactName: clean(row.emergencyContactName ?? row.contactoEmergencia),
    emergencyContactPhone: clean(row.emergencyContactPhone ?? row.telefonoEmergencia),
    preferredPropertyType: clean(row.preferredPropertyType ?? row.tipoPreferido),
    maxBudget: cleanNumber(row.maxBudget ?? row.presupuesto),
    housingRequirement: clean(row.housingRequirement ?? row.requerimiento),
  });
}

function propertyPayload(row: RowInput) {
  return propertySchema.safeParse({
    code: clean(row.code ?? row.codigo),
    title: clean(row.title ?? row.titulo),
    address: clean(row.address ?? row.direccion),
    city: clean(row.city ?? row.ciudad),
    ownerDocumentId: clean(row.ownerDocumentId ?? row.documentoPropietario ?? row.owner),
    propertyType: UPPER(clean(row.propertyType ?? row.tipo)),
    status: UPPER(clean(row.status ?? row.estado)),
    totalAreaSqm: cleanNumber(row.totalAreaSqm ?? row.areaTotal),
    builtAreaSqm: cleanNumber(row.builtAreaSqm ?? row.areaConstruida),
    bedrooms: cleanNumber(row.bedrooms ?? row.habitaciones),
    bathrooms: cleanNumber(row.bathrooms ?? row.banos),
    parkingSpaces: cleanNumber(row.parkingSpaces ?? row.estacionamientos),
    condoFeeAmount: cleanNumber(row.condoFeeAmount ?? row.condominio),
    askingRentAmount: cleanNumber(row.askingRentAmount ?? row.canonSolicitado),
    askingRentCurrency: UPPER(clean(row.askingRentCurrency ?? row.moneda)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = (await request.json()) as { type?: string; rows?: RowInput[] };
    const type = body.type;
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!["clients", "owners", "properties"].includes(type ?? "")) {
      return NextResponse.json({ error: "Tipo de importación no soportado" }, { status: 400 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "No hay filas para importar" }, { status: 400 });
    }
    if (rows.length > 2000) {
      return NextResponse.json({ error: "El máximo es de 2000 filas por importación" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    if (type === "clients" || type === "owners") {
      const forcedRole = type === "owners" ? "OWNER" : undefined;
      for (let index = 0; index < rows.length; index += 1) {
        const parsed = clientPayload(rows[index]);
        if (!parsed.success) {
          errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? "Fila inválida" });
          continue;
        }
        const data = parsed.data;
        const existing = await prisma.clientProfile.findUnique({ where: { legalDocumentId: data.legalDocumentId } });
        if (existing) {
          skipped += 1;
          errors.push({ row: index + 2, message: `El documento ${data.legalDocumentId} ya existe` });
          continue;
        }
        await prisma.clientProfile.create({
          data: {
            fullName: data.fullName,
            legalDocumentId: data.legalDocumentId,
            phone: data.phone,
            email: data.email ?? null,
            alternatePhone: data.alternatePhone ?? null,
            address: data.address ?? null,
            city: data.city ?? null,
            role: (forcedRole ?? data.role ?? "PROSPECT") as never,
            maritalStatus: (data.maritalStatus ?? null) as never,
            riskLevel: (data.riskLevel ?? "MEDIUM") as never,
            notes: data.notes ?? null,
            workPlace: data.workPlace ?? null,
            monthlyIncome: data.monthlyIncome !== undefined ? new Prisma.Decimal(data.monthlyIncome) : null,
            emergencyContactName: data.emergencyContactName ?? null,
            emergencyContactPhone: data.emergencyContactPhone ?? null,
            preferredPropertyType: data.preferredPropertyType ?? null,
            maxBudget: data.maxBudget !== undefined ? new Prisma.Decimal(data.maxBudget) : null,
            housingRequirement: data.housingRequirement ?? null,
          },
        });
        created += 1;
      }
    } else {
      for (let index = 0; index < rows.length; index += 1) {
        const parsed = propertyPayload(rows[index]);
        if (!parsed.success) {
          errors.push({ row: index + 2, message: parsed.error.issues[0]?.message ?? "Fila inválida" });
          continue;
        }
        const data = parsed.data;
        const owner = await prisma.clientProfile.findUnique({
          where: { legalDocumentId: data.ownerDocumentId },
          select: { id: true, role: true },
        });
        if (!owner) {
          errors.push({ row: index + 2, message: `No existe un propietario con documento ${data.ownerDocumentId}` });
          continue;
        }
        const existing = await prisma.property.findUnique({ where: { code: data.code } });
        if (existing) {
          skipped += 1;
          errors.push({ row: index + 2, message: `El código ${data.code} ya existe` });
          continue;
        }
        await prisma.property.create({
          data: {
            code: data.code,
            ownerId: owner.id,
            title: data.title,
            address: data.address,
            city: data.city,
            propertyType: (data.propertyType ?? "APARTMENT") as never,
            status: (data.status ?? "AVAILABLE") as never,
            totalAreaSqm: data.totalAreaSqm ?? null,
            builtAreaSqm: data.builtAreaSqm ?? null,
            bedrooms: data.bedrooms ?? null,
            bathrooms: data.bathrooms ?? null,
            parkingSpaces: data.parkingSpaces ?? null,
            condoFeeAmount: data.condoFeeAmount !== undefined ? new Prisma.Decimal(data.condoFeeAmount) : null,
            askingRentAmount: data.askingRentAmount !== undefined ? new Prisma.Decimal(data.askingRentAmount) : null,
            askingRentCurrency: (data.askingRentCurrency ?? "USD") as never,
          },
        });
        created += 1;
      }
    }

    await recordAudit({
      entityType: "Import",
      entityId: type ?? "unknown",
      action: "CREATE",
      userId: user.id,
      changes: { type, created, skipped, errors: errors.length },
      request,
    });

    return NextResponse.json({ created, skipped, errors });
  } catch (error) {
    console.error("Error importing rows:", error);
    return NextResponse.json({ error: "Error al importar los datos" }, { status: 500 });
  }
}

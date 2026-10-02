import { NextRequest, NextResponse } from "next/server";
import { fetchAuditLogs, AUDIT_ENTITY_TYPES } from "@/lib/audit-table";
import { parsePagination } from "@/lib/pagination";
import { handleRouteError } from "@/lib/domain-error";

type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

function isValidAuditEntityType(type: string): type is AuditEntityType {
  return AUDIT_ENTITY_TYPES.includes(type as AuditEntityType);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Guardar los parámetros en variables locales
    const rawEntityType = searchParams.get("entityType");
    const entityIdParam = searchParams.get("entityId");
    const actionParam = searchParams.get("action");
    const userIdParam = searchParams.get("userId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Convertir las fechas validando que el string exista (evita pasar `null` a Date)
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const { page, limit } = parsePagination(searchParams);

    let entityTypeError: string | null = null;
    if (rawEntityType && !isValidAuditEntityType(rawEntityType)) {
      entityTypeError = "Tipo de entidad inválido";
    }

    if (entityTypeError) {
      return NextResponse.json({ error: entityTypeError }, { status: 400 });
    }

    // Convertir `null` a `undefined` para que sea compatible con la firma de fetchAuditLogs
    const entityType = (rawEntityType && isValidAuditEntityType(rawEntityType))
      ? rawEntityType
      : undefined;
    const entityId = entityIdParam || undefined;
    const action = actionParam || undefined;
    const userId = userIdParam || undefined;

    const { logs, total, page: currentPage, limit: effectiveLimit } =
      await fetchAuditLogs(
        entityType,
        entityId,
        action,
        userId,
        startDate,
        endDate,
        { page, limit }
      );

    return NextResponse.json({
      data: logs,
      entityType: rawEntityType || "todos",
      entityId: entityIdParam || "",
      action: actionParam || "",
      total,
      page: currentPage,
      limit: effectiveLimit,
      entityTypes: AUDIT_ENTITY_TYPES,
      entityTypeLabels: {
        Lease: "Contrato",
        Property: "Inmueble",
        Client: "Cliente",
        Transaction: "Transacción",
        Issue: "Avería",
        Task: "Tarea",
        Asset: "Activo",
        Provider: "Proveedor",
        MaintenancePlan: "Plan Mantenimiento",
        User: "Usuario",
        ContractTemplate: "Plantilla Contrato",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Error al obtener historial de auditoría");
  }
}
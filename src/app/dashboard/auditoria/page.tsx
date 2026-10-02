"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  createdAt: Date;
  entityType: string;
  entityId: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  changesPreview: string;
}

const ENTITY_TYPE_OPTS = [
  { value: "Lease", label: "Contrato" },
  { value: "Property", label: "Inmueble" },
  { value: "Client", label: "Cliente" },
  { value: "Transaction", label: "Transacción" },
  { value: "Issue", label: "Avería" },
  { value: "Task", label: "Tarea" },
  { value: "Asset", label: "Activo" },
  { value: "Provider", label: "Proveedor" },
  { value: "MaintenancePlan", label: "Plan Mantenimiento" },
  { value: "User", label: "Usuario" },
  { value: "ContractTemplate", label: "Plantilla Contrato" },
];

function statusBadgeClass(action: string) {
  const map: Record<string, string> = {
    CREATE: "success",
    UPDATE: "info",
    DELETE: "destructive",
    SIGN: "primary",
    EXPIRE: "warning",
  };
  return map[action] || "secondary";
}

// Hook that derives filter values from search params without using state
function useDerivedFilters() {
  const search = useSearchParams();
  return {
    entityType: search.get("entityType") || "",
    entityId: search.get("entityId") || "",
    action: search.get("action") || "",
    userId: search.get("userId") || "",
    startDate: search.get("startDate") ? new Date(search.get("startDate")!) : undefined,
    endDate: search.get("endDate") ? new Date(search.get("endDate")!) : undefined,
  };
}

export function useAuditLogs() {
  const derived = useDerivedFilters();
  const initialLocal = {
    entityType: derived.entityType,
    entityId: derived.entityId,
    action: derived.action,
    userId: derived.userId,
    startDate: derived.startDate ?? null,
    endDate: derived.endDate ?? null,
  };
  const [filters, setFilters] = useState(initialLocal);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);

  // Función para cargar los logs con los filtros actuales
  const loadLogs = async (currentFilters: typeof filters) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.entityType) params.set("entityType", currentFilters.entityType);
      if (currentFilters.entityId) params.set("entityId", currentFilters.entityId);
      if (currentFilters.action) params.set("action", currentFilters.action);
      if (currentFilters.userId) params.set("userId", currentFilters.userId);
      if (currentFilters.startDate) params.set("startDate", formatDate(currentFilters.startDate));
      if (currentFilters.endDate) params.set("endDate", formatDate(currentFilters.endDate));
      params.set("page", "1");
      params.set("limit", "50");

      const response = await fetch(`/api/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Error al cargar");
      const data = await response.json();

      // Defensa: si el API no devuelve el shape esperado, no dejamos el estado en undefined
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (error) {
      console.error(error);
      // En caso de error también garantizamos que logs/total queden en un estado válido
      setLogs([]);
      setTotal(0);
    }
  };

  // Recarga cada vez que cambian los filtros (incluye la carga inicial)
  useEffect(() => {
    loadLogs(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.entityType,
    filters.entityId,
    filters.action,
    filters.userId,
    filters.startDate,
    filters.endDate,
  ]);

  // Para inputs de texto/fecha (eventos nativos del DOM)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "date" ? (value ? new Date(value) : null) : value,
    }));
  };

  // Para los Select de shadcn/Radix, que entregan directamente el valor (string), no un evento
  const handleSelectChange = (name: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(initialLocal);
  };

  return {
    logs,
    total,
    filters,
    ENTITY_TYPE_OPTS,
    statusBadgeClass,
    handleInputChange,
    handleSelectChange,
    resetFilters,
  };
}

function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
  const rows = logs ?? [];

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
            No hay registros de auditoría para mostrar
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Fecha</TableHead>
          <TableHead>Entidad</TableHead>
          <TableHead className="text-center">ID</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>IP</TableHead>
          <TableHead className="whitespace-pre-wrap">Cambios</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDate(log.createdAt)}</TableCell>
            <TableCell>{log.entityType}</TableCell>
            <TableCell className="text-sm truncate">{log.entityId?.slice(0, 8)}...</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                  log.action
                )}`}
              >
                {log.action}
              </span>
            </TableCell>
            <TableCell>{log.userName ?? "Sistema"}</TableCell>
            <TableCell>{log.ipAddress || "—"}</TableCell>
            <TableCell className="whitespace-pre-wrap" title={log.changesPreview}>
              {log.changesPreview}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

function AuditFiltersPanel({
  onInputChange,
  onSelectChange,
  onReset,
  filters,
  ENTITY_TYPE_OPTS,
}: {
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: "entityType" | "action", value: string) => void;
  onReset: () => void;
  filters: {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    startDate: Date | null;
    endDate: Date | null;
  };
  ENTITY_TYPE_OPTS: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <Select
        value={filters.entityType}
        onValueChange={(value) => onSelectChange("entityType", value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Tipo de entidad" />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPE_OPTS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="ID de entidad"
        value={filters.entityId}
        onChange={onInputChange}
        name="entityId"
        className="w-full"
      />

      <Select
        value={filters.action}
        onValueChange={(value) => onSelectChange("action", value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Acción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CREATE">Crear</SelectItem>
          <SelectItem value="UPDATE">Actualizar</SelectItem>
          <SelectItem value="DELETE">Eliminar</SelectItem>
          <SelectItem value="SIGN">Firmar</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Usuario ID"
        value={filters.userId}
        onChange={onInputChange}
        name="userId"
        className="w-full"
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={filters.startDate ? formatDate(filters.startDate) : ""}
          onChange={onInputChange}
          name="startDate"
          className="w-full"
        />
        <Input
          type="date"
          value={filters.endDate ? formatDate(filters.endDate) : ""}
          onChange={onInputChange}
          name="endDate"
          className="w-full"
        />
      </div>

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        Restablecer filtros
      </Button>
    </div>
  );
}

export default function AuditDashboardPage() {
  const {
    logs,
    total,
    filters,
    ENTITY_TYPE_OPTS,
    handleInputChange,
    handleSelectChange,
    resetFilters,
  } = useAuditLogs();

  const safeLogs = logs ?? [];

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Historial de Auditoría</h1>
        <p className="text-sm text-muted-foreground">Registro de todas las operaciones del sistema</p>
      </header>

      <AuditFiltersPanel
        ENTITY_TYPE_OPTS={ENTITY_TYPE_OPTS}
        filters={filters}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onReset={resetFilters}
      />

      <div className="mt-6">
        <Table>
          <AuditLogsTable logs={safeLogs} />
        </Table>

        {total > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Mostrando {safeLogs.length} de {total} entradas de auditoría
          </p>
        )}
      </div>
    </div>
  );
}
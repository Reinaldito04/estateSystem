"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  changes: unknown;
  createdAt: string;
  user: { id: string; fullName: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creado",
  UPDATE: "Actualizado",
  DELETE: "Eliminado",
};

export function PropertyAuditTimeline({ propertyId }: { propertyId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    let isCurrent = true;
    fetch(`/api/audit?entityType=Property&entityId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => {
        if (isCurrent) setLogs(result.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [propertyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Historial de cambios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cambios registrados todavía.</p>
        ) : (
          <ol className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-l-2 border-primary/30 pl-3">
                <div>
                  <p className="text-sm font-medium">
                    {ACTION_LABELS[log.action] || log.action}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {log.user?.fullName || "Sistema"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

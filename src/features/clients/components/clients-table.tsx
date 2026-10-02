import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Building2, Edit, Eye, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { TableSkeleton } from "@/components/shared/skeletons";
import type { ClientProfile, Pagination } from "../types";

interface ClientsTableProps {
  clients: ClientProfile[];
  pagination: Pagination;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  search: string;
  setSearch: (search: string) => void;
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (client: ClientProfile) => void;
  onDelete: (id: string) => void;
}

const roleLabels: Record<string, string> = {
  OWNER: "Propietario",
  TENANT: "Inquilino",
  BUYER: "Comprador",
  PROSPECT: "Prospecto",
  GUARANTOR: "Fiador",
};

const riskLabels: Record<string, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export function ClientsTable({
  clients,
  pagination,
  setPagination,
  search,
  setSearch,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
}: ClientsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lista de clientes</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento o correo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : clients.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay clientes registrados</p>
            <Button className="mt-4" onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer cliente
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabels[client.role] ?? client.role}</Badge>
                      </TableCell>
                      <TableCell>{client.legalDocumentId}</TableCell>
                      <TableCell>
                        <div>{client.phone}</div>
                        {client.email && <div className="text-sm text-muted-foreground">{client.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.riskLevel === "CRITICAL" ? "destructive" : client.riskLevel === "HIGH" ? "secondary" : "outline"}>
                          {riskLabels[client.riskLevel] ?? client.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(client)} aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(client.id)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild aria-label="Ver detalles">
                            <Link href={`/dashboard/clientes/${client.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

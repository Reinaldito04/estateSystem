import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Edit, Eye, Loader2, Plus, Search, Trash2, User } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Pagination, Tenant } from "../types";

interface TenantsTableProps {
  tenants: Tenant[];
  pagination: Pagination;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  search: string;
  setSearch: (search: string) => void;
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (id: string) => void;
}

export function TenantsTable({
  tenants,
  pagination,
  setPagination,
  search,
  setSearch,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
}: TenantsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lista de Inquilinos</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento, email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay inquilinos registrados</p>
            <Button className="mt-4" onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer inquilino
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Contratos</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.fullName}</TableCell>
                      <TableCell>{tenant.documentId}</TableCell>
                      <TableCell>
                        <div>{tenant.phone}</div>
                        {tenant.email && <div className="text-sm text-muted-foreground">{tenant.email}</div>}
                      </TableCell>
                      <TableCell>{tenant.monthlyIncome ? formatCurrency(tenant.monthlyIncome) : "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-sm text-primary">
                          {tenant._count.leases}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(tenant)} aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(tenant.id)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild aria-label="Ver detalles">
                            <Link href={`/dashboard/inquilinos/${tenant.id}`}>
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
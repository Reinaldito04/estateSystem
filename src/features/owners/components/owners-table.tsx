import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Building2, Edit, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import type { Owner, Pagination } from "../types";

interface OwnersTableProps {
  owners: Owner[];
  pagination: Pagination;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  search: string;
  setSearch: (search: string) => void;
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (owner: Owner) => void;
  onDelete: (id: string) => void;
}

export function OwnersTable({
  owners,
  pagination,
  setPagination,
  search,
  setSearch,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
}: OwnersTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Lista de Propietarios</CardTitle>
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
        ) : owners.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay propietarios registrados</p>
            <Button className="mt-4" onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer propietario
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
                    <TableHead>Inmuebles</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">{owner.fullName}</TableCell>
                      <TableCell>{owner.documentId}</TableCell>
                      <TableCell>
                        <div>{owner.phone}</div>
                        {owner.email && <div className="text-sm text-muted-foreground">{owner.email}</div>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-sm text-primary">
                          <Building2 className="h-3 w-3" />
                          {owner._count.properties}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(owner.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(owner)} aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(owner.id)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild aria-label="Ver detalles">
                            <Link href={`/dashboard/propietarios/${owner.id}`}>
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
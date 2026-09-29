"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building2,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Owner {
  id: string;
  fullName: string;
  documentId: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  bankDetails: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { properties: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    documentId: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: "",
    bankDetails: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });
      const response = await fetch(`/api/owners?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOwners(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar propietarios", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, [pagination.page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingOwner ? `/api/owners/${editingOwner.id}` : "/api/owners";
      const method = editingOwner ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: editingOwner ? "Actualizado" : "Creado",
          description: `Propietario ${editingOwner ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchOwners();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      fullName: owner.fullName,
      documentId: owner.documentId,
      email: owner.email || "",
      phone: owner.phone,
      alternatePhone: owner.alternatePhone || "",
      address: owner.address || "",
      bankDetails: owner.bankDetails || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este propietario?")) return;
    try {
      const response = await fetch(`/api/owners/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Propietario eliminado correctamente" });
        fetchOwners();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingOwner(null);
    setFormData({
      fullName: "",
      documentId: "",
      email: "",
      phone: "",
      alternatePhone: "",
      address: "",
      bankDetails: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propietarios</h1>
          <p className="text-muted-foreground mt-1">Gestión de fichas de propietarios e inmuebles asociados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Propietario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOwner ? "Editar Propietario" : "Nuevo Propietario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentId">Documento de Identidad *</Label>
                  <Input
                    id="documentId"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    required
                    placeholder="V-12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="0412-1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Teléfono Alternativo</Label>
                  <Input
                    id="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    placeholder="0424-1234567"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Calle principal, edificio, apartamento"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankDetails">Datos Bancarios</Label>
                  <Input
                    id="bankDetails"
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    placeholder="Banco, tipo de cuenta, número de cuenta"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingOwner ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Propietarios</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, documento, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay propietarios registrados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
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
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            <Building2 className="h-3 w-3" />
                            {owner._count.properties}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(owner.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(owner)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(owner.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Link href={`/dashboard/propietarios/${owner.id}`}>
                              <Button variant="ghost" size="icon" aria-label="Ver detalles">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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
    </div>
  );
}
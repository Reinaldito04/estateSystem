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
  Loader2,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  fullName: string;
  documentId: string;
  email: string | null;
  phone: string;
  workPlace: string | null;
  monthlyIncome: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { leases: number; propertyIssues: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    documentId: "",
    email: "",
    phone: "",
    workPlace: "",
    monthlyIncome: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });
      const response = await fetch(`/api/tenants?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar inquilinos", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [pagination.page, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : "/api/tenants";
      const method = editingTenant ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
        }),
      });
      if (response.ok) {
        toast({
          title: editingTenant ? "Actualizado" : "Creado",
          description: `Inquilino ${editingTenant ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchTenants();
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

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      fullName: tenant.fullName,
      documentId: tenant.documentId,
      email: tenant.email || "",
      phone: tenant.phone,
      workPlace: tenant.workPlace || "",
      monthlyIncome: tenant.monthlyIncome || "",
      emergencyContactName: tenant.emergencyContactName || "",
      emergencyContactPhone: tenant.emergencyContactPhone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este inquilino?")) return;
    try {
      const response = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Inquilino eliminado correctamente" });
        fetchTenants();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      fullName: "",
      documentId: "",
      email: "",
      phone: "",
      workPlace: "",
      monthlyIncome: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
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
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground mt-1">Gestión de fichas de inquilinos y contratos asociados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Inquilino
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTenant ? "Editar Inquilino" : "Nuevo Inquilino"}</DialogTitle>
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
                    placeholder="María González"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentId">Documento de Identidad *</Label>
                  <Input
                    id="documentId"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    required
                    placeholder="V-87654321"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="maria@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="0412-9876543"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workPlace">Lugar de Trabajo</Label>
                  <Input
                    id="workPlace"
                    value={formData.workPlace}
                    onChange={(e) => setFormData({ ...formData, workPlace: e.target.value })}
                    placeholder="Empresa ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Ingreso Mensual</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    step="0.01"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contacto de Emergencia</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="0412-1112233"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTenant ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Inquilinos</CardTitle>
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
          ) : tenants.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay inquilinos registrados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
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
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            {tenant._count.leases}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(tenant.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Link href={`/dashboard/inquilinos/${tenant.id}`}>
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
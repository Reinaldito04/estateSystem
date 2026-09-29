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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Building2,
  Home,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  status: string;
  owner: { id: string; fullName: string; phone: string };
  photos: { id: string; photoUrl: string; description: string | null }[];
  createdAt: string;
  _count: { leases: number; transactions: number; issues: number };
}

interface Owner {
  id: string;
  fullName: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Disponible" },
  { value: "occupied", label: "Ocupado" },
  { value: "maintenance", label: "En Mantenimiento" },
  { value: "unavailable", label: "No Disponible" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    ownerId: "",
    title: "",
    address: "",
    city: "",
    condoName: "",
    condoAccountNumber: "",
    electricityAccountNumber: "",
    internetProvider: "",
    internetAccountNumber: "",
    status: "available",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(ownerFilter && { ownerId: ownerFilter }),
      });
      const response = await fetch(`/api/properties?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar inmuebles", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/owners?limit=100");
      if (response.ok) {
        const data = await response.json();
        setOwners(data.data);
      }
    } catch {
      console.error("Error fetching owners");
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [pagination.page, search, statusFilter, ownerFilter]);

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingProperty ? `/api/properties/${editingProperty.id}` : "/api/properties";
      const method = editingProperty ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: editingProperty ? "Actualizado" : "Creado",
          description: `Inmueble ${editingProperty ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchProperties();
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

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    const p = property as unknown as Record<string, unknown>;
    setFormData({
      code: property.code,
      ownerId: property.owner.id,
      title: property.title,
      address: property.address,
      city: property.city,
      condoName: (p.condoName as string) || "",
      condoAccountNumber: (p.condoAccountNumber as string) || "",
      electricityAccountNumber: (p.electricityAccountNumber as string) || "",
      internetProvider: (p.internetProvider as string) || "",
      internetAccountNumber: (p.internetAccountNumber as string) || "",
      status: property.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este inmueble?")) return;
    try {
      const response = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Inmueble eliminado correctamente" });
        fetchProperties();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingProperty(null);
    setFormData({
      code: "",
      ownerId: "",
      title: "",
      address: "",
      city: "",
      condoName: "",
      condoAccountNumber: "",
      electricityAccountNumber: "",
      internetProvider: "",
      internetAccountNumber: "",
      status: "available",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      available: { label: "Disponible", className: "bg-green-100 text-green-800" },
      occupied: { label: "Ocupado", className: "bg-blue-100 text-blue-800" },
      maintenance: { label: "En Mantenimiento", className: "bg-yellow-100 text-yellow-800" },
      unavailable: { label: "No Disponible", className: "bg-red-100 text-red-800" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inmuebles</h1>
          <p className="text-muted-foreground mt-1">Gestión de propiedades, servicios y galería de fotos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Inmueble
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Editar Inmueble" : "Nuevo Inmueble"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    placeholder="C-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Propietario *</Label>
                  <Select value={formData.ownerId} onValueChange={(v) => setFormData({ ...formData, ownerId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar propietario" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>{owner.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Apartamento en La Lagunita"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder="Calle, urbanización, sector"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    placeholder="Caracas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Datos de Servicios</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="condoName">Nombre de Condominio</Label>
                    <Input
                      id="condoName"
                      value={formData.condoName}
                      onChange={(e) => setFormData({ ...formData, condoName: e.target.value })}
                      placeholder="Condominio Torre A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condoAccountNumber">Número de Cuenta Condominio</Label>
                    <Input
                      id="condoAccountNumber"
                      value={formData.condoAccountNumber}
                      onChange={(e) => setFormData({ ...formData, condoAccountNumber: e.target.value })}
                      placeholder="0102-0123-45-6789012345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityAccountNumber">Número de Cuenta Electricidad (NIC/NIS)</Label>
                    <Input
                      id="electricityAccountNumber"
                      value={formData.electricityAccountNumber}
                      onChange={(e) => setFormData({ ...formData, electricityAccountNumber: e.target.value })}
                      placeholder="NIC: 123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internetProvider">Proveedor de Internet</Label>
                    <Input
                      id="internetProvider"
                      value={formData.internetProvider}
                      onChange={(e) => setFormData({ ...formData, internetProvider: e.target.value })}
                      placeholder="Inter, NetUno, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internetAccountNumber">Número de Cuenta Internet</Label>
                    <Input
                      id="internetAccountNumber"
                      value={formData.internetAccountNumber}
                      onChange={(e) => setFormData({ ...formData, internetAccountNumber: e.target.value })}
                      placeholder="Número de contrato"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingProperty ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Inmuebles</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, título, dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay inmuebles registrados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer inmueble
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Contratos</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {property.photos.length > 0 ? (
                              <img
                                src={property.photos[0].photoUrl}
                                alt={property.title}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <Home className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            {property.code}
                          </div>
                        </TableCell>
                        <TableCell>{property.title}</TableCell>
                        <TableCell>{property.owner.fullName}</TableCell>
                        <TableCell>{property.city}</TableCell>
                        <TableCell>{getStatusBadge(property.status)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            {property._count.leases}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(property.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(property)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(property.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Link href={`/dashboard/inmuebles/${property.id}`}>
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
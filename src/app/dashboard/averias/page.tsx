"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
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
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDate, ISSUE_STATUSES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";

interface Issue {
  id: string;
  issueType: string;
  description: string;
  status: string;
  reportDate: string;
  repairDate: string | null;
  repairDetails: string | null;
  repairCost: string;
  receiptUrl: string | null;
  property: { id: string; code: string; title: string };
  tenant: { id: string; fullName: string; phone: string } | null;
  provider: { id: string; companyName: string } | null;
  reportedByType: string;
  createdAt: string;
}

interface Property {
  id: string;
  code: string;
  title: string;
}

interface Tenant {
  id: string;
  fullName: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [providers, setProviders] = useState<{ id: string; companyName: string }[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [totalCost, setTotalCost] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    issueType: "",
    description: "",
    status: "REPORTED",
    reportDate: "",
    reportedByType: "CLIENT",
    providerId: "",
    repairDate: "",
    repairDetails: "",
    repairCost: "",
    receiptUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const response = await fetch(`/api/issues?${params}`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data.data);
        setPagination(data.pagination);
        setTotalCost(data.summary.totalCost);
      } else {
        toast({ title: "Error", description: "Error al cargar averías", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch("/api/properties?limit=100");
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data);
      }
    } catch {
      console.error("Error fetching properties");
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/clients?role=TENANT&limit=100");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data);
      }
    } catch {
      console.error("Error fetching tenants");
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    fetchProperties();
    fetchTenants();
    fetch("/api/providers?active=true")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => setProviders(result.data ?? []))
      .catch(() => setProviders([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const url = editingIssue ? `/api/issues/${editingIssue.id}` : "/api/issues";
      const method = editingIssue ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tenantId: formData.tenantId || null,
          providerId: formData.providerId || null,
          repairCost: parseFloat(formData.repairCost) || 0,
          reportDate: formData.reportDate || null,
          repairDate: formData.repairDate || null,
        }),
      });
      if (response.ok) {
        toast({
          title: editingIssue ? "Actualizado" : "Creado",
          description: `Avería ${editingIssue ? "actualizada" : "creada"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchIssues();
      } else {
        const error = await response.json();
        const parsed = getApiError(error, "Error al guardar");
        setFieldErrors(parsed.fields);
        toast({ title: "Error", description: parsed.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setFormData({
      propertyId: issue.property.id,
      tenantId: issue.tenant?.id || "",
      issueType: issue.issueType,
      description: issue.description,
      status: issue.status,
      reportDate: issue.reportDate ? issue.reportDate.split("T")[0] : "",
      reportedByType: issue.reportedByType || "CLIENT",
      providerId: issue.provider?.id || "",
      repairDate: issue.repairDate ? issue.repairDate.split("T")[0] : "",
      repairDetails: issue.repairDetails || "",
      repairCost: issue.repairCost,
      receiptUrl: issue.receiptUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta avería?")) return;
    try {
      const response = await fetch(`/api/issues/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Avería eliminada correctamente" });
        fetchIssues();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "Error al eliminar").message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingIssue(null);
    setFormData({
      propertyId: "",
      tenantId: "",
      issueType: "",
      description: "",
      status: "REPORTED",
      reportDate: "",
      reportedByType: "CLIENT",
      providerId: "",
      repairDate: "",
      repairDetails: "",
      repairCost: "",
      receiptUrl: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      REPORTED: { label: "Reportada", className: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
      IN_PROGRESS: { label: "En Proceso", className: "bg-blue-100 text-blue-800", icon: <Clock className="h-3 w-3" /> },
      RESOLVED: { label: "Resuelta", className: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
      CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-800", icon: <XCircle className="h-3 w-3" /> },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800", icon: null };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${s.className}`}>
        {s.icon}
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Averías y Reparaciones</h1>
          <p className="text-muted-foreground mt-1">Registro de fallas, seguimiento y costos de reparación</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Avería
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIssue ? "Editar Avería" : "Nueva Avería"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="propertyId">Inmueble *</Label>
                  <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar inmueble" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Inquilino</Label>
                  <Select value={formData.tenantId} onValueChange={(v) => setFormData({ ...formData, tenantId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar inquilino" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueType">Tipo de Avería *</Label>
                  <Input
                    id="issueType"
                    value={formData.issueType}
                    onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                    required
                    placeholder="Plomería, Electricidad, etc."
                  />
                  <FieldError message={fieldErrors.issueType} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportDate">Fecha de Reporte</Label>
                  <Input
                    id="reportDate"
                    type="date"
                    value={formData.reportDate}
                    onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportedByType">Reportado por</Label>
                  <Select value={formData.reportedByType} onValueChange={(v) => setFormData({ ...formData, reportedByType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLIENT">Inquilino</SelectItem>
                      <SelectItem value="OWNER">Propietario</SelectItem>
                      <SelectItem value="USER">Usuario interno</SelectItem>
                      <SelectItem value="SYSTEM">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="providerId">Proveedor asignado</Label>
                  <Select value={formData.providerId || "none"} onValueChange={(v) => setFormData({ ...formData, providerId: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>{provider.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Describir la avería reportada..."
                  />
                  <FieldError message={fieldErrors.description} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Detalles de Reparación (si aplica)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="repairDate">Fecha de Reparación</Label>
                    <Input
                      id="repairDate"
                      type="date"
                      value={formData.repairDate}
                      onChange={(e) => setFormData({ ...formData, repairDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repairCost">Costo Total</Label>
                    <Input
                      id="repairCost"
                      type="number"
                      step="0.01"
                      value={formData.repairCost}
                      onChange={(e) => setFormData({ ...formData, repairCost: e.target.value })}
                      placeholder="0"
                    />
                    <FieldError message={fieldErrors.repairCost} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="repairDetails">Detalles de la Solución</Label>
                    <Input
                      id="repairDetails"
                      value={formData.repairDetails}
                      onChange={(e) => setFormData({ ...formData, repairDetails: e.target.value })}
                      placeholder="Descripción de la reparación realizada..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="receiptUrl">URL de Factura</Label>
                    <Input
                      id="receiptUrl"
                      value={formData.receiptUrl}
                      onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                      placeholder="https://..."
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
                  {editingIssue ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Averías</p>
                <p className="text-3xl font-bold mt-1">{pagination.total}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Wrench className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Costo Total Reparaciones</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalCost)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mostrando</p>
                <p className="text-3xl font-bold mt-1">{issues.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Wrench className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Averías</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tipo, descripción..."
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
                  {ISSUE_STATUSES.map((s) => (
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
          ) : issues.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay averías registradas</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera avería
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Inmueble</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{formatDate(issue.reportDate)}</TableCell>
                        <TableCell>
                          <div>{issue.property.code}</div>
                          <div className="text-sm text-muted-foreground">{issue.property.title}</div>
                        </TableCell>
                        <TableCell>{issue.issueType}</TableCell>
                        <TableCell className="max-w-xs truncate">{issue.description}</TableCell>
                        <TableCell>{getStatusBadge(issue.status)}</TableCell>
                        <TableCell>{issue.repairCost ? formatCurrency(issue.repairCost) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(issue)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(issue.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Link href={`/dashboard/averias/${issue.id}`}>
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
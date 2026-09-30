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
  FileText,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Lease {
  id: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyCanonAmount: string;
  depositAmount: string;
  reservationAmount: string;
  contractFeeAmount: string;
  contractFileUrl: string | null;
  isActive: boolean;
  contractStatus: string;
  renewalMode: string;
  renewalNoticeDays: number;
  priceAdjustmentType: string;
  priceAdjustmentValue: string | null;
  priceAdjustmentIndex: string | null;
  nextAdjustmentDate: string | null;
  guarantorRequired: boolean;
  guarantorName: string | null;
  guarantorDocumentId: string | null;
  guarantorPhone: string | null;
  guarantorEmail: string | null;
  signatureStatus: string;
  signatureProvider: string | null;
  property: { id: string; code: string; title: string; address: string };
  tenant: { id: string; fullName: string; phone: string; email: string | null };
    balance: {
      rentDue: number;
      paidRent: number;
      debtAmount: number;
      overdueInstallments: number;
      debtDays: number;
    };
  createdAt: string;
  _count: { transactions: number; notices: number };
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

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantId: "",
    contractNumber: "",
    startDate: "",
    endDate: "",
    monthlyCanonAmount: "",
    depositAmount: "",
    reservationAmount: "",
    contractFeeAmount: "",
    contractFileUrl: "",
    contractStatus: "DRAFT",
    renewalMode: "MANUAL",
    renewalNoticeDays: "30",
    priceAdjustmentType: "NONE",
    priceAdjustmentValue: "",
    priceAdjustmentIndex: "",
    nextAdjustmentDate: "",
    guarantorRequired: false,
    guarantorName: "",
    guarantorDocumentId: "",
    guarantorPhone: "",
    guarantorEmail: "",
    signatureProvider: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchLeases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const response = await fetch(`/api/leases?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeases(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar contratos", variant: "destructive" });
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
      const response = await fetch("/api/tenants?limit=100");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data);
      }
    } catch {
      console.error("Error fetching tenants");
    }
  };

  useEffect(() => {
    fetchLeases();
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingLease ? `/api/leases/${editingLease.id}` : "/api/leases";
      const method = editingLease ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthlyCanonAmount: parseFloat(formData.monthlyCanonAmount),
          depositAmount: parseFloat(formData.depositAmount) || 0,
          reservationAmount: parseFloat(formData.reservationAmount) || 0,
          contractFeeAmount: parseFloat(formData.contractFeeAmount) || 0,
          renewalNoticeDays: parseInt(formData.renewalNoticeDays, 10) || 30,
          priceAdjustmentValue: formData.priceAdjustmentValue ? parseFloat(formData.priceAdjustmentValue) : null,
          nextAdjustmentDate: formData.nextAdjustmentDate || null,
          guarantorEmail: formData.guarantorEmail || undefined,
        }),
      });
      if (response.ok) {
        toast({
          title: editingLease ? "Actualizado" : "Creado",
          description: `Contrato ${editingLease ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchLeases();
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

  const handleEdit = (lease: Lease) => {
    setEditingLease(lease);
    setFormData({
      propertyId: lease.property.id,
      tenantId: lease.tenant.id,
      contractNumber: lease.contractNumber,
      startDate: lease.startDate.split("T")[0],
      endDate: lease.endDate.split("T")[0],
      monthlyCanonAmount: lease.monthlyCanonAmount,
      depositAmount: lease.depositAmount,
      reservationAmount: lease.reservationAmount,
      contractFeeAmount: lease.contractFeeAmount,
      contractFileUrl: lease.contractFileUrl || "",
      contractStatus: lease.contractStatus,
      renewalMode: lease.renewalMode,
      renewalNoticeDays: lease.renewalNoticeDays.toString(),
      priceAdjustmentType: lease.priceAdjustmentType,
      priceAdjustmentValue: lease.priceAdjustmentValue || "",
      priceAdjustmentIndex: lease.priceAdjustmentIndex || "",
      nextAdjustmentDate: lease.nextAdjustmentDate?.split("T")[0] || "",
      guarantorRequired: lease.guarantorRequired,
      guarantorName: lease.guarantorName || "",
      guarantorDocumentId: lease.guarantorDocumentId || "",
      guarantorPhone: lease.guarantorPhone || "",
      guarantorEmail: lease.guarantorEmail || "",
      signatureProvider: lease.signatureProvider || "",
      isActive: lease.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este contrato?")) return;
    try {
      const response = await fetch(`/api/leases/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Contrato eliminado correctamente" });
        fetchLeases();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingLease(null);
    setFormData({
      propertyId: "",
      tenantId: "",
      contractNumber: "",
      startDate: "",
      endDate: "",
      monthlyCanonAmount: "",
      depositAmount: "",
      reservationAmount: "",
      contractFeeAmount: "",
      contractFileUrl: "",
      contractStatus: "DRAFT",
      renewalMode: "MANUAL",
      renewalNoticeDays: "30",
      priceAdjustmentType: "NONE",
      priceAdjustmentValue: "",
      priceAdjustmentIndex: "",
      nextAdjustmentDate: "",
      guarantorRequired: false,
      guarantorName: "",
      guarantorDocumentId: "",
      guarantorPhone: "",
      guarantorEmail: "",
      signatureProvider: "",
      isActive: true,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (lease: Lease) => {
    const legalStatus: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Borrador", className: "bg-slate-100 text-slate-700" },
      IN_REVIEW: { label: "En revisión", className: "bg-amber-100 text-amber-800" },
      PENDING_SIGNATURE: { label: "Pendiente de firma", className: "bg-violet-100 text-violet-800" },
      ACTIVE: { label: "Activo", className: "bg-emerald-100 text-emerald-800" },
      EXPIRED: { label: "Vencido", className: "bg-rose-100 text-rose-800" },
      CANCELLED: { label: "Cancelado", className: "bg-gray-100 text-gray-700" },
    };
    if (legalStatus[lease.contractStatus]) {
      const status = legalStatus[lease.contractStatus];
      return <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>;
    }
    if (!lease.isActive) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Vencido</span>;
    }
    const daysLeft = calculateDaysUntil(lease.endDate);
    if (daysLeft <= 30) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysLeft} días
        </span>
      );
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Vigente</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos de Alquiler</h1>
          <p className="text-muted-foreground mt-1">Gestión de contratos, vencimientos y renovaciones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLease ? "Editar Contrato" : "Nuevo Contrato"}</DialogTitle>
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
                  <Label htmlFor="tenantId">Inquilino *</Label>
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
                  <Label htmlFor="contractNumber">Número de Contrato *</Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    required
                    placeholder="CT-2026-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractStatus">Estado legal</Label>
                  <Select value={formData.contractStatus} onValueChange={(v) => setFormData({ ...formData, contractStatus: v, isActive: v === "ACTIVE" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="IN_REVIEW">En revisión</SelectItem>
                      <SelectItem value="PENDING_SIGNATURE">Pendiente de firma</SelectItem>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="EXPIRED">Vencido</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de Inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha de Fin *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Montos del Contrato</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyCanonAmount">Canon Mensual *</Label>
                    <Input
                      id="monthlyCanonAmount"
                      type="number"
                      step="0.01"
                      value={formData.monthlyCanonAmount}
                      onChange={(e) => setFormData({ ...formData, monthlyCanonAmount: e.target.value })}
                      required
                      placeholder="850"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">Depósito de Garantía</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      step="0.01"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservationAmount">Monto de Reserva</Label>
                    <Input
                      id="reservationAmount"
                      type="number"
                      step="0.01"
                      value={formData.reservationAmount}
                      onChange={(e) => setFormData({ ...formData, reservationAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractFeeAmount">Gastos de Contrato</Label>
                    <Input
                      id="contractFeeAmount"
                      type="number"
                      step="0.01"
                      value={formData.contractFeeAmount}
                      onChange={(e) => setFormData({ ...formData, contractFeeAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium">Renovación y reajuste</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="renewalMode">Renovación</Label><Select value={formData.renewalMode} onValueChange={(value) => setFormData({ ...formData, renewalMode: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANUAL">Manual</SelectItem><SelectItem value="AUTOMATIC">Automática</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="renewalNoticeDays">Avisar con (días)</Label><Input id="renewalNoticeDays" type="number" min="1" max="365" value={formData.renewalNoticeDays} onChange={(event) => setFormData({ ...formData, renewalNoticeDays: event.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="priceAdjustmentType">Cláusula de ajuste</Label><Select value={formData.priceAdjustmentType} onValueChange={(value) => setFormData({ ...formData, priceAdjustmentType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Sin ajuste</SelectItem><SelectItem value="IPC">IPC</SelectItem><SelectItem value="FIXED_PERCENT">Porcentaje fijo</SelectItem><SelectItem value="INDEX">Índice configurable</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="priceAdjustmentValue">Valor del ajuste (%)</Label><Input id="priceAdjustmentValue" type="number" min="0" step="0.01" value={formData.priceAdjustmentValue} onChange={(event) => setFormData({ ...formData, priceAdjustmentValue: event.target.value })} placeholder="0" /></div>
                  <div className="space-y-2"><Label htmlFor="priceAdjustmentIndex">Índice de referencia</Label><Input id="priceAdjustmentIndex" value={formData.priceAdjustmentIndex} onChange={(event) => setFormData({ ...formData, priceAdjustmentIndex: event.target.value })} placeholder="IPC Venezuela, INPC..." /></div>
                  <div className="space-y-2"><Label htmlFor="nextAdjustmentDate">Próximo reajuste</Label><Input id="nextAdjustmentDate" type="date" value={formData.nextAdjustmentDate} onChange={(event) => setFormData({ ...formData, nextAdjustmentDate: event.target.value })} /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium">Garantías y fiador</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 md:col-span-2"><input id="guarantorRequired" type="checkbox" checked={formData.guarantorRequired} onChange={(event) => setFormData({ ...formData, guarantorRequired: event.target.checked })} className="h-4 w-4 accent-primary" /><Label htmlFor="guarantorRequired">Este contrato requiere fiador o aval</Label></div>
                  {formData.guarantorRequired && <><Input placeholder="Nombre del fiador" value={formData.guarantorName} onChange={(event) => setFormData({ ...formData, guarantorName: event.target.value })} required /><Input placeholder="Documento del fiador" value={formData.guarantorDocumentId} onChange={(event) => setFormData({ ...formData, guarantorDocumentId: event.target.value })} /><Input placeholder="Teléfono del fiador" value={formData.guarantorPhone} onChange={(event) => setFormData({ ...formData, guarantorPhone: event.target.value })} /><Input type="email" placeholder="Correo del fiador" value={formData.guarantorEmail} onChange={(event) => setFormData({ ...formData, guarantorEmail: event.target.value })} /></>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractFileUrl">URL del Contrato (PDF)</Label>
                <Input
                  id="contractFileUrl"
                  value={formData.contractFileUrl}
                  onChange={(e) => setFormData({ ...formData, contractFileUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatureProvider">Proveedor de firma electrónica</Label>
                <Input id="signatureProvider" value={formData.signatureProvider} onChange={(event) => setFormData({ ...formData, signatureProvider: event.target.value })} placeholder="DocuSign, Signaturit, firma interna..." />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingLease ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Contratos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por contrato, inmueble, inquilino..."
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
                  <SelectItem value="active">Vigentes</SelectItem>
                  <SelectItem value="expired">Vencidos</SelectItem>
                  <SelectItem value="expiring">Por vencer (30 días)</SelectItem>
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
          ) : leases.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay contratos registrados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer contrato
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Inmueble</TableHead>
                      <TableHead>Inquilino</TableHead>
                      <TableHead>Canon</TableHead>
                                            <TableHead>Deuda</TableHead>
                                            <TableHead>Días deuda</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leases.map((lease) => (
                      <TableRow key={lease.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {lease.contractNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{lease.property.code}</div>
                          <div className="text-sm text-muted-foreground">{lease.property.title}</div>
                        </TableCell>
                        <TableCell>
                          <div>{lease.tenant.fullName}</div>
                          <div className="text-sm text-muted-foreground">{lease.tenant.phone}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(lease.monthlyCanonAmount)}</TableCell>
                                                <TableCell>
                                                  <span className={lease.balance.debtAmount > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
                                                    {formatCurrency(lease.balance.debtAmount)}
                                                  </span>
                                                  <div className="text-xs text-muted-foreground">
                                                    {lease.balance.overdueInstallments} cuota{lease.balance.overdueInstallments === 1 ? "" : "s"}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <span className={lease.balance.debtDays > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
                                                    {lease.balance.debtDays}
                                                  </span>
                                                </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(lease)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(lease)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(lease.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Link href={`/dashboard/contratos/${lease.id}`}>
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
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
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  CURRENCIES,
  PAYMENT_STATUSES,
} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";

interface Transaction {
  id: string;
  category: string;
  amount: string;
  currency: string;
  status: string;
  paymentDate: string;
  dueDate: string | null;
  paymentMethod: string;
  referenceNumber: string | null;
  receiptUrl: string | null;
  description: string | null;
  property: { id: string; code: string; title: string };
  lease: { id: string; contractNumber: string } | null;
  createdAt: string;
}

interface Property {
  id: string;
  code: string;
  title: string;
}

interface Lease {
  id: string;
  contractNumber: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [totalsByCurrency, setTotalsByCurrency] = useState<{ currency: string; total: number }[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [leaseFilter, setLeaseFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    leaseId: "",
    category: "",
    amount: "",
    currency: "USD",
    status: "PAID",
    paymentDate: "",
    dueDate: "",
    paymentMethod: "",
    referenceNumber: "",
    receiptUrl: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...((propertyFilter || new URLSearchParams(window.location.search).get("propertyId")) && {
          propertyId: propertyFilter || new URLSearchParams(window.location.search).get("propertyId") || "",
        }),
        ...((leaseFilter || new URLSearchParams(window.location.search).get("leaseId")) && {
          leaseId: leaseFilter || new URLSearchParams(window.location.search).get("leaseId") || "",
        }),
      });
      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data);
        setPagination(data.pagination);
        setTotalsByCurrency(data.summary?.byCurrency ?? []);
      } else {
        toast({ title: "Error", description: "Error al cargar transacciones", variant: "destructive" });
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

  const fetchLeases = async () => {
    try {
      const response = await fetch("/api/leases?limit=100");
      if (response.ok) {
        const data = await response.json();
        setLeases(data.data);
      }
    } catch {
      console.error("Error fetching leases");
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, search, categoryFilter, statusFilter, propertyFilter, leaseFilter]);

  useEffect(() => {
    fetchProperties();
    fetchLeases();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          leaseId: formData.leaseId || null,
          dueDate: formData.dueDate || null,
        }),
      });
      if (response.ok) {
        toast({
          title: editingTransaction ? "Actualizado" : "Creado",
          description: `Transacción ${editingTransaction ? "actualizada" : "creada"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchTransactions();
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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      propertyId: transaction.property.id,
      leaseId: transaction.lease?.id || "",
      category: transaction.category,
      amount: transaction.amount,
      currency: transaction.currency || "USD",
      status: transaction.status || "PAID",
      paymentDate: transaction.paymentDate.split("T")[0],
      dueDate: transaction.dueDate ? transaction.dueDate.split("T")[0] : "",
      paymentMethod: transaction.paymentMethod,
      referenceNumber: transaction.referenceNumber || "",
      receiptUrl: transaction.receiptUrl || "",
      description: transaction.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta transacción?")) return;
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Transacción eliminada correctamente" });
        fetchTransactions();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "Error al eliminar").message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      propertyId: "",
      leaseId: "",
      category: "",
      amount: "",
      currency: "USD",
      status: "PAID",
      paymentDate: "",
      dueDate: "",
      paymentMethod: "",
      referenceNumber: "",
      receiptUrl: "",
      description: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    return PAYMENT_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const handleLeaseFilterChange = (value: string) => {
    const nextValue = value === "all" ? "" : value;
    setLeaseFilter(nextValue);
    const url = new URL(window.location.href);
    if (nextValue) {
      url.searchParams.set("leaseId", nextValue);
    } else {
      url.searchParams.delete("leaseId");
    }
    window.history.replaceState({}, "", url);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      RENT_CANON: "bg-blue-100 text-blue-800",
      RESERVATION: "bg-purple-100 text-purple-800",
      SECURITY_DEPOSIT: "bg-yellow-100 text-yellow-800",
      CONTRACT_FEE: "bg-orange-100 text-orange-800",
      CONDO_FEE: "bg-green-100 text-green-800",
      ELECTRICITY: "bg-cyan-100 text-cyan-800",
      INTERNET: "bg-indigo-100 text-indigo-800",
      OTHER_SERVICE: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category] || "bg-gray-100 text-gray-800"}`}>
        {getCategoryLabel(category)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const option = PAYMENT_STATUSES.find((item) => item.value === status);
    if (!option) return <span className="text-muted-foreground">{status}</span>;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>{option.label}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transacciones y Pagos</h1>
          <p className="text-muted-foreground mt-1">Registro unificado de pagos, canon, servicios y comprobantes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Editar Transacción" : "Nueva Transacción"}</DialogTitle>
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
                  <FieldError message={fieldErrors.propertyId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseId">Contrato (opcional)</Label>
                  <Select value={formData.leaseId} onValueChange={(v) => setFormData({ ...formData, leaseId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {leases.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.contractNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.category} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="850"
                  />
                  <FieldError message={fieldErrors.amount} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado del Pago</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Fecha de Pago *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                  <FieldError message={fieldErrors.paymentDate} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pago *</Label>
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.paymentMethod} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Número de Referencia</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="REF-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptUrl">URL del Comprobante</Label>
                  <Input
                    id="receiptUrl"
                    value={formData.receiptUrl}
                    onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTransaction ? "Actualizar" : "Crear"}
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
                <p className="text-sm font-medium text-muted-foreground">Total Transacciones</p>
                <p className="text-3xl font-bold mt-1">{pagination.total}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                {totalsByCurrency.length === 0 ? (
                  <p className="text-3xl font-bold mt-1">{formatCurrency(0)}</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {totalsByCurrency.map((row) => (
                      <p key={row.currency} className="text-xl font-bold tabular-nums">
                        {formatCurrency(row.total, row.currency)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mostrando</p>
                <p className="text-3xl font-bold mt-1">{transactions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Transacciones</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por referencia, descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PAYMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={propertyFilter} onValueChange={(value) => setPropertyFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Inmueble" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los inmuebles</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>{property.code} - {property.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={leaseFilter} onValueChange={handleLeaseFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los contratos</SelectItem>
                  {leases.map((lease) => (
                    <SelectItem key={lease.id} value={lease.id}>{lease.contractNumber}</SelectItem>
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
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay transacciones registradas</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera transacción
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
                      <TableHead>Contrato</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.paymentDate)}</TableCell>
                        <TableCell>
                          <div>{transaction.property.code}</div>
                          <div className="text-sm text-muted-foreground">{transaction.property.title}</div>
                        </TableCell>
                        <TableCell>
                          {transaction.lease ? (
                            <Link href={`/dashboard/contratos/${transaction.lease.id}`} className="font-medium text-primary hover:underline">
                              {transaction.lease.contractNumber}
                            </Link>
                          ) : <span className="text-muted-foreground">Sin contrato</span>}
                        </TableCell>
                        <TableCell>{getCategoryBadge(transaction.category)}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>{transaction.dueDate ? formatDate(transaction.dueDate) : "-"}</TableCell>
                        <TableCell>{transaction.referenceNumber || "-"}</TableCell>
                        <TableCell className="max-w-52 truncate" title={transaction.description || undefined}>{transaction.description || "-"}</TableCell>
                        <TableCell>
                          {transaction.receiptUrl ? (
                            <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver</a>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
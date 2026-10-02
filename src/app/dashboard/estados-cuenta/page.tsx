"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Download,
  Loader2,
  Save,
} from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_CATEGORIES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";

const INCOME_CATEGORIES = ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"];
const EXPENSE_CATEGORIES = ["CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"];

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  owner: { id: string; fullName: string; phone: string; email: string | null };
}

interface Transaction {
  id: string;
  category: string;
  amount: string;
  currency: string;
  status: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  description: string | null;
  property: { id: string; code: string; title: string } | null;
  lease: { id: string; contractNumber: string } | null;
}

interface Issue {
  id: string;
  issueType: string;
  description: string;
  status: string;
  repairDate: string | null;
  repairCost: string;
  repairDetails: string | null;
}

interface CurrencyTotal {
  currency: string;
  total: number;
}

interface StatementData {
  scope: "PROPERTY" | "OWNER" | "TENANT";
  property: Property | null;
  properties: Property[];
  period: { startDate: string | null; endDate: string | null };
  summary: {
    incomeByCurrency: CurrencyTotal[];
    expensesByCurrency: CurrencyTotal[];
    totalRepairCosts: number;
  };
  transactions: Transaction[];
  issues: Issue[];
}

type Scope = "PROPERTY" | "OWNER" | "TENANT";

type SavedStatement = {
  id: string;
  audience: string;
  propertyId: string | null;
  clientId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  property: { id: string; code: string; title: string } | null;
  client: { id: string; fullName: string } | null;
};

export default function AccountStatementsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<{ id: string; fullName: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; fullName: string }[]>([]);
  const [scope, setScope] = useState<Scope>("PROPERTY");
  const [propertyId, setPropertyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [savedStatements, setSavedStatements] = useState<SavedStatement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      fetch("/api/properties?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/owners?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/clients?role=TENANT&limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/account-statements/history").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([propertiesResult, ownersResult, tenantsResult, savedResult]) => {
        if (!isCurrent) return;
        setProperties(propertiesResult.data ?? []);
        setOwners(ownersResult.data ?? []);
        setTenants(tenantsResult.data ?? []);
        setSavedStatements(savedResult.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const loadSaved = async () => {
    const response = await fetch("/api/account-statements/history");
    if (response.ok) setSavedStatements((await response.json()).data);
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    if (scope === "PROPERTY" && propertyId) params.set("propertyId", propertyId);
    if (scope === "OWNER" && ownerId) params.set("ownerId", ownerId);
    if (scope === "TENANT" && tenantId) params.set("tenantId", tenantId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params;
  };

  const hasScope = scope === "PROPERTY" ? Boolean(propertyId) : scope === "OWNER" ? Boolean(ownerId) : Boolean(tenantId);

  const generateStatement = async () => {
    if (!hasScope) {
      toast({ title: "Error", description: "Seleccione el alcance del estado de cuenta", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/account-statements?${buildParams()}`);
      if (response.ok) {
        setStatement(await response.json());
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "Error al generar estado de cuenta").message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const exportPdf = () => {
    if (!hasScope) return;
    window.open(`/api/account-statements/pdf?${buildParams()}`, "_blank");
  };

  const saveStatement = async () => {
    if (!hasScope) return;
    try {
      const response = await fetch("/api/account-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: scope === "PROPERTY" ? propertyId : null,
          ownerId: scope === "OWNER" ? ownerId : null,
          tenantId: scope === "TENANT" ? tenantId : null,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      if (response.ok) {
        toast({ title: "Guardado", description: "Estado de cuenta registrado correctamente" });
        loadSaved();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "No se pudo guardar").message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const openSaved = async (saved: SavedStatement) => {
    const params = new URLSearchParams();
    if (saved.propertyId) {
      setScope("PROPERTY");
      setPropertyId(saved.propertyId);
      params.set("propertyId", saved.propertyId);
    } else if (saved.audience === "TENANT" && saved.clientId) {
      setScope("TENANT");
      setTenantId(saved.clientId);
      params.set("tenantId", saved.clientId);
    } else if (saved.clientId) {
      setScope("OWNER");
      setOwnerId(saved.clientId);
      params.set("ownerId", saved.clientId);
    }
    const start = saved.periodStart ? saved.periodStart.slice(0, 10) : "";
    const end = saved.periodEnd ? saved.periodEnd.slice(0, 10) : "";
    setStartDate(start);
    setEndDate(end);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);

    setIsLoading(true);
    try {
      const response = await fetch(`/api/account-statements?${params}`);
      if (response.ok) setStatement(await response.json());
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return PAYMENT_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estados de Cuenta</h1>
        <p className="text-muted-foreground mt-1">Balances por inmueble, propietario o inquilino con entradas y salidas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros del Estado de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="scope">Alcance *</Label>
              <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alcance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY">Inmueble</SelectItem>
                  <SelectItem value="OWNER">Propietario</SelectItem>
                  <SelectItem value="TENANT">Inquilino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "PROPERTY" && (
              <div className="space-y-2">
                <Label htmlFor="propertyId">Inmueble *</Label>
                <SearchableSelect
                  id="propertyId"
                  value={propertyId}
                  onValueChange={setPropertyId}
                  placeholder="Seleccionar inmueble"
                  searchPlaceholder="Buscar por código o título…"
                  options={properties.map((p) => ({ value: p.id, label: `${p.code} - ${p.title}`, keywords: `${p.code} ${p.title}` }))}
                  onSearch={async (query) => {
                    const response = await fetch(`/api/properties?search=${encodeURIComponent(query)}&limit=20`);
                    if (!response.ok) return [];
                    const data = await response.json();
                    return (data.data ?? []).map((p: { id: string; code: string; title: string }) => ({ value: p.id, label: `${p.code} - ${p.title}`, keywords: `${p.code} ${p.title}` }));
                  }}
                />
              </div>
            )}

            {scope === "OWNER" && (
              <div className="space-y-2">
                <Label htmlFor="ownerId">Propietario *</Label>
                <SearchableSelect
                  id="ownerId"
                  value={ownerId}
                  onValueChange={setOwnerId}
                  placeholder="Seleccionar propietario"
                  searchPlaceholder="Buscar propietario…"
                  options={owners.map((o) => ({ value: o.id, label: o.fullName }))}
                  onSearch={async (query) => {
                    const response = await fetch(`/api/owners?search=${encodeURIComponent(query)}&limit=20`);
                    if (!response.ok) return [];
                    const data = await response.json();
                    return (data.data ?? []).map((o: { id: string; fullName: string }) => ({ value: o.id, label: o.fullName }));
                  }}
                />
              </div>
            )}

            {scope === "TENANT" && (
              <div className="space-y-2">
                <Label htmlFor="tenantId">Inquilino *</Label>
                <SearchableSelect
                  id="tenantId"
                  value={tenantId}
                  onValueChange={setTenantId}
                  placeholder="Seleccionar inquilino"
                  searchPlaceholder="Buscar inquilino…"
                  options={tenants.map((t) => ({ value: t.id, label: t.fullName }))}
                  onSearch={async (query) => {
                    const response = await fetch(`/api/clients?role=TENANT&search=${encodeURIComponent(query)}&limit=20`);
                    if (!response.ok) return [];
                    const data = await response.json();
                    return (data.data ?? []).map((t: { id: string; fullName: string }) => ({ value: t.id, label: t.fullName }));
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={generateStatement} disabled={isLoading || !hasScope} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                Generar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {savedStatements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estados guardados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedStatements.map((saved) => (
                <div key={saved.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {saved.property ? `${saved.property.code} · ${saved.property.title}` : saved.client?.fullName || "General"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {saved.audience === "TENANT" ? "Inquilino" : "Propietario"} · {saved.periodStart ? formatDate(saved.periodStart) : "inicio"} a {saved.periodEnd ? formatDate(saved.periodEnd) : "hoy"} · {formatDate(saved.createdAt)}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => openSaved(saved)}>
                    Abrir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {statement && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Entradas</p>
                    {statement.summary.incomeByCurrency.length === 0 ? (
                      <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(0)}</p>
                    ) : (
                      statement.summary.incomeByCurrency.map((row) => (
                        <p key={row.currency} className="text-2xl font-bold mt-1 text-green-600">
                          {formatCurrency(row.total, row.currency)}
                        </p>
                      ))
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
                    <p className="text-sm font-medium text-muted-foreground">Total Salidas</p>
                    {statement.summary.expensesByCurrency.length === 0 ? (
                      <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(0)}</p>
                    ) : (
                      statement.summary.expensesByCurrency.map((row) => (
                        <p key={row.currency} className="text-2xl font-bold mt-1 text-red-600">
                          {formatCurrency(row.total, row.currency)}
                        </p>
                      ))
                    )}
                  </div>
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gastos Reparación</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(statement.summary.totalRepairCosts)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Estado de Cuenta - {statement.scope === "OWNER" ? "Propietario" : statement.scope === "TENANT" ? "Inquilino" : statement.property?.code}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {statement.properties.map((p) => `${p.code} · ${p.title}`).join(" | ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={saveStatement}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPdf}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Entradas (Cobros)
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Inmueble</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statement.transactions
                          .filter((t) => INCOME_CATEGORIES.includes(t.category))
                          .map((t) => (
                            <TableRow key={t.id}>
                              <TableCell>{formatDate(t.paymentDate)}</TableCell>
                              <TableCell>{t.property?.code || "-"}</TableCell>
                              <TableCell>{getCategoryLabel(t.category)}</TableCell>
                              <TableCell>{t.paymentMethod}</TableCell>
                              <TableCell>{t.status}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(t.amount, t.currency)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Salidas (Gastos de Servicios)
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Inmueble</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statement.transactions
                          .filter((t) => EXPENSE_CATEGORIES.includes(t.category))
                          .map((t) => (
                            <TableRow key={t.id}>
                              <TableCell>{formatDate(t.paymentDate)}</TableCell>
                              <TableCell>{t.property?.code || "-"}</TableCell>
                              <TableCell>{getCategoryLabel(t.category)}</TableCell>
                              <TableCell>{t.paymentMethod}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">{formatCurrency(t.amount, t.currency)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Gastos en Reparaciones
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statement.issues.map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell>{issue.repairDate ? formatDate(issue.repairDate) : "-"}</TableCell>
                            <TableCell>{issue.issueType}</TableCell>
                            <TableCell className="max-w-xs truncate">{issue.description}</TableCell>
                            <TableCell>{issue.status}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">{formatCurrency(issue.repairCost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

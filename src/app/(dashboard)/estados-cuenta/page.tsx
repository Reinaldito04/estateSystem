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
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_CATEGORIES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  owner: { id: string; fullName: string; phone: string; email: string | null };
}

interface Transaction {
  id: string;
  category: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  description: string | null;
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

interface StatementData {
  property: Property;
  period: { startDate: string | null; endDate: string | null };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalRepairCosts: number;
    balance: number;
  };
  transactions: Transaction[];
  issues: Issue[];
}

export default function AccountStatementsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchProperties();
  }, []);

  const generateStatement = async () => {
    if (!selectedProperty) {
      toast({ title: "Error", description: "Seleccione un inmueble", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        propertyId: selectedProperty,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const response = await fetch(`/api/account-statements?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStatement(data);
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al generar estado de cuenta", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
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
        <p className="text-muted-foreground mt-1">Generación de balances por inmueble con entradas y salidas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros del Estado de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Inmueble *</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
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
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateStatement} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                Generar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {statement && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Entradas</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{formatCurrency(statement.summary.totalIncome)}</p>
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
                    <p className="text-3xl font-bold mt-1 text-red-600">{formatCurrency(statement.summary.totalExpenses)}</p>
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
                    <p className="text-3xl font-bold mt-1 text-orange-600">{formatCurrency(statement.summary.totalRepairCosts)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Balance</p>
                    <p className={`text-3xl font-bold mt-1 ${statement.summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(statement.summary.balance)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${statement.summary.balance >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
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
                  <CardTitle>Estado de Cuenta - {statement.property.code}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {statement.property.title} | Propietario: {statement.property.owner.fullName}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
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
                          <TableHead>Categoría</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statement.transactions
                          .filter((t) => ["RENT_CANON", "RESERVATION", "SECURITY_DEPOSIT", "CONTRACT_FEE"].includes(t.category))
                          .map((t) => (
                            <TableRow key={t.id}>
                              <TableCell>{formatDate(t.paymentDate)}</TableCell>
                              <TableCell>{getCategoryLabel(t.category)}</TableCell>
                              <TableCell>{t.paymentMethod}</TableCell>
                              <TableCell>{t.referenceNumber || "-"}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(t.amount)}</TableCell>
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
                          <TableHead>Categoría</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statement.transactions
                          .filter((t) => ["CONDO_FEE", "ELECTRICITY", "INTERNET", "OTHER_SERVICE"].includes(t.category))
                          .map((t) => (
                            <TableRow key={t.id}>
                              <TableCell>{formatDate(t.paymentDate)}</TableCell>
                              <TableCell>{getCategoryLabel(t.category)}</TableCell>
                              <TableCell>{t.paymentMethod}</TableCell>
                              <TableCell>{t.referenceNumber || "-"}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">{formatCurrency(t.amount)}</TableCell>
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
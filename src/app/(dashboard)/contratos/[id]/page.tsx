"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, calculateDaysUntil, PAYMENT_CATEGORIES } from "@/lib/utils";

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
  createdAt: string;
  property: {
    id: string;
    code: string;
    title: string;
    address: string;
    owner: { id: string; fullName: string; phone: string; email: string | null };
  };
  tenant: {
    id: string;
    fullName: string;
    documentId: string;
    phone: string;
    email: string | null;
    workPlace: string | null;
  };
  transactions: {
    id: string;
    category: string;
    amount: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
  }[];
  notices: {
    id: string;
    noticeType: string;
    issueDate: string;
    proposedCanonAmount: string | null;
    proposedStartDate: string | null;
    proposedEndDate: string | null;
    documentUrl: string | null;
    notes: string | null;
  }[];
  documents: { id: string; documentName: string; fileUrl: string; uploadedAt: string }[];
  _count: { transactions: number; notices: number };
}

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lease, setLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const response = await fetch(`/api/leases/${id}`);
        if (response.ok) {
          const data = await response.json();
          setLease(data);
        }
      } catch (error) {
        console.error("Error fetching lease:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLease();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contrato no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/contratos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  const daysLeft = calculateDaysUntil(lease.endDate);
  const totalPaid = lease.transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/contratos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lease.contractNumber}</h1>
          <p className="text-muted-foreground">Contrato de Alquiler</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inmueble</p>
                <p className="font-medium">{lease.property.code}</p>
                <p className="text-sm text-muted-foreground">{lease.property.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inquilino</p>
                <p className="font-medium">{lease.tenant.fullName}</p>
                <p className="text-sm text-muted-foreground">{lease.tenant.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canon Mensual</p>
                <p className="text-2xl font-bold">{formatCurrency(lease.monthlyCanonAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${daysLeft <= 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vigencia</p>
                <p className={`text-2xl font-bold ${daysLeft <= 30 ? "text-red-600" : "text-green-600"}`}>
                  {lease.isActive ? `${daysLeft} días` : "Vencido"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Depósito de Garantía</p>
                <p className="font-medium">{formatCurrency(lease.depositAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Monto de Reserva</p>
                <p className="font-medium">{formatCurrency(lease.reservationAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Gastos de Contrato</p>
                <p className="font-medium">{formatCurrency(lease.contractFeeAmount)}</p>
              </div>
            </div>
            {lease.contractFileUrl && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Archivo del Contrato</p>
                  <a href={lease.contractFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Ver PDF
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Pagado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold">{lease._count.transactions}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Notificaciones</p>
                <p className="text-2xl font-bold">{lease._count.notices}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">{lease.documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {lease.transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay pagos registrados</p>
          ) : (
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
                  {lease.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.paymentDate)}</TableCell>
                      <TableCell>{PAYMENT_CATEGORIES.find((c) => c.value === t.category)?.label || t.category}</TableCell>
                      <TableCell>{t.paymentMethod}</TableCell>
                      <TableCell>{t.referenceNumber || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones y Propuestas</CardTitle>
        </CardHeader>
        <CardContent>
          {lease.notices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay notificaciones</p>
          ) : (
            <div className="space-y-3">
              {lease.notices.map((notice) => (
                <div key={notice.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {notice.noticeType === "LEASE_EXPIRATION" ? "Vencimiento de Contrato" :
                         notice.noticeType === "RENOVATION_PROPOSAL" ? "Propuesta de Renovación" :
                         "Notificación a Propietario"}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatDate(notice.issueDate)}</p>
                    </div>
                    {notice.documentUrl && (
                      <a href={notice.documentUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">Ver documento</Button>
                      </a>
                    )}
                  </div>
                  {notice.proposedCanonAmount && (
                    <p className="text-sm mt-2">Canon propuesto: {formatCurrency(notice.proposedCanonAmount)}</p>
                  )}
                  {notice.notes && <p className="text-sm text-muted-foreground mt-1">{notice.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
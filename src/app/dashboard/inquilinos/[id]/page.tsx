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
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  leases: {
    id: string;
    contractNumber: string;
    startDate: string;
    endDate: string;
    monthlyCanonAmount: string;
    isActive: boolean;
    property: { id: string; code: string; title: string };
  }[];
  propertyIssues: {
    id: string;
    issueType: string;
    description: string;
    status: string;
    reportDate: string;
    property: { id: string; code: string; title: string };
  }[];
  documents: { id: string; documentName: string; fileUrl: string; uploadedAt: string }[];
  _count: { leases: number; propertyIssues: number };
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch(`/api/tenants/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTenant(data);
        }
      } catch (error) {
        console.error("Error fetching tenant:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Inquilino no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/inquilinos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/inquilinos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tenant.fullName}</h1>
          <p className="text-muted-foreground">Inquilino - {tenant.documentId}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contratos</p>
                <p className="text-2xl font-bold">{tenant._count.leases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Averías</p>
                <p className="text-2xl font-bold">{tenant._count.propertyIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingreso Mensual</p>
                <p className="text-2xl font-bold">{tenant.monthlyIncome ? formatCurrency(tenant.monthlyIncome) : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trabajo</p>
                <p className="text-sm font-medium truncate max-w-[150px]">{tenant.workPlace || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{tenant.email}</p>
                </div>
              </div>
            )}
            {tenant.emergencyContactName && (
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contacto de Emergencia</p>
                  <p className="font-medium">{tenant.emergencyContactName} - {tenant.emergencyContactPhone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay documentos</p>
            ) : (
              <div className="space-y-2">
                {tenant.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{doc.documentName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">Ver</Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos del Inquilino</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.leases.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay contratos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Inmueble</TableHead>
                    <TableHead>Canon</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.leases.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">{lease.contractNumber}</TableCell>
                      <TableCell>{lease.property.code} - {lease.property.title}</TableCell>
                      <TableCell>{formatCurrency(lease.monthlyCanonAmount)}</TableCell>
                      <TableCell>{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={lease.isActive ? "success" : "secondary"}>
                          {lease.isActive ? "Vigente" : "Vencido"}
                        </Badge>
                      </TableCell>
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
          <CardTitle>Averías Reportadas</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.propertyIssues.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay averías</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inmueble</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.propertyIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{formatDate(issue.reportDate)}</TableCell>
                      <TableCell>{issue.property.code}</TableCell>
                      <TableCell>{issue.issueType}</TableCell>
                      <TableCell className="max-w-xs truncate">{issue.description}</TableCell>
                      <TableCell>
                        <Badge variant={issue.status === "RESOLVED" ? "success" : issue.status === "IN_PROGRESS" ? "default" : "secondary"}>
                          {issue.status === "REPORTED" ? "Reportada" : issue.status === "IN_PROGRESS" ? "En Proceso" : issue.status === "RESOLVED" ? "Resuelta" : "Cancelada"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Wrench,
  DollarSign,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, DetailSection } from "@/components/shared/page-header";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

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
  createdAt: string;
  property: {
    id: string;
    code: string;
    title: string;
    address: string;
    owner: { id: string; fullName: string; phone: string };
  };
  tenant: {
    id: string;
    fullName: string;
    phone: string;
  };
}

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const response = await fetch(`/api/issues/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIssue(data);
        }
      } catch (error) {
        console.error("Error fetching issue:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!issue) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Avería no encontrada</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/averias">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        backHref="/dashboard/averias"
        backLabel="Averías"
        eyebrow={issue.property.code}
        title={`Avería · ${issue.issueType}`}
        description={`Reportada el ${formatDate(issue.reportDate)}`}
        actions={
          <Badge variant={issue.status === "RESOLVED" ? "success" : issue.status === "IN_PROGRESS" ? "default" : "secondary"} className="px-3 py-1.5 text-sm">
            {issue.status === "REPORTED" ? "Reportada" : issue.status === "IN_PROGRESS" ? "En Proceso" : issue.status === "RESOLVED" ? "Resuelta" : "Cancelada"}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inmueble</p>
                <p className="font-medium">{issue.property.code}</p>
                <p className="text-sm text-muted-foreground">{issue.property.title}</p>
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
                <p className="text-sm text-muted-foreground">Reportado por</p>
                <p className="font-medium">{issue.tenant.fullName}</p>
                <p className="text-sm text-muted-foreground">{issue.tenant.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={issue.status === "RESOLVED" ? "success" : issue.status === "IN_PROGRESS" ? "default" : "secondary"}>
                  {issue.status === "REPORTED" ? "Reportada" : issue.status === "IN_PROGRESS" ? "En Proceso" : issue.status === "RESOLVED" ? "Resuelta" : "Cancelada"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo Reparación</p>
                <p className="text-2xl font-bold">{issue.repairCost ? formatCurrency(issue.repairCost) : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DetailSection title="Detalle del registro" eyebrow="Seguimiento">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Avería</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{issue.issueType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Reporte</p>
                <p className="font-medium">{formatDate(issue.reportDate)}</p>
              </div>
            </div>
            {issue.repairDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Reparación</p>
                  <p className="font-medium">{formatDate(issue.repairDate)}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Descripción</p>
              <p className="p-3 bg-muted rounded-lg">{issue.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Reparación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {issue.repairDetails ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Solución</p>
                <p className="p-3 bg-muted rounded-lg">{issue.repairDetails}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aún no se ha registrado la reparación</p>
            )}
            {issue.receiptUrl && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Factura</p>
                  <a href={issue.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Ver factura
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </DetailSection>

      <Card>
        <CardHeader>
          <CardTitle>Propietario del Inmueble</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{issue.property.owner.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{issue.property.owner.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
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
  Mail,
  Phone,
  MapPin,
  Zap,
  Wifi,
  Home,
  DollarSign,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_CATEGORIES } from "@/lib/utils";
import { PropertyCrmPanel } from "@/components/properties/property-crm-panel";
import { PropertyLocationMap, PropertyPhotoGallery } from "@/components/properties/property-visuals";

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  condoName: string | null;
  condoAccountNumber: string | null;
  electricityAccountNumber: string | null;
  internetProvider: string | null;
  internetAccountNumber: string | null;
  createdAt: string;
  owner: { id: string; fullName: string; phone: string; email: string | null };
  photos: { id: string; photoUrl: string; description: string | null }[];
  leases: {
    id: string;
    contractNumber: string;
    startDate: string;
    endDate: string;
    monthlyCanonAmount: string;
    isActive: boolean;
    tenant: { id: string; fullName: string; phone: string };
  }[];
  transactions: {
    id: string;
    category: string;
    amount: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
  }[];
  issues: {
    id: string;
    issueType: string;
    description: string;
    status: string;
    reportDate: string;
    repairCost: string;
    tenant: { id: string; fullName: string };
  }[];
  documents: { id: string; documentName: string; fileUrl: string; uploadedAt: string }[];
  _count: { leases: number; transactions: number; issues: number };
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`/api/properties/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-80 max-w-7xl items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Inmueble no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/inmuebles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
        <Button asChild variant="outline" size="icon" className="mt-1 shrink-0 rounded-full">
          <Link href="/dashboard/inmuebles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">{property.code}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{property.title}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{property.address}, {property.city}</span></p>
        </div>
        </div>
        <Badge variant={property.status === "available" ? "success" : "secondary"} className="w-fit shrink-0 px-3 py-1.5 text-sm">
          {property.status === "available" ? "Disponible" : property.status === "occupied" ? "Ocupado" : property.status === "maintenance" ? "En mantenimiento" : property.status === "unavailable" ? "No disponible" : property.status}
        </Badge>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <PropertyPhotoGallery title={property.title} photos={property.photos} />
        {property.latitude !== null && property.longitude !== null ? (
          <PropertyLocationMap
            title={property.title}
            latitude={property.latitude}
            longitude={property.longitude}
            address={property.address}
            city={property.city}
          />
        ) : (
          <section className="flex min-h-72 flex-col overflow-hidden rounded-lg border bg-card sm:min-h-80">
            <div className="flex items-center gap-2.5 border-b px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground"><MapPin className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold">Ubicación</h2><p className="text-xs text-muted-foreground">{property.city}</p></div></div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center"><MapPin className="h-7 w-7 text-muted-foreground" /><p className="font-medium">Ubicación no marcada</p><p className="text-sm text-muted-foreground">Añade el punto desde el formulario del inmueble.</p></div>
            <div className="border-t px-4 py-3 text-sm font-medium">{property.address}</div>
          </section>
        )}
      </section>

      <dl className="grid grid-cols-2 divide-x divide-y divide-border/70 overflow-hidden rounded-lg border bg-card sm:grid-cols-4 sm:divide-y-0">
        <div className="p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Propietario</dt><dd className="mt-2 truncate font-medium">{property.owner.fullName}</dd></div>
        <div className="p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contratos</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.leases}</dd></div>
        <div className="p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transacciones</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.transactions}</dd></div>
        <div className="p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Averías</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.issues}</dd></div>
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de Servicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property.condoName && (
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Condominio</p>
                  <p className="font-medium">{property.condoName}</p>
                  {property.condoAccountNumber && <p className="text-sm text-muted-foreground">Cta: {property.condoAccountNumber}</p>}
                </div>
              </div>
            )}
            {property.electricityAccountNumber && (
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Electricidad</p>
                  <p className="font-medium">{property.electricityAccountNumber}</p>
                </div>
              </div>
            )}
            {property.internetProvider && (
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Internet</p>
                  <p className="font-medium">{property.internetProvider}</p>
                  {property.internetAccountNumber && <p className="text-sm text-muted-foreground">Cta: {property.internetAccountNumber}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propietario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{property.owner.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{property.owner.phone}</p>
              </div>
            </div>
            {property.owner.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{property.owner.email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PropertyCrmPanel propertyId={property.id} />

      <Card>
        <CardHeader>
          <CardTitle>Contratos del Inmueble</CardTitle>
        </CardHeader>
        <CardContent>
          {property.leases.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay contratos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Canon</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {property.leases.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">{lease.contractNumber}</TableCell>
                      <TableCell>{lease.tenant.fullName}</TableCell>
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
          <CardTitle>Últimas Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {property.transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay transacciones</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {property.transactions.slice(0, 10).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.paymentDate)}</TableCell>
                      <TableCell>{PAYMENT_CATEGORIES.find((c) => c.value === t.category)?.label || t.category}</TableCell>
                      <TableCell>{t.paymentMethod}</TableCell>
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
          <CardTitle>Averías del Inmueble</CardTitle>
        </CardHeader>
        <CardContent>
          {property.issues.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay averías</p>
          ) : (
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
                  {property.issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{formatDate(issue.reportDate)}</TableCell>
                      <TableCell>{issue.issueType}</TableCell>
                      <TableCell className="max-w-xs truncate">{issue.description}</TableCell>
                      <TableCell>
                        <Badge variant={issue.status === "RESOLVED" ? "success" : issue.status === "IN_PROGRESS" ? "default" : "secondary"}>
                          {issue.status === "REPORTED" ? "Reportada" : issue.status === "IN_PROGRESS" ? "En Proceso" : issue.status === "RESOLVED" ? "Resuelta" : "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{issue.repairCost ? formatCurrency(issue.repairCost) : "-"}</TableCell>
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
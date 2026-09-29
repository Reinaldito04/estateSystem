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

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
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
      <div className="flex justify-center py-12">
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/inmuebles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{property.code} - {property.title}</h1>
          <p className="text-muted-foreground">{property.address}, {property.city}</p>
        </div>
      </div>

      {property.photos.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {property.photos.slice(0, 3).map((photo) => (
            <div key={photo.id} className="aspect-video rounded-lg overflow-hidden border">
              <img src={photo.photoUrl} alt={photo.description || property.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Propietario</p>
                <p className="font-medium">{property.owner.fullName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={property.status === "available" ? "success" : "secondary"}>
                  {property.status === "available" ? "Disponible" : property.status === "occupied" ? "Ocupado" : property.status}
                </Badge>
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
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold">{property._count.transactions}</p>
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
                <p className="text-2xl font-bold">{property._count.issues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
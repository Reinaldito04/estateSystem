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
  CreditCard,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface Owner {
  id: string;
  fullName: string;
  documentId: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  bankDetails: string | null;
  createdAt: string;
  updatedAt: string;
  properties: {
    id: string;
    code: string;
    title: string;
    address: string;
    city: string;
    status: string;
    _count: { leases: number; transactions: number; issues: number };
  }[];
  documents: {
    id: string;
    documentName: string;
    fileUrl: string;
    uploadedAt: string;
  }[];
  _count: { properties: number };
}

export default function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const response = await fetch(`/api/owners/${id}`);
        if (response.ok) {
          const data = await response.json();
          setOwner(data);
        }
      } catch (error) {
        console.error("Error fetching owner:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOwner();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Propietario no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/propietarios">
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
          <Link href="/dashboard/propietarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{owner.fullName}</h1>
          <p className="text-muted-foreground">Propietario - {owner.documentId}</p>
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
                <p className="text-sm text-muted-foreground">Inmuebles</p>
                <p className="text-2xl font-bold">{owner._count.properties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">{owner.documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registrado</p>
                <p className="text-lg font-bold">{formatDate(owner.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banco</p>
                <p className="text-sm font-medium truncate max-w-[150px]">{owner.bankDetails || "N/A"}</p>
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
                <p className="font-medium">{owner.phone}</p>
              </div>
            </div>
            {owner.alternatePhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono Alternativo</p>
                  <p className="font-medium">{owner.alternatePhone}</p>
                </div>
              </div>
            )}
            {owner.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{owner.email}</p>
                </div>
              </div>
            )}
            {owner.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{owner.address}</p>
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
            {owner.documents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay documentos</p>
            ) : (
              <div className="space-y-2">
                {owner.documents.map((doc) => (
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
          <CardTitle>Inmuebles del Propietario</CardTitle>
        </CardHeader>
        <CardContent>
          {owner.properties.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay inmuebles registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Contratos</TableHead>
                    <TableHead>Transacciones</TableHead>
                    <TableHead>Averías</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owner.properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.code}</TableCell>
                      <TableCell>{property.title}</TableCell>
                      <TableCell>{property.city}</TableCell>
                      <TableCell>
                        <Badge variant={property.status === "available" ? "success" : "secondary"}>
                          {property.status === "available" ? "Disponible" : property.status === "occupied" ? "Ocupado" : property.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{property._count.leases}</TableCell>
                      <TableCell>{property._count.transactions}</TableCell>
                      <TableCell>{property._count.issues}</TableCell>
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
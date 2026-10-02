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
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageHeader, DetailSection } from "@/components/shared/page-header";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

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
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const loadOwner = async () => {
    try {
      const response = await fetch(`/api/owners/${id}`);
      if (response.ok) {
        setOwner(await response.json());
      }
    } catch (error) {
      console.error("Error fetching owner:", error);
    }
  };

  useEffect(() => {
    const fetchOwner = async () => {
      await loadOwner();
      setIsLoading(false);
    };
    fetchOwner();
  }, [id]);

  const handleUploadDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("kind", "document");
      formData.append("documentName", documentName || documentFile.name);
      formData.append("file", documentFile);
      const response = await fetch(`/api/clients/${owner?.id}/media`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("No se pudo subir el documento");
      setDocumentFile(null);
      setDocumentName("");
      await loadOwner();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al subir el documento");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
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
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        backHref="/dashboard/propietarios"
        backLabel="Propietarios"
        eyebrow={owner.documentId}
        title={owner.fullName}
        description="Ficha del propietario, inmuebles y documentos asociados"
        actions={<Badge variant="secondary">{owner._count.properties} {owner._count.properties === 1 ? "inmueble" : "inmuebles"}</Badge>}
      />

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
            <form onSubmit={handleUploadDocument} className="mb-4 space-y-2 rounded-lg border p-3">
              <input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                placeholder="Nombre del documento (opcional)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                type="file"
                onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm"
                required
              />
              <Button type="submit" size="sm" disabled={isUploading}>
                {isUploading ? "Subiendo..." : "Subir documento"}
              </Button>
            </form>
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

      <DetailSection title="Inmuebles del propietario" eyebrow="Portafolio">
      <Card>
        <CardContent className="pt-6">
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
                      <TableCell>
                        <Link href={`/dashboard/inmuebles/${property.id}`} className="font-medium hover:text-primary">
                          {property.title}
                        </Link>
                      </TableCell>
                      <TableCell>{property.city}</TableCell>
                      <TableCell>
                        <Badge variant={property.status === "AVAILABLE" ? "success" : "secondary"}>
                          {property.status === "AVAILABLE" ? "Disponible" : property.status === "RENTED" ? "Alquilado" : property.status === "RESERVED" ? "Reservado" : property.status === "MAINTENANCE" ? "Mantenimiento" : property.status}
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
      </DetailSection>
    </div>
  );
}
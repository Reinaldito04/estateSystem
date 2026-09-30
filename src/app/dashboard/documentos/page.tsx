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
  Eye,
  Loader2,
  FolderOpen,
  FileText,
  Upload,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  entityType: string;
  entityId: string;
  documentName: string;
  fileUrl: string;
  uploadedAt: string;
}

interface Entity {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [owners, setOwners] = useState<Entity[]>([]);
  const [tenants, setTenants] = useState<Entity[]>([]);
  const [properties, setProperties] = useState<Entity[]>([]);
  const [leases, setLeases] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    entityType: "",
    entityId: "",
    documentName: "",
    fileUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(typeFilter && { entityType: typeFilter }),
      });
      const response = await fetch(`/api/documents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data);
      } else {
        toast({ title: "Error", description: "Error al cargar documentos", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      const [ownersRes, tenantsRes, propertiesRes, leasesRes] = await Promise.all([
        fetch("/api/owners?limit=100"),
        fetch("/api/tenants?limit=100"),
        fetch("/api/properties?limit=100"),
        fetch("/api/leases?limit=100"),
      ]);

      if (ownersRes.ok) {
        const data = await ownersRes.json();
        setOwners(data.data.map((o: { id: string; fullName: string }) => ({ id: o.id, name: o.fullName })));
      }
      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.data.map((t: { id: string; fullName: string }) => ({ id: t.id, name: t.fullName })));
      }
      if (propertiesRes.ok) {
        const data = await propertiesRes.json();
        setProperties(data.data.map((p: { id: string; code: string; title: string }) => ({ id: p.id, name: `${p.code} - ${p.title}` })));
      }
      if (leasesRes.ok) {
        const data = await leasesRes.json();
        setLeases(data.data.map((l: { id: string; contractNumber: string }) => ({ id: l.id, name: l.contractNumber })));
      }
    } catch {
      console.error("Error fetching entities");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  useEffect(() => {
    fetchEntities();
  }, []);

  const getEntitiesForType = (type: string) => {
    switch (type) {
      case "OWNER": return owners;
      case "TENANT": return tenants;
      case "PROPERTY": return properties;
      case "LEASE": return leases;
      default: return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingDocument ? `/api/documents/${editingDocument.id}` : "/api/documents";
      const method = editingDocument ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: editingDocument ? "Actualizado" : "Creado",
          description: `Documento ${editingDocument ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchDocuments();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({
      entityType: document.entityType,
      entityId: document.entityId,
      documentName: document.documentName,
      fileUrl: document.fileUrl,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este documento?")) return;
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Documento eliminado correctamente" });
        fetchDocuments();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingDocument(null);
    setFormData({
      entityType: "",
      entityId: "",
      documentName: "",
      fileUrl: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OWNER: "Propietario",
      TENANT: "Inquilino",
      PROPERTY: "Inmueble",
      LEASE: "Contrato",
    };
    return labels[type] || type;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      OWNER: "bg-blue-100 text-blue-800",
      TENANT: "bg-green-100 text-green-800",
      PROPERTY: "bg-purple-100 text-purple-800",
      LEASE: "bg-orange-100 text-orange-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
        {getTypeLabel(type)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground mt-1">Expediente digital de documentos por entidad</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDocument ? "Editar Documento" : "Nuevo Documento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="entityType">Tipo de Entidad *</Label>
                  <Select value={formData.entityType} onValueChange={(v) => setFormData({ ...formData, entityType: v, entityId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Propietario</SelectItem>
                      <SelectItem value="TENANT">Inquilino</SelectItem>
                      <SelectItem value="PROPERTY">Inmueble</SelectItem>
                      <SelectItem value="LEASE">Contrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityId">Entidad *</Label>
                  <Select value={formData.entityId} onValueChange={(v) => setFormData({ ...formData, entityId: v })} disabled={!formData.entityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar entidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEntitiesForType(formData.entityType).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="documentName">Nombre del Documento *</Label>
                  <Input
                    id="documentName"
                    value={formData.documentName}
                    onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                    required
                    placeholder="Cédula, RIF, Título de Propiedad..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fileUrl">URL del Archivo *</Label>
                  <Input
                    id="fileUrl"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    required
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingDocument ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Documentos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="OWNER">Propietario</SelectItem>
                  <SelectItem value="TENANT">Inquilino</SelectItem>
                  <SelectItem value="PROPERTY">Inmueble</SelectItem>
                  <SelectItem value="LEASE">Contrato</SelectItem>
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
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay documentos registrados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer documento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents
                    .filter((d) => !search || d.documentName.toLowerCase().includes(search.toLowerCase()))
                    .map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {document.documentName}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(document.entityType)}</TableCell>
                        <TableCell>
                          {getEntitiesForType(document.entityType).find((e) => e.id === document.entityId)?.name || document.entityId}
                        </TableCell>
                        <TableCell>{formatDate(document.uploadedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(document)} aria-label="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(document.id)} aria-label="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" aria-label="Ver documento">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
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
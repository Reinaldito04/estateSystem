"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
  UserRoundPlus,
  Users,
  FileStack,
  SlidersHorizontal,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";

type InterestStatus = "new" | "contacted" | "visit_scheduled" | "converted" | "lost";
type Interest = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: InterestStatus;
  notes: string | null;
  createdAt: string;
};
type CommentRecord = { id: string; authorName: string; content: string; createdAt: string };
type Review = { id: string; reviewerName: string; rating: number; comment: string; createdAt: string };
type Photo = { id: string; photoUrl: string; description: string | null; uploadedAt: string };
type DocumentRecord = { id: string; documentName: string; fileUrl: string; uploadedAt: string };
type FieldRow = { id: string; name: string; value: string };
type MediaKind = "photo" | "document";

interface CrmData {
  customFields: unknown;
  interests: Interest[];
  comments: CommentRecord[];
  reviews: Review[];
  photos: Photo[];
  documents: DocumentRecord[];
}

interface PropertyCrmPanelProps {
  propertyId: string;
}

const INTEREST_STATUSES: { value: InterestStatus; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "visit_scheduled", label: "Visita agendada" },
  { value: "converted", label: "Convertido" },
  { value: "lost", label: "Descartado" },
];

function fieldsFromUnknown(value: unknown): FieldRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([name, fieldValue], index) => ({
    id: `saved-${index}`,
    name,
    value: typeof fieldValue === "string" ? fieldValue : String(fieldValue ?? ""),
  }));
}

export function PropertyCrmPanel({ propertyId }: PropertyCrmPanelProps) {
  const [data, setData] = useState<CrmData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [interestForm, setInterestForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    source: "",
    status: "new" as InterestStatus,
    notes: "",
  });
  const [commentForm, setCommentForm] = useState({ authorName: "Equipo", content: "" });
  const [reviewForm, setReviewForm] = useState({ reviewerName: "", rating: "5", comment: "" });
  const [fieldRows, setFieldRows] = useState<FieldRow[]>([]);
  const [mediaKind, setMediaKind] = useState<MediaKind>("photo");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDescription, setMediaDescription] = useState("");
  const [documentName, setDocumentName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const refresh = async () => {
    const response = await fetch(`/api/properties/${propertyId}/crm`);
    if (!response.ok) throw new Error("No se pudo cargar la ficha CRM");
    const result = await response.json() as CrmData;
    setData(result);
    setFieldRows(fieldsFromUnknown(result.customFields));
  };

  useEffect(() => {
    let isCurrent = true;
    fetch(`/api/properties/${propertyId}/crm`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la ficha CRM");
        return response.json() as Promise<CrmData>;
      })
      .then((result) => {
        if (!isCurrent) return;
        setData(result);
        setFieldRows(fieldsFromUnknown(result.customFields));
      })
      .catch(() => {
        if (isCurrent) toast({ title: "Error", description: "No se pudo cargar la ficha CRM", variant: "destructive" });
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [propertyId, toast]);

  const refreshAfterSave = async (message: string) => {
    await refresh();
    toast({ title: "Guardado", description: message });
  };

  const createRecord = async (body: Record<string, unknown>, reset: () => void, message: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo guardar").message);
      reset();
      await refreshAfterSave(message);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo guardar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (type: "interest" | "comment" | "review", id: string) => {
    const confirmed = window.confirm("¿Eliminar este registro de la ficha?");
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/properties/${propertyId}/crm`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo eliminar").message);
      await refresh();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo eliminar", variant: "destructive" });
    }
  };

  const updateInterestStatus = async (id: string, status: InterestStatus) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/crm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar el seguimiento");
      await refresh();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo actualizar", variant: "destructive" });
    }
  };

  const uploadMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mediaFile) {
      toast({ title: "Selecciona un archivo", description: "Elige una imagen o documento para adjuntar", variant: "destructive" });
      return;
    }

    const form = new FormData();
    form.set("file", mediaFile);
    form.set("kind", mediaKind);
    if (mediaKind === "photo") form.set("description", mediaDescription);
    else form.set("documentName", documentName || mediaFile.name);

    setIsSaving(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/media`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo subir el archivo").message);
      setMediaFile(null);
      setMediaDescription("");
      setDocumentName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshAfterSave(mediaKind === "photo" ? "Imagen agregada a la galería" : "Documento agregado a la ficha");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMedia = async (fileUrl: string, kind: MediaKind) => {
    const filename = fileUrl.split("/").pop();
    if (!filename || !window.confirm("¿Eliminar este archivo?")) return;
    try {
      const response = await fetch(
        `/api/properties/${propertyId}/media/${encodeURIComponent(filename)}?kind=${kind}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo eliminar el archivo").message);
      await refresh();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo eliminar", variant: "destructive" });
    }
  };

  const saveCustomFields = async () => {
    const populatedRows = fieldRows.filter((field) => field.name.trim());
    const names = populatedRows.map((field) => field.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      toast({ title: "Campos repetidos", description: "Cada campo debe tener un nombre único", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customFields: Object.fromEntries(populatedRows.map(({ name, value }) => [name.trim(), value])),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudieron guardar los campos").message);
      await refreshAfterSave("Campos personalizados actualizados");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudieron guardar los campos", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const addField = () => setFieldRows((rows) => [...rows, { id: crypto.randomUUID(), name: "", value: "" }]);
  const updateField = (id: string, key: "name" | "value", value: string) =>
    setFieldRows((rows) => rows.map((field) => field.id === id ? { ...field, [key]: value } : field));

  const handleInterestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRecord({ type: "interest", ...interestForm }, () => setInterestForm({
      fullName: "", email: "", phone: "", source: "", status: "new", notes: "",
    }), "Interesado agregado a la ficha");
  };

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRecord({ type: "comment", ...commentForm }, () => setCommentForm({ authorName: "Equipo", content: "" }), "Comentario agregado");
  };

  const handleReviewSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRecord({ ...reviewForm, type: "review", rating: Number(reviewForm.rating) }, () =>
      setReviewForm({ reviewerName: "", rating: "5", comment: "" }), "Reseña agregada");
  };

  if (isLoading || !data) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="border-b bg-linear-to-br from-primary/[0.08] via-card to-card px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Relación y actividad</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Ficha CRM</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Centraliza prospectos, comentarios, reseñas, archivos y atributos propios del inmueble.</p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border bg-background/80 text-center">
            <div className="min-w-20 border-r px-3 py-2"><p className="text-lg font-semibold tabular-nums">{data.interests.length}</p><p className="text-[11px] text-muted-foreground">Interesados</p></div>
            <div className="min-w-20 border-r px-3 py-2"><p className="text-lg font-semibold tabular-nums">{data.photos.length}</p><p className="text-[11px] text-muted-foreground">Fotos</p></div>
            <div className="min-w-20 px-3 py-2"><p className="text-lg font-semibold tabular-nums">{data.documents.length}</p><p className="text-[11px] text-muted-foreground">Archivos</p></div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="interests" className="space-y-4">
        <div className="overflow-x-auto px-5 pt-4 sm:px-6">
          <TabsList className="h-auto min-w-max justify-start gap-1 rounded-lg border bg-muted/60 p-1">
            <TabsTrigger value="interests" className="gap-2"><Users className="h-4 w-4" />Interesados <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{data.interests.length}</Badge></TabsTrigger>
            <TabsTrigger value="comments" className="gap-2"><MessageSquare className="h-4 w-4" />Comentarios <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{data.comments.length}</Badge></TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2"><Star className="h-4 w-4" />Reseñas <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{data.reviews.length}</Badge></TabsTrigger>
            <TabsTrigger value="media" className="gap-2"><FileStack className="h-4 w-4" />Archivos</TabsTrigger>
            <TabsTrigger value="fields" className="gap-2"><SlidersHorizontal className="h-4 w-4" />Campos <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{fieldRows.filter((field) => field.name.trim()).length}</Badge></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="interests" className="space-y-5 px-5 pb-5 sm:px-6">
          <form onSubmit={handleInterestSubmit} className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div><h3 className="font-medium">Agregar interesado</h3><p className="text-sm text-muted-foreground">Registra un prospecto y su etapa actual.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="interest-name">Nombre *</Label><Input id="interest-name" value={interestForm.fullName} onChange={(event) => setInterestForm({ ...interestForm, fullName: event.target.value })} required /></div>
              <div className="space-y-1.5"><Label htmlFor="interest-email">Correo</Label><Input id="interest-email" type="email" value={interestForm.email} onChange={(event) => setInterestForm({ ...interestForm, email: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="interest-phone">Teléfono</Label><Input id="interest-phone" value={interestForm.phone} onChange={(event) => setInterestForm({ ...interestForm, phone: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="interest-source">Origen</Label><Input id="interest-source" placeholder="Portal, referido, redes..." value={interestForm.source} onChange={(event) => setInterestForm({ ...interestForm, source: event.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="interest-status">Estado</Label><select id="interest-status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={interestForm.status} onChange={(event) => setInterestForm({ ...interestForm, status: event.target.value as InterestStatus })}>{INTEREST_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>
              <div className="space-y-1.5"><Label htmlFor="interest-notes">Notas</Label><Input id="interest-notes" value={interestForm.notes} onChange={(event) => setInterestForm({ ...interestForm, notes: event.target.value })} /></div>
            </div>
            <Button type="submit" disabled={isSaving}><UserRoundPlus className="mr-2 h-4 w-4" />Agregar interesado</Button>
          </form>
          <div className="space-y-2">
            {data.interests.length === 0 ? <p className="py-5 text-sm text-muted-foreground">Aún no hay contactos interesados.</p> : data.interests.map((interest) => (
              <article key={interest.id} className="flex flex-col gap-3 rounded-lg border bg-background px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h3 className="font-medium">{interest.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{[interest.email, interest.phone, interest.source].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                  {interest.notes && <p className="text-sm">{interest.notes}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(interest.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select aria-label={`Estado de ${interest.fullName}`} className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={interest.status} onChange={(event) => updateInterestStatus(interest.id, event.target.value as InterestStatus)}>{INTEREST_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar interesado ${interest.fullName}`} title="Eliminar interesado" onClick={() => deleteRecord("interest", interest.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-5 px-5 pb-5 sm:px-6">
          <form onSubmit={handleCommentSubmit} className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <div className="space-y-1.5"><Label htmlFor="comment-author">Autor</Label><Input id="comment-author" value={commentForm.authorName} onChange={(event) => setCommentForm({ ...commentForm, authorName: event.target.value })} required /></div>
            <div className="space-y-1.5"><Label htmlFor="comment-content">Comentario interno *</Label><Textarea id="comment-content" value={commentForm.content} onChange={(event) => setCommentForm({ ...commentForm, content: event.target.value })} required /></div>
            <Button type="submit" disabled={isSaving}><MessageSquare className="mr-2 h-4 w-4" />Agregar</Button>
          </form>
          <div className="space-y-2">
            {data.comments.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No hay comentarios todavía.</p> : data.comments.map((comment) => (
              <article key={comment.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background px-4 py-3">
                <div><p className="text-sm">{comment.content}</p><p className="mt-1 text-xs text-muted-foreground">{comment.authorName} · {formatDate(comment.createdAt)}</p></div>
                <Button type="button" size="icon" variant="ghost" aria-label="Eliminar comentario" title="Eliminar comentario" onClick={() => deleteRecord("comment", comment.id)}><Trash2 className="h-4 w-4" /></Button>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-5 px-5 pb-5 sm:px-6">
          <form onSubmit={handleReviewSubmit} className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_9rem_2fr_auto] md:items-end">
            <div className="space-y-1.5"><Label htmlFor="reviewer-name">Nombre *</Label><Input id="reviewer-name" value={reviewForm.reviewerName} onChange={(event) => setReviewForm({ ...reviewForm, reviewerName: event.target.value })} required /></div>
            <div className="space-y-1.5"><Label htmlFor="review-rating">Calificación</Label><select id="review-rating" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} de 5</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="review-comment">Reseña *</Label><Input id="review-comment" value={reviewForm.comment} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} required /></div>
            <Button type="submit" disabled={isSaving}><Star className="mr-2 h-4 w-4" />Agregar</Button>
          </form>
          <div className="space-y-2">
            {data.reviews.length === 0 ? <p className="py-5 text-sm text-muted-foreground">No hay reseñas todavía.</p> : data.reviews.map((review) => (
              <article key={review.id} className="flex items-start justify-between gap-3 rounded-lg border bg-background px-4 py-3">
                <div><p className="font-medium">{review.reviewerName}</p><p className="my-1 flex items-center gap-1 text-amber-600" aria-label={`${review.rating} de 5 estrellas`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-muted-foreground"}`} />)}</p><p className="text-sm">{review.comment}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(review.createdAt)}</p></div>
                <Button type="button" size="icon" variant="ghost" aria-label="Eliminar reseña" title="Eliminar reseña" onClick={() => deleteRecord("review", review.id)}><Trash2 className="h-4 w-4" /></Button>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 px-5 pb-5 sm:px-6">
          <form onSubmit={uploadMedia} className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de archivo">
              <Button type="button" size="sm" variant={mediaKind === "photo" ? "default" : "outline"} onClick={() => { setMediaKind("photo"); setMediaFile(null); }}>Imagen</Button>
              <Button type="button" size="sm" variant={mediaKind === "document" ? "default" : "outline"} onClick={() => { setMediaKind("document"); setMediaFile(null); }}>Documento</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:items-end">
              <div className="space-y-1.5"><Label htmlFor="media-file">Archivo (máximo 20 MB)</Label><Input ref={fileInputRef} id="media-file" type="file" accept={mediaKind === "photo" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.doc,.docx,.xls,.xlsx,.txt"} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} required /></div>
              {mediaKind === "photo" ? <div className="space-y-1.5"><Label htmlFor="photo-description">Descripción</Label><Input id="photo-description" value={mediaDescription} onChange={(event) => setMediaDescription(event.target.value)} /></div> : <div className="space-y-1.5"><Label htmlFor="document-name">Nombre del documento</Label><Input id="document-name" value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder={mediaFile?.name || "Ej. Escritura de propiedad"} /></div>}
            </div>
            <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Adjuntar archivo</Button>
          </form>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium"><ImageIcon className="h-4 w-4" />Galería ({data.photos.length})</h3>
            {data.photos.length === 0 ? <p className="text-sm text-muted-foreground">No hay imágenes adjuntas.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.photos.map((photo) => (
              <figure key={photo.id} className="group relative overflow-hidden rounded-lg border bg-background transition-colors hover:border-primary/50">
                <Image src={photo.photoUrl} alt={photo.description || "Foto del inmueble"} width={640} height={360} unoptimized className="aspect-video w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-2 border-t p-2.5 text-sm"><span className="truncate">{photo.description || "Imagen del inmueble"}</span>{photo.photoUrl.startsWith(`/api/properties/${propertyId}/media/`) && <Button type="button" size="icon" variant="ghost" className="opacity-70 group-hover:opacity-100" aria-label="Eliminar imagen" title="Eliminar imagen" onClick={() => deleteMedia(photo.photoUrl, "photo")}><Trash2 className="h-4 w-4" /></Button>}</figcaption>
              </figure>
            ))}</div>}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" />Documentos ({data.documents.length})</h3>
            {data.documents.length === 0 ? <p className="text-sm text-muted-foreground">No hay documentos adjuntos.</p> : <div className="space-y-2">{data.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"><a className="min-w-0 truncate text-sm font-medium text-primary hover:underline" href={document.fileUrl} target="_blank" rel="noreferrer">{document.documentName}</a><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{formatDate(document.uploadedAt)}</span>{document.fileUrl.startsWith(`/api/properties/${propertyId}/media/`) && <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar ${document.documentName}`} title="Eliminar documento" onClick={() => deleteMedia(document.fileUrl, "document")}><Trash2 className="h-4 w-4" /></Button>}</div></div>
            ))}</div>}
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4 px-5 pb-5 sm:px-6">
          <div className="rounded-lg border bg-muted/20 p-4"><h3 className="font-medium">Atributos propios de esta ficha</h3><p className="text-sm text-muted-foreground">Agrega cualquier dato que no tenga un campo estándar. Estos atributos solo pertenecen a este inmueble.</p></div>
          {fieldRows.length === 0 ? <p className="text-sm text-muted-foreground">Aún no se han definido atributos personalizados.</p> : <div className="space-y-3">{fieldRows.map((field) => (
            <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input aria-label="Nombre del campo personalizado" placeholder="Nombre del campo" value={field.name} onChange={(event) => updateField(field.id, "name", event.target.value)} />
              <Input aria-label="Valor del campo personalizado" placeholder="Valor" value={field.value} onChange={(event) => updateField(field.id, "value", event.target.value)} />
              <Button type="button" size="icon" variant="ghost" aria-label="Quitar campo personalizado" title="Quitar campo" onClick={() => setFieldRows((rows) => rows.filter((row) => row.id !== field.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}</div>}
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={addField}><Plus className="mr-2 h-4 w-4" />Agregar campo</Button><Button type="button" onClick={saveCustomFields} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar campos</Button></div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
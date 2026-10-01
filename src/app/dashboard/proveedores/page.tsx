"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Pencil, Star } from "lucide-react";
import { PROVIDER_TYPES, labelOf } from "@/lib/management";
import { useToast } from "@/hooks/use-toast";

type Provider = {
  id: string;
  companyName: string;
  contactName: string | null;
  type: string;
  taxId: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  specialty: string | null;
  rating: number | null;
  notes: string | null;
  isActive: boolean;
  _count: { tasks: number; maintenancePlans: number; issues: number };
};

const emptyForm = {
  companyName: "",
  contactName: "",
  type: "MAINTENANCE",
  taxId: "",
  phone: "",
  email: "",
  address: "",
  specialty: "",
  rating: "",
  notes: "",
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/providers");
      if (response.ok) setProviders((await response.json()).data);
    } catch {
      console.error("Error loading providers");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/providers")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => {
        if (isCurrent) setProviders(result.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(editingId ? `/api/providers/${editingId}` : "/api/providers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: form.rating ? parseInt(form.rating, 10) : null,
        }),
      });
      if (response.ok) {
        toast({ title: editingId ? "Proveedor actualizado" : "Proveedor creado" });
        setForm(emptyForm);
        setEditingId(null);
        fetchProviders();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo guardar", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const editProvider = (provider: Provider) => {
    setEditingId(provider.id);
    setForm({
      companyName: provider.companyName,
      contactName: provider.contactName || "",
      type: provider.type,
      taxId: provider.taxId || "",
      phone: provider.phone,
      email: provider.email || "",
      address: provider.address || "",
      specialty: provider.specialty || "",
      rating: provider.rating ? String(provider.rating) : "",
      notes: provider.notes || "",
    });
  };

  const deactivate = async (id: string) => {
    if (!confirm("¿Desactivar este proveedor?")) return;
    await fetch(`/api/providers/${id}`, { method: "DELETE" });
    fetchProviders();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proveedores y contratistas</h1>
        <p className="text-muted-foreground mt-1">Directorio de proveedores para mantenimiento y reparaciones</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> {editingId ? "Editar proveedor" : "Nuevo proveedor"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1"><Label htmlFor="p-company">Nombre / Empresa *</Label><Input id="p-company" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="p-contact">Contacto</Label><Input id="p-contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div className="space-y-1">
              <Label htmlFor="p-type">Tipo</Label>
              <select id="p-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PROVIDER_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="p-phone">Teléfono *</Label><Input id="p-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="p-email">Correo</Label><Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="p-tax">RIF / Documento</Label><Input id="p-tax" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="p-specialty">Especialidad</Label><Input id="p-specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Plomería, electricidad..." /></div>
            <div className="space-y-1"><Label htmlFor="p-rating">Calificación (1-5)</Label><Input id="p-rating" type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="p-address">Dirección</Label><Input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1 md:col-span-3"><Label htmlFor="p-notes">Notas</Label><Input id="p-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={isSubmitting}>{editingId ? "Guardar cambios" : "Crear proveedor"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Directorio</CardTitle></CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin proveedores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Proveedor</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Contacto</th>
                    <th className="py-2">Calificación</th>
                    <th className="py-2">Uso</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <tr key={provider.id} className="border-b last:border-0">
                      <td className="py-2">
                        <p className="font-medium">{provider.companyName}</p>
                        <p className="text-xs text-muted-foreground">{provider.contactName || provider.specialty || "-"}</p>
                      </td>
                      <td className="py-2">{labelOf(PROVIDER_TYPES, provider.type)}</td>
                      <td className="py-2">
                        <p>{provider.phone}</p>
                        <p className="text-xs text-muted-foreground">{provider.email || "-"}</p>
                      </td>
                      <td className="py-2">
                        {provider.rating ? (
                          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{provider.rating}</span>
                        ) : "-"}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {provider._count.tasks} tareas · {provider._count.maintenancePlans} planes · {provider._count.issues} averías
                      </td>
                      <td className="py-2">
                        <Badge variant={provider.isActive ? "success" : "secondary"}>{provider.isActive ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label={`Editar ${provider.companyName}`} onClick={() => editProvider(provider)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {provider.isActive && (
                            <Button type="button" size="icon" variant="ghost" aria-label={`Desactivar ${provider.companyName}`} onClick={() => deactivate(provider.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

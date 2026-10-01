"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Plus, Trash2, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ASSET_CONDITIONS, ASSET_STATUSES, labelOf } from "@/lib/management";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";

type Asset = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  condition: string;
  status: string;
  location: string | null;
  purchaseValue: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
};

const emptyForm = {
  name: "",
  category: "",
  brand: "",
  model: "",
  serialNumber: "",
  quantity: "1",
  condition: "GOOD",
  status: "ACTIVE",
  location: "",
  purchaseValue: "",
  currency: "USD",
  notes: "",
};

export function PropertyAssetsPanel({ propertyId }: { propertyId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/assets?propertyId=${propertyId}`);
      if (response.ok) setAssets((await response.json()).data);
    } catch {
      console.error("Error fetching assets");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetch(`/api/assets?propertyId=${propertyId}`)
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => {
        if (isCurrent) setAssets(result.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [propertyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      quantity: parseInt(form.quantity, 10) || 1,
      purchaseValue: form.purchaseValue ? parseFloat(form.purchaseValue) : null,
    };
    try {
      const response = await fetch(editingId ? `/api/assets/${editingId}` : "/api/assets", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? payload : { propertyId, ...payload }),
      });
      if (response.ok) {
        toast({ title: editingId ? "Activo actualizado" : "Activo registrado" });
        setForm(emptyForm);
        setEditingId(null);
        fetchAssets();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "No se pudo guardar").message, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const editAsset = (asset: Asset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      category: asset.category || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      quantity: String(asset.quantity),
      condition: asset.condition,
      status: asset.status,
      location: asset.location || "",
      purchaseValue: asset.purchaseValue ? String(asset.purchaseValue) : "",
      currency: asset.currency,
      notes: asset.notes || "",
    });
  };

  const updateAsset = async (id: string, changes: Partial<Asset>) => {
    await fetch(`/api/assets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    fetchAssets();
  };

  const removeAsset = async (id: string) => {
    if (!confirm("¿Retirar este activo del inventario?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    fetchAssets();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-4 w-4" /> Inventario de activos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
          <div className="space-y-1"><Label htmlFor="asset-name">Nombre *</Label><Input id="asset-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aire acondicionado" /></div>
          <div className="space-y-1"><Label htmlFor="asset-category">Categoría</Label><Input id="asset-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Electrodoméstico" /></div>
          <div className="space-y-1"><Label htmlFor="asset-location">Ubicación</Label><Input id="asset-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sala" /></div>
          <div className="space-y-1"><Label htmlFor="asset-brand">Marca</Label><Input id="asset-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="asset-model">Modelo</Label><Input id="asset-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="asset-serial">Serial</Label><Input id="asset-serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="asset-qty">Cantidad</Label><Input id="asset-qty" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div className="space-y-1">
            <Label htmlFor="asset-condition">Condición</Label>
            <select id="asset-condition" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              {ASSET_CONDITIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label htmlFor="asset-value">Valor de compra</Label><Input id="asset-value" type="number" step="0.01" value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} /></div>
          <div className="space-y-1 md:col-span-3"><Label htmlFor="asset-notes">Notas</Label><Input id="asset-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2 md:col-span-3">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Plus className="mr-1 h-4 w-4" /> {editingId ? "Guardar cambios" : "Agregar activo"}
            </Button>
            {editingId && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin activos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Activo</th>
                  <th className="py-2">Cant.</th>
                  <th className="py-2">Condición</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Registro</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b last:border-0">
                    <td className="py-2">
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{[asset.brand, asset.model, asset.serialNumber].filter(Boolean).join(" · ") || asset.category || "-"}</p>
                    </td>
                    <td className="py-2">{asset.quantity}</td>
                    <td className="py-2">{labelOf(ASSET_CONDITIONS, asset.condition)}</td>
                    <td className="py-2">
                      <select
                        aria-label={`Estado de ${asset.name}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={asset.status}
                        onChange={(e) => updateAsset(asset.id, { status: e.target.value })}
                      >
                        {ASSET_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2">{asset.purchaseValue ? formatCurrency(asset.purchaseValue, asset.currency) : "-"}</td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDate(asset.createdAt)}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label={`Editar ${asset.name}`} onClick={() => editAsset(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar ${asset.name}`} onClick={() => removeAsset(asset.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
  );
}

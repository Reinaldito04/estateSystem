"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RECURRENCE_OPTIONS, TASK_CATEGORIES, TASK_STATUSES, labelOf } from "@/lib/management";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  dueDate: string;
  planId: string | null;
  property: { code: string; title: string } | null;
};

type Plan = {
  id: string;
  title: string;
  category: string;
  frequency: string;
  intervalCount: number;
  nextDueDate: string;
  isActive: boolean;
  asset: { id: string; name: string } | null;
  provider: { id: string; companyName: string } | null;
  _count: { tasks: number };
};

const emptyForm = {
  title: "",
  description: "",
  category: "MAINTENANCE",
  frequency: "MONTHLY",
  intervalCount: "1",
  nextDueDate: "",
  assetId: "",
  providerId: "",
};

export function PropertyMaintenancePanel({ propertyId }: { propertyId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [providers, setProviders] = useState<{ id: string; companyName: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [plansResponse, tasksResponse, assetsResponse, providersResponse] = await Promise.all([
        fetch(`/api/maintenance-plans?propertyId=${propertyId}`),
        fetch(`/api/tasks?propertyId=${propertyId}`),
        fetch(`/api/assets?propertyId=${propertyId}`),
        fetch("/api/providers?active=true"),
      ]);
      if (plansResponse.ok) setPlans((await plansResponse.json()).data);
      if (tasksResponse.ok) setTasks((await tasksResponse.json()).data);
      if (assetsResponse.ok) setAssets((await assetsResponse.json()).data);
      if (providersResponse.ok) setProviders((await providersResponse.json()).data);
    } catch {
      console.error("Error loading maintenance data");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      fetch(`/api/maintenance-plans?propertyId=${propertyId}`).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`/api/tasks?propertyId=${propertyId}`).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`/api/assets?propertyId=${propertyId}`).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/providers?active=true").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([plansResult, tasksResult, assetsResult, providersResult]) => {
        if (!isCurrent) return;
        setPlans(plansResult.data ?? []);
        setTasks(tasksResult.data ?? []);
        setAssets(assetsResult.data ?? []);
        setProviders(providersResult.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [propertyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nextDueDate) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/maintenance-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propertyId,
          intervalCount: parseInt(form.intervalCount, 10) || 1,
          assetId: form.assetId || null,
          providerId: form.providerId || null,
        }),
      });
      if (response.ok) {
        toast({ title: "Plan creado", description: "Se programó el mantenimiento y su primera tarea" });
        setForm(emptyForm);
        fetchData();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo crear el plan", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    toast({ title: "Tarea completada", description: "Se programó el siguiente mantenimiento si aplica" });
    fetchData();
  };

  const pendingTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" /> Mantenimiento preventivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2"><Label htmlFor="plan-title">Título *</Label><Input id="plan-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Revisión de aire acondicionado" /></div>
          <div className="space-y-1">
            <Label htmlFor="plan-category">Categoría</Label>
            <select id="plan-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {TASK_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-frequency">Frecuencia</Label>
            <select id="plan-frequency" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {RECURRENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label htmlFor="plan-interval">Cada (intervalo)</Label><Input id="plan-interval" type="number" min="1" value={form.intervalCount} onChange={(e) => setForm({ ...form, intervalCount: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="plan-date">Próxima fecha *</Label><Input id="plan-date" type="date" required value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} /></div>
          <div className="space-y-1">
            <Label htmlFor="plan-asset">Activo (opcional)</Label>
            <select id="plan-asset" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
              <option value="">Sin activo</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-provider">Proveedor (opcional)</Label>
            <select id="plan-provider" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
              <option value="">Sin proveedor</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.companyName}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2"><Label htmlFor="plan-description">Descripción</Label><Input id="plan-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="md:col-span-3">
            <Button type="submit" size="sm" disabled={isSubmitting}><Plus className="mr-1 h-4 w-4" /> Crear plan</Button>
          </div>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Tareas pendientes del inmueble</h3>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tareas pendientes.</p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{labelOf(TASK_CATEGORIES, task.category)} · vence {formatDate(task.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{labelOf(TASK_STATUSES, task.status)}</Badge>
                    <Button type="button" size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Completar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Planes de mantenimiento</h3>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin planes registrados.</p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{plan.title} {plan.isActive ? "" : "(inactivo)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(RECURRENCE_OPTIONS, plan.frequency)}
                      {plan.intervalCount > 1 ? ` x${plan.intervalCount}` : ""} · próxima {formatDate(plan.nextDueDate)}
                      {plan.asset ? ` · ${plan.asset.name}` : ""}
                      {plan.provider ? ` · ${plan.provider.companyName}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{plan._count.tasks} tareas</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarPlus, Loader2, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  RECURRENCE_OPTIONS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  labelOf,
} from "@/lib/management";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEvent } from "@/components/calendar/calendar-view";

const CalendarView = dynamic(
  () => import("@/components/calendar/calendar-view").then((mod) => mod.CalendarView),
  { ssr: false, loading: () => <p className="py-10 text-center text-sm text-muted-foreground">Cargando calendario…</p> },
);

type Option = { id: string; label: string; kind: "property" | "client" | "lease" | "provider" };

const emptyForm = {
  title: "",
  description: "",
  category: "REVIEW",
  priority: "MEDIUM",
  status: "PENDING",
  dueDate: "",
  allDay: true,
  recurrence: "ONCE",
  entity: "",
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { toast } = useToast();

  const fetchEvents = async (from: string, to: string) => {
    try {
      const response = await fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (response.ok) setEvents((await response.json()).data);
    } catch {
      console.error("Error loading calendar events");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      fetch("/api/properties?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/clients?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/leases?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/providers?active=true").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([properties, clients, leases, providers]) => {
        if (!isCurrent) return;
        const result: Option[] = [];
        for (const item of properties.data ?? []) result.push({ id: item.id, label: `${item.code} · ${item.title}`, kind: "property" });
        for (const item of clients.data ?? []) result.push({ id: item.id, label: `Cliente: ${item.fullName}`, kind: "client" });
        for (const item of leases.data ?? []) result.push({ id: item.id, label: `Contrato: ${item.contractNumber}`, kind: "lease" });
        for (const item of providers.data ?? []) result.push({ id: item.id, label: `Proveedor: ${item.companyName}`, kind: "provider" });
        setOptions(result);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleRangeChange = (from: string, to: string) => {
    setRange({ from, to });
    fetchEvents(from, to);
  };

  const openCreate = (date?: string) => {
    const today = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setForm({ ...emptyForm, dueDate: today });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.dueDate) return;
    setIsSubmitting(true);
    const [kind, id] = form.entity ? (form.entity.split(":") as [Option["kind"], string]) : [undefined, undefined];
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          category: form.category,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate,
          allDay: form.allDay,
          recurrence: form.recurrence,
          ...(kind === "property" && { propertyId: id }),
          ...(kind === "client" && { clientId: id }),
          ...(kind === "lease" && { leaseId: id }),
          ...(kind === "provider" && { providerId: id }),
        }),
      });
      if (response.ok) {
        toast({ title: "Tarea creada", description: "La tarea quedó agendada en el calendario" });
        setIsDialogOpen(false);
        setForm(emptyForm);
        if (range) fetchEvents(range.from, range.to);
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo crear la tarea", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSelectedTask = async () => {
    if (!selectedEvent) return;
    const entityId = selectedEvent.extendedProps.entityId as string | undefined;
    if (!entityId) return;
    await fetch(`/api/tasks/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    toast({ title: "Tarea completada", description: "La tarea se marcó como completada" });
    setSelectedEvent(null);
    if (range) fetchEvents(range.from, range.to);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground mt-1">Tareas de revisión y mantenimiento para inmuebles, clientes, contratos y proveedores</p>
        </div>
        <Button onClick={() => openCreate()}>
          <CalendarPlus className="mr-2 h-4 w-4" /> Nueva tarea
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Agenda general</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Haz clic en un día para crear una tarea o en un evento para ver su detalle</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {[
              { label: "Tareas", color: "#2563eb" },
              { label: "Reservas", color: "#7c3aed" },
              { label: "Visitas", color: "#0891b2" },
              { label: "Vencimientos", color: "#d97706" },
              { label: "Averías", color: "#dc2626" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="calendar-shell pt-1">
            <CalendarView
              events={events}
              onRangeChange={handleRangeChange}
              onDateClick={(date) => openCreate(date)}
              onEventClick={setSelectedEvent}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-title">Título *</Label>
                <Input id="task-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Revisión trimestral" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-category">Categoría</Label>
                <select id="task-category" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {TASK_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridad</Label>
                <select id="task-priority" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {TASK_PRIORITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-date">Fecha *</Label>
                <Input id="task-date" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-recurrence">Recurrencia</Label>
                <select id="task-recurrence" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                  {RECURRENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-entity">Relacionado con</Label>
                <select id="task-entity" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })}>
                  <option value="">General (sin entidad)</option>
                  {options.map((option) => <option key={`${option.kind}:${option.id}`} value={`${option.kind}:${option.id}`}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-description">Descripción</Label>
                <Input id="task-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear tarea
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Tipo:</span> {String(selectedEvent.extendedProps.type)}</p>
              <p><span className="text-muted-foreground">Fecha:</span> {formatDate(selectedEvent.start)}</p>
              {selectedEvent.extendedProps.status ? (
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Estado:</span> <Badge variant="outline">{labelOf(TASK_STATUSES, String(selectedEvent.extendedProps.status))}</Badge></div>
              ) : null}
              {selectedEvent.extendedProps.property ? (
                <p><span className="text-muted-foreground">Inmueble:</span> {(selectedEvent.extendedProps.property as { code: string }).code}</p>
              ) : null}
            </div>
          )}
          <DialogFooter>
            {selectedEvent?.extendedProps.type === "task" && selectedEvent.extendedProps.status !== "DONE" && (
              <Button onClick={completeSelectedTask}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar completada
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RESERVATION_STATUSES, RESERVATION_TYPES, labelOf } from "@/lib/management";
import { useToast } from "@/hooks/use-toast";

type Reservation = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  client: { id: string; fullName: string } | null;
};

const emptyForm = {
  type: "VISIT",
  status: "PENDING",
  startDate: "",
  endDate: "",
  clientId: "",
  notes: "",
};

export function PropertyReservationsPanel({ propertyId }: { propertyId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<{ id: string; fullName: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [reservationsResponse, clientsResponse] = await Promise.all([
        fetch(`/api/reservations?propertyId=${propertyId}`),
        fetch("/api/clients?limit=100"),
      ]);
      if (reservationsResponse.ok) setReservations((await reservationsResponse.json()).data);
      if (clientsResponse.ok) setClients((await clientsResponse.json()).data);
    } catch {
      console.error("Error loading reservations");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      fetch(`/api/reservations?propertyId=${propertyId}`).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/clients?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([reservationsResult, clientsResult]) => {
        if (!isCurrent) return;
        setReservations(reservationsResult.data ?? []);
        setClients(clientsResult.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [propertyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propertyId,
          clientId: form.clientId || null,
        }),
      });
      if (response.ok) {
        toast({ title: "Reserva creada", description: "El rango quedó apartado para el inmueble" });
        setForm(emptyForm);
        fetchData();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "No se pudo crear la reserva", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelReservation = async (id: string) => {
    await fetch(`/api/reservations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    fetchData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" /> Disponibilidad y reservas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="res-type">Tipo</Label>
            <select id="res-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {RESERVATION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label htmlFor="res-start">Desde *</Label><Input id="res-start" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="res-end">Hasta *</Label><Input id="res-end" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="space-y-1">
            <Label htmlFor="res-client">Cliente (opcional)</Label>
            <select id="res-client" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Sin cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.fullName}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2"><Label htmlFor="res-notes">Notas</Label><Input id="res-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="md:col-span-3">
            <Button type="submit" size="sm" disabled={isSubmitting}><Plus className="mr-1 h-4 w-4" /> Reservar fechas</Button>
          </div>
        </form>

        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reservas registradas.</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {labelOf(RESERVATION_TYPES, reservation.type)} · {formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reservation.client?.fullName || "Sin cliente"}{reservation.notes ? ` · ${reservation.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={reservation.status === "CONFIRMED" ? "success" : reservation.status === "CANCELLED" ? "destructive" : "outline"}>
                    {labelOf(RESERVATION_STATUSES, reservation.status)}
                  </Badge>
                  {reservation.status !== "CANCELLED" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => cancelReservation(reservation.id)}>
                      <XCircle className="mr-1 h-4 w-4" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

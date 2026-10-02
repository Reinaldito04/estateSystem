"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  KeyRound,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Users,
  Wallet,
  Wrench,
  Target,
  History,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, PAYMENT_CATEGORIES } from "@/lib/utils";
import { PropertyCrmPanel } from "@/components/properties/property-crm-panel";
import { PropertyLocationMap, PropertyPhotoGallery } from "@/components/properties/property-visuals";
import { PropertyAssetsPanel } from "@/components/properties/property-assets-panel";
import { PropertyMaintenancePanel } from "@/components/properties/property-maintenance-panel";
import { PropertyReservationsPanel } from "@/components/properties/property-reservations-panel";
import { PropertyTagsEditor } from "@/components/properties/property-tags-editor";
import { PropertyAuditTimeline } from "@/components/properties/property-audit-timeline";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  reserved: "Reservado",
  rented: "Alquilado",
  occupied: "Ocupado",
  sold: "Vendido",
  maintenance: "En mantenimiento",
  suspended: "Suspendido",
  unavailable: "No disponible",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  TOWNHOUSE: "Townhouse",
  OFFICE: "Oficina",
  COMMERCIAL: "Local comercial",
  LAND: "Terreno",
};

const TAB_KEYS = ["resumen", "relaciones", "finanzas", "incidencias", "operacion", "crm", "auditoria"] as const;
type TabKey = (typeof TAB_KEYS)[number];

interface Property {
  id: string;
  code: string;
  title: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  propertyType: string;
  totalAreaSqm: number | null;
  builtAreaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  amenities: string[];
  captureCommission: string | null;
  captureExclusive: boolean;
  captureContractUrl: string | null;
  videoUrl: string | null;
  floorPlanUrl: string | null;
  virtualTourUrl: string | null;
  status: string;
  condoName: string | null;
  condoAccountNumber: string | null;
  condoAdministration: string | null;
  condoFeeAmount: string | null;
  condoContact: string | null;
  tags: { id: string; name: string; color: string }[];
  electricityAccountNumber: string | null;
  electricityProvider: string | null;
  electricityMeterNumber: string | null;
  electricityTariff: string | null;
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
      balance: {
        rentDue: number;
        paidRent: number;
        debtAmount: number;
        overdueInstallments: number;
        debtDays: number;
      };
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
  keys: { id: string; holderName: string; holderRole: string; keyCount: number; accessCode: string | null; notes: string | null; assignedAt: string; returnedAt: string | null; isActive: boolean }[];
  visits: { id: string; visitorName: string; visitorPhone: string | null; visitorEmail: string | null; purpose: string | null; scheduledAt: string; visitedAt: string | null; status: string; notes: string | null }[];
  _count: { leases: number; transactions: number; issues: number };
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [keyForm, setKeyForm] = useState({ holderName: "", holderRole: "Equipo", keyCount: "1", accessCode: "", notes: "" });
  const [visitForm, setVisitForm] = useState({ visitorName: "", visitorPhone: "", visitorEmail: "", purpose: "", scheduledAt: "", notes: "" });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && TAB_KEYS.includes(tab as TabKey)) {
      setActiveTab(tab as TabKey);
    }
  }, []);

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setActiveTab(tab);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("tab", tab);
    window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  };

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

  const createKeyRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;
    setIsSavingRecord(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/keys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...keyForm, keyCount: parseInt(keyForm.keyCount, 10) || 1 }) });
      if (!response.ok) throw new Error("No se pudo registrar la llave");
      const key = await response.json();
      setProperty({ ...property, keys: [key, ...property.keys] });
      setKeyForm({ holderName: "", holderRole: "Equipo", keyCount: "1", accessCode: "", notes: "" });
      toast({ title: "Llaves registradas", description: "La asignación quedó guardada en la bitácora." });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo registrar la llave", variant: "destructive" });
    } finally { setIsSavingRecord(false); }
  };

  const returnKeyRecord = async (keyId: string) => {
    if (!property) return;
    const response = await fetch(`/api/properties/${property.id}/keys/${keyId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnedAt: new Date().toISOString(), isActive: false }) });
    if (response.ok) setProperty({ ...property, keys: property.keys.map((key) => key.id === keyId ? { ...key, returnedAt: new Date().toISOString(), isActive: false } : key) });
  };

  const createVisitRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;
    setIsSavingRecord(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/visits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(visitForm) });
      if (!response.ok) throw new Error("No se pudo registrar la visita");
      const visit = await response.json();
      setProperty({ ...property, visits: [visit, ...property.visits] });
      setVisitForm({ visitorName: "", visitorPhone: "", visitorEmail: "", purpose: "", scheduledAt: "", notes: "" });
      toast({ title: "Visita registrada", description: "La visita quedó añadida a la bitácora." });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo registrar la visita", variant: "destructive" });
    } finally { setIsSavingRecord(false); }
  };

  const updateVisitStatus = async (visitId: string, status: string) => {
    if (!property) return;
    const response = await fetch(`/api/properties/${property.id}/visits/${visitId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(status === "completed" ? { visitedAt: new Date().toISOString() } : {}) }) });
    if (response.ok) setProperty({ ...property, visits: property.visits.map((visit) => visit.id === visitId ? { ...visit, status, visitedAt: status === "completed" ? new Date().toISOString() : visit.visitedAt } : visit) });
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
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
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
        <Button asChild variant="outline" size="icon" className="mt-1 shrink-0 rounded-full">
          <Link href="/dashboard/inmuebles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">{property.code}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{property.title}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{property.address}, {property.city}</span></p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded-full border bg-background px-2.5 py-1">{PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}</span>
            {property.totalAreaSqm && <span className="rounded-full border bg-background px-2.5 py-1">{property.totalAreaSqm} m² totales</span>}
            {property.bedrooms !== null && <span className="rounded-full border bg-background px-2.5 py-1">{property.bedrooms} habitaciones</span>}
            {property.bathrooms !== null && <span className="rounded-full border bg-background px-2.5 py-1">{property.bathrooms} baños</span>}
          </div>
        </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant={property.status === "available" ? "success" : "secondary"} className="px-3 py-1.5 text-sm">
            {PROPERTY_STATUS_LABELS[property.status] || property.status}
          </Badge>
          <Button asChild variant="outline" size="sm"><Link href={`/dashboard/transacciones?propertyId=${property.id}`}>Transacciones</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/contratos">Contratos</Link></Button>
        </div>
      </header>

      <section aria-labelledby="property-summary-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resumen ejecutivo</p><h2 id="property-summary-heading" className="mt-1 text-lg font-semibold">Estado actual del inmueble</h2></div>
          <p className="hidden text-xs text-muted-foreground sm:block">Actualizado recientemente</p>
        </div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-4">
          <div className="border-b p-4 sm:border-b-0 sm:border-r sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Propietario</dt><dd className="mt-2 truncate font-medium">{property.owner.fullName}</dd></div>
          <div className="border-b p-4 sm:border-b-0 sm:border-r sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contratos</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.leases}</dd></div>
          <div className="border-r p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transacciones</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.transactions}</dd></div>
          <div className="p-4 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Averías</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{property._count.issues}</dd></div>
        </dl>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max justify-start gap-1 rounded-lg border bg-muted/60 p-1">
            <TabsTrigger value="resumen" className="gap-2"><LayoutDashboard className="h-4 w-4" />Resumen</TabsTrigger>
            <TabsTrigger value="relaciones" className="gap-2"><Users className="h-4 w-4" />Relaciones</TabsTrigger>
            <TabsTrigger value="finanzas" className="gap-2"><Wallet className="h-4 w-4" />Finanzas <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{property._count.leases}</Badge></TabsTrigger>
            <TabsTrigger value="incidencias" className="gap-2"><Wrench className="h-4 w-4" />Incidencias <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{property._count.issues}</Badge></TabsTrigger>
            <TabsTrigger value="operacion" className="gap-2"><KeyRound className="h-4 w-4" />Operación</TabsTrigger>
            <TabsTrigger value="crm" className="gap-2"><Target className="h-4 w-4" />CRM</TabsTrigger>
            <TabsTrigger value="auditoria" className="gap-2"><History className="h-4 w-4" />Auditoría</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumen" className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
            <PropertyPhotoGallery title={property.title} photos={property.photos} />
            {property.latitude !== null && property.longitude !== null ? (
              <PropertyLocationMap
                title={property.title}
                latitude={property.latitude}
                longitude={property.longitude}
                address={property.address}
                city={property.city}
              />
            ) : (
              <section className="flex min-h-72 flex-col overflow-hidden rounded-lg border bg-card sm:min-h-80">
                <div className="flex items-center gap-2.5 border-b px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground"><MapPin className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold">Ubicación</h2><p className="text-xs text-muted-foreground">{property.city}</p></div></div>
                <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-muted/40 px-6 text-center"><MapPin className="h-7 w-7 text-muted-foreground" /><p className="font-medium">Ubicación no marcada</p><p className="text-sm text-muted-foreground">Añade el punto desde el formulario del inmueble.</p></div>
                <div className="border-t px-4 py-3 text-sm font-medium">{property.address}</div>
              </section>
            )}
          </section>

          {(property.videoUrl || property.floorPlanUrl || property.virtualTourUrl) && <Card>
            <CardHeader><CardTitle>Material multimedia</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {property.videoUrl && <a href={property.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:border-primary/50 hover:bg-muted/40"><ExternalLink className="h-4 w-4 text-primary" />Video del inmueble</a>}
              {property.floorPlanUrl && <a href={property.floorPlanUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:border-primary/50 hover:bg-muted/40"><ExternalLink className="h-4 w-4 text-primary" />Ver plano</a>}
              {property.virtualTourUrl && <a href={property.virtualTourUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:border-primary/50 hover:bg-muted/40"><ExternalLink className="h-4 w-4 text-primary" />Recorrido virtual</a>}
            </CardContent>
          </Card>}

          <section aria-labelledby="property-profile-heading" className="space-y-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Perfil del inmueble</p><h2 id="property-profile-heading" className="mt-1 text-lg font-semibold">Ficha técnica y condiciones</h2></div>
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <Card>
                <CardHeader><CardTitle className="text-base">Ficha técnica</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                    <div><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Tipo</dt><dd className="mt-1 font-medium">{PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType || "No definido"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Área total</dt><dd className="mt-1 font-medium">{property.totalAreaSqm ? `${property.totalAreaSqm} m²` : "No definida"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Construida</dt><dd className="mt-1 font-medium">{property.builtAreaSqm ? `${property.builtAreaSqm} m²` : "No definida"}</dd></div>
                    <div><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Distribución</dt><dd className="mt-1 font-medium">{property.bedrooms ?? "-"} hab. · {property.bathrooms ?? "-"} baños</dd></div>
                    <div><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Estacionamientos</dt><dd className="mt-1 font-medium">{property.parkingSpaces ?? "No definido"}</dd></div>
                    <div className="col-span-2 sm:col-span-3"><dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Amenidades</dt><dd className="mt-1 flex flex-wrap gap-1.5">{property.amenities.length > 0 ? property.amenities.map((amenity) => <Badge key={amenity} variant="secondary">{amenity}</Badge>) : <span className="font-medium">No registradas</span>}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Captación</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><p className="text-sm text-muted-foreground">Comisión acordada</p><p className="mt-1 text-2xl font-semibold">{property.captureCommission ? `${property.captureCommission}%` : "No definida"}</p></div>
                  <div><p className="text-sm text-muted-foreground">Modalidad</p><p className="mt-1 font-medium">{property.captureExclusive ? "Exclusiva" : "No exclusiva"}</p></div>
                  {property.captureContractUrl && <a href={property.captureContractUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ExternalLink className="h-4 w-4" />Ver contrato de captación</a>}
                </CardContent>
              </Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="relaciones" className="space-y-5">
          <section aria-labelledby="property-contacts-heading" className="space-y-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Relaciones</p><h2 id="property-contacts-heading" className="mt-1 text-lg font-semibold">Servicios y propietario</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos de servicios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(property.condoName || property.condoAccountNumber || property.condoAdministration || property.condoFeeAmount || property.condoContact) && (
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Condominio</p>
                        <p className="font-medium">{property.condoName || "Sin nombre"}</p>
                        {property.condoAccountNumber && <p className="text-sm text-muted-foreground">Cta: {property.condoAccountNumber}</p>}
                        {property.condoAdministration && <p className="text-sm text-muted-foreground">Administradora: {property.condoAdministration}</p>}
                        {property.condoFeeAmount && <p className="text-sm text-muted-foreground">Cuota: {formatCurrency(property.condoFeeAmount)}</p>}
                        {property.condoContact && <p className="text-sm text-muted-foreground">Contacto: {property.condoContact}</p>}
                      </div>
                    </div>
                  )}
                  {(property.electricityAccountNumber || property.electricityProvider || property.electricityMeterNumber || property.electricityTariff) && (
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Electricidad</p>
                        <p className="font-medium">{property.electricityAccountNumber || "Sin cuenta"}</p>
                        {property.electricityProvider && <p className="text-sm text-muted-foreground">Empresa: {property.electricityProvider}</p>}
                        {property.electricityMeterNumber && <p className="text-sm text-muted-foreground">Medidor: {property.electricityMeterNumber}</p>}
                        {property.electricityTariff && <p className="text-sm text-muted-foreground">Tarifa: {property.electricityTariff}</p>}
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
                  <CardTitle className="text-base">Propietario</CardTitle>
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
          </section>

          <PropertyTagsEditor propertyId={property.id} initialTags={property.tags ?? []} />
        </TabsContent>

        <TabsContent value="finanzas" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratos del inmueble</CardTitle>
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
                        <TableHead>Deuda</TableHead>
                        <TableHead>Días con deuda</TableHead>
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
                          <TableCell>
                            <span className={lease.balance.debtAmount > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
                              {formatCurrency(lease.balance.debtAmount)}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {lease.balance.overdueInstallments} cuota{lease.balance.overdueInstallments === 1 ? "" : "s"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={lease.balance.debtDays > 0 ? "font-semibold text-red-600" : "text-emerald-600"}>
                              {lease.balance.debtDays}
                            </span>
                          </TableCell>
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
              <CardTitle className="text-base">Últimas transacciones</CardTitle>
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
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Averías del inmueble</CardTitle>
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

          <PropertyMaintenancePanel propertyId={property.id} />
        </TabsContent>

        <TabsContent value="operacion" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Expediente digital</CardTitle></CardHeader>
              <CardContent>
                {property.documents.length === 0 ? <p className="text-sm text-muted-foreground">No hay documentos cargados. Puedes añadirlos desde Documentos vinculándolos a este inmueble.</p> : <div className="space-y-2">{property.documents.map((document) => <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-muted/40"><span className="min-w-0 truncate text-sm font-medium">{document.documentName}</span><span className="shrink-0 text-xs text-muted-foreground">{formatDate(document.uploadedAt)}</span></a>)}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Control de llaves</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={createKeyRecord} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.5fr_auto]">
                  <Input required placeholder="Responsable" value={keyForm.holderName} onChange={(event) => setKeyForm({ ...keyForm, holderName: event.target.value })} aria-label="Responsable de las llaves" />
                  <Input required placeholder="Rol" value={keyForm.holderRole} onChange={(event) => setKeyForm({ ...keyForm, holderRole: event.target.value })} aria-label="Rol del responsable" />
                  <Input required type="number" min="1" placeholder="Cant." value={keyForm.keyCount} onChange={(event) => setKeyForm({ ...keyForm, keyCount: event.target.value })} aria-label="Cantidad de llaves" />
                  <Button type="submit" disabled={isSavingRecord} size="icon" aria-label="Registrar llaves" title="Registrar llaves"><KeyRound className="h-4 w-4" /></Button>
                </form>
                {property.keys.length === 0 ? <p className="text-sm text-muted-foreground">No hay asignaciones registradas.</p> : <div className="space-y-2">{property.keys.slice(0, 5).map((key) => <div key={key.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"><div><p className="text-sm font-medium">{key.holderName} <span className="font-normal text-muted-foreground">· {key.holderRole}</span></p><p className="text-xs text-muted-foreground">{key.keyCount} llave{key.keyCount === 1 ? "" : "s"} · {key.isActive ? "En posesión" : `Devuelta ${formatDate(key.returnedAt || key.assignedAt)}`}</p></div>{key.isActive && <Button type="button" size="sm" variant="outline" onClick={() => returnKeyRecord(key.id)}>Marcar devolución</Button>}</div>)}</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Bitácora de visitas</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={createVisitRecord} className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1"><Label htmlFor="visitorName">Visitante *</Label><Input id="visitorName" required value={visitForm.visitorName} onChange={(event) => setVisitForm({ ...visitForm, visitorName: event.target.value })} placeholder="Nombre completo" /></div>
                <div className="space-y-1"><Label htmlFor="visitorPhone">Teléfono</Label><Input id="visitorPhone" value={visitForm.visitorPhone} onChange={(event) => setVisitForm({ ...visitForm, visitorPhone: event.target.value })} placeholder="+58..." /></div>
                <div className="space-y-1"><Label htmlFor="visitPurpose">Motivo</Label><Input id="visitPurpose" value={visitForm.purpose} onChange={(event) => setVisitForm({ ...visitForm, purpose: event.target.value })} placeholder="Inspección, muestra..." /></div>
                <div className="space-y-1"><Label htmlFor="scheduledAt">Fecha y hora *</Label><Input id="scheduledAt" required type="datetime-local" value={visitForm.scheduledAt} onChange={(event) => setVisitForm({ ...visitForm, scheduledAt: event.target.value })} /></div>
                <Button type="submit" disabled={isSavingRecord} className="self-end"><CalendarDays className="mr-2 h-4 w-4" />Agendar visita</Button>
              </form>
              {property.visits.length === 0 ? <div className="flex items-center gap-3 border-t pt-4 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4" />No hay visitas en la bitácora.</div> : <div className="overflow-x-auto border-t pt-4"><Table><TableHeader><TableRow><TableHead>Visitante</TableHead><TableHead>Fecha programada</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{property.visits.map((visit) => <TableRow key={visit.id}><TableCell><p className="font-medium">{visit.visitorName}</p>{visit.visitorPhone && <p className="text-xs text-muted-foreground">{visit.visitorPhone}</p>}</TableCell><TableCell>{formatDateTime(visit.scheduledAt)}</TableCell><TableCell>{visit.purpose || "-"}</TableCell><TableCell><Badge variant={visit.status === "completed" ? "success" : visit.status === "cancelled" ? "destructive" : "secondary"}>{visit.status === "scheduled" ? "Programada" : visit.status === "completed" ? "Realizada" : visit.status === "cancelled" ? "Cancelada" : "No asistió"}</Badge></TableCell><TableCell className="text-right">{visit.status === "scheduled" && <Select value={visit.status} onValueChange={(value) => updateVisitStatus(visit.id, value)}><SelectTrigger className="ml-auto w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Realizada</SelectItem><SelectItem value="cancelled">Cancelada</SelectItem><SelectItem value="no_show">No asistió</SelectItem></SelectContent></Select>}</TableCell></TableRow>)}</TableBody></Table></div>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <PropertyAssetsPanel propertyId={property.id} />
            <PropertyReservationsPanel propertyId={property.id} />
          </div>
        </TabsContent>

        <TabsContent value="crm" className="space-y-5">
          <PropertyCrmPanel propertyId={property.id} />
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-5">
          <PropertyAuditTimeline propertyId={property.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

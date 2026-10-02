"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Building2,
  Home,
  MapPin,
  Grid2X2,
  List,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FieldError } from "@/components/ui/field-error";
import { LocationPicker } from "@/components/properties/location-picker";
import { PropertyPortfolioMap, type PropertyMapPoint } from "@/components/properties/property-visuals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiError } from "@/lib/api-error";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/skeletons";

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
  customFields: Record<string, string>;
  status: string;
  owner: { id: string; fullName: string; phone: string };
  photos: { id: string; photoUrl: string; description: string | null }[];
  tags?: { id: string; name: string; color: string }[];
  createdAt: string;
  _count: { leases: number; transactions: number; issues: number };
}

interface Owner {
  id: string;
  fullName: string;
}

interface CustomFieldDraft {
  id: string;
  name: string;
  value: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Reservado" },
  { value: "rented", label: "Alquilado" },
  { value: "sold", label: "Vendido" },
  { value: "maintenance", label: "En Mantenimiento" },
  { value: "suspended", label: "Suspendido" },
];

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "OFFICE", label: "Oficina" },
  { value: "COMMERCIAL", label: "Local comercial" },
  { value: "LAND", label: "Terreno" },
];

const PROPERTY_FORM_STEPS = [
  { title: "Identidad y ubicación", description: "Datos básicos y localización" },
  { title: "Ficha técnica", description: "Distribución, estado y servicios" },
  { title: "Captación y material", description: "Condiciones y enlaces comerciales" },
];

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minCanon, setMinCanon] = useState("");
  const [maxCanon, setMaxCanon] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocationMapOpen, setIsLocationMapOpen] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locations, setLocations] = useState<PropertyMapPoint[]>([]);
  const [totalPropertiesForMap, setTotalPropertiesForMap] = useState(0);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    ownerId: "",
    title: "",
    address: "",
    city: "",
    latitude: null as number | null,
    longitude: null as number | null,
    propertyType: "APARTMENT",
    totalAreaSqm: "",
    builtAreaSqm: "",
    bedrooms: "",
    bathrooms: "",
    parkingSpaces: "",
    amenities: "",
    condoName: "",
    condoAccountNumber: "",
    condoAdministration: "",
    condoFeeAmount: "",
    condoContact: "",
    electricityAccountNumber: "",
    electricityProvider: "",
    electricityMeterNumber: "",
    electricityTariff: "",
    internetProvider: "",
    internetAccountNumber: "",
    captureCommission: "",
    captureExclusive: false,
    captureContractUrl: "",
    videoUrl: "",
    floorPlanUrl: "",
    virtualTourUrl: "",
    status: "available",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [creationStep, setCreationStep] = useState(0);
  const [customFieldDrafts, setCustomFieldDrafts] = useState<CustomFieldDraft[]>([]);
  const { toast } = useToast();

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(ownerFilter && { ownerId: ownerFilter }),
        ...(tagFilter && { tagId: tagFilter }),
        ...(typeFilter && { propertyType: typeFilter }),
        ...(minCanon && { minCanon }),
        ...(maxCanon && { maxCanon }),
      });
      const response = await fetch(`/api/properties?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar inmuebles", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/owners?limit=100");
      if (response.ok) {
        const data = await response.json();
        setOwners(data.data);
      }
    } catch {
      console.error("Error fetching owners");
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [pagination.page, search, statusFilter, ownerFilter, tagFilter, typeFilter, minCanon, maxCanon]);

  useEffect(() => {
    fetchOwners();
    fetch("/api/tags")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => setTags(result.data ?? []))
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    if (!isLocationMapOpen) return;
    let isCurrent = true;
    setIsLoadingLocations(true);

    fetch("/api/properties/locations")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(getApiError(result, "Error al cargar ubicaciones").message);
        return result as { data: PropertyMapPoint[]; totalProperties: number };
      })
      .then((result) => {
        if (!isCurrent) return;
        setLocations(result.data);
        setTotalPropertiesForMap(result.totalProperties);
      })
      .catch((error) => {
        if (isCurrent) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "No se pudieron cargar las ubicaciones",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingLocations(false);
      });

    return () => { isCurrent = false; };
  }, [isLocationMapOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customFieldNames = customFieldDrafts
      .filter((field) => field.name.trim())
      .map((field) => field.name.trim().toLowerCase());
    if (new Set(customFieldNames).size !== customFieldNames.length) {
      toast({ title: "Campos repetidos", description: "Cada campo debe tener un nombre único", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const url = editingProperty ? `/api/properties/${editingProperty.id}` : "/api/properties";
      const method = editingProperty ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          totalAreaSqm: formData.totalAreaSqm ? parseFloat(formData.totalAreaSqm) : null,
          builtAreaSqm: formData.builtAreaSqm ? parseFloat(formData.builtAreaSqm) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms, 10) : null,
          parkingSpaces: formData.parkingSpaces ? parseInt(formData.parkingSpaces, 10) : null,
          amenities: formData.amenities.split(",").map((amenity) => amenity.trim()).filter(Boolean),
          captureCommission: formData.captureCommission ? parseFloat(formData.captureCommission) : null,
          condoFeeAmount: formData.condoFeeAmount ? parseFloat(formData.condoFeeAmount) : null,
          customFields: Object.fromEntries(
            customFieldDrafts
              .filter((field) => field.name.trim())
              .map((field) => [field.name.trim(), field.value])
          ),
        }),
      });
      if (response.ok) {
        const savedProperty = await response.json();
        toast({
          title: editingProperty ? "Actualizado" : "Creado",
          description: `Inmueble ${editingProperty ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        if (editingProperty) fetchProperties();
        else router.push(`/dashboard/inmuebles/${savedProperty.id}`);
      } else {
        const error = await response.json();
        const parsed = getApiError(error, "Error al guardar");
        setFieldErrors(parsed.fields);
        toast({ title: "Error", description: parsed.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    const p = property as unknown as Record<string, unknown>;
    setFormData({
      code: property.code,
      ownerId: property.owner.id,
      title: property.title,
      address: property.address,
      city: property.city,
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      propertyType: property.propertyType || "APARTMENT",
      totalAreaSqm: property.totalAreaSqm?.toString() || "",
      builtAreaSqm: property.builtAreaSqm?.toString() || "",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      parkingSpaces: property.parkingSpaces?.toString() || "",
      amenities: (property.amenities || []).join(", "),
      condoName: (p.condoName as string) || "",
      condoAccountNumber: (p.condoAccountNumber as string) || "",
      condoAdministration: (p.condoAdministration as string) || "",
      condoFeeAmount: p.condoFeeAmount ? String(p.condoFeeAmount) : "",
      condoContact: (p.condoContact as string) || "",
      electricityAccountNumber: (p.electricityAccountNumber as string) || "",
      electricityProvider: (p.electricityProvider as string) || "",
      electricityMeterNumber: (p.electricityMeterNumber as string) || "",
      electricityTariff: (p.electricityTariff as string) || "",
      internetProvider: (p.internetProvider as string) || "",
      internetAccountNumber: (p.internetAccountNumber as string) || "",
      captureCommission: property.captureCommission?.toString() || "",
      captureExclusive: property.captureExclusive || false,
      captureContractUrl: property.captureContractUrl || "",
      videoUrl: property.videoUrl || "",
      floorPlanUrl: property.floorPlanUrl || "",
      virtualTourUrl: property.virtualTourUrl || "",
      status: property.status,
    });
    setCustomFieldDrafts(Object.entries(property.customFields || {}).map(([name, value], index) => ({
      id: `field-${index}-${name}`,
      name,
      value,
    })));
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este inmueble?")) return;
    try {
      const response = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Inmueble eliminado correctamente" });
        fetchProperties();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: getApiError(error, "Error al eliminar").message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingProperty(null);
    setFormData({
      code: "",
      ownerId: "",
      title: "",
      address: "",
      city: "",
      latitude: null,
      longitude: null,
      propertyType: "APARTMENT",
      totalAreaSqm: "",
      builtAreaSqm: "",
      bedrooms: "",
      bathrooms: "",
      parkingSpaces: "",
      amenities: "",
      condoName: "",
      condoAccountNumber: "",
      condoAdministration: "",
      condoFeeAmount: "",
      condoContact: "",
      electricityAccountNumber: "",
      electricityProvider: "",
      electricityMeterNumber: "",
      electricityTariff: "",
      internetProvider: "",
      internetAccountNumber: "",
      captureCommission: "",
      captureExclusive: false,
      captureContractUrl: "",
      videoUrl: "",
      floorPlanUrl: "",
      virtualTourUrl: "",
      status: "available",
    });
    setCustomFieldDrafts([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreationStep(0);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (property: Property) => {
    setCreationStep(0);
    handleEdit(property);
  };

  const goToNextStep = () => {
    if (creationStep === 0) {
      const missing: Record<string, string> = {};
      if (!formData.code.trim()) missing.code = "El código es obligatorio";
      if (!formData.ownerId) missing.ownerId = "Selecciona un propietario";
      if (!formData.title.trim()) missing.title = "El título es obligatorio";
      if (!formData.address.trim()) missing.address = "La dirección es obligatoria";
      if (!formData.city.trim()) missing.city = "La ciudad es obligatoria";
      if (Object.keys(missing).length > 0) {
        setFieldErrors(missing);
        toast({
          title: "Faltan datos obligatorios",
          description: Object.values(missing).join(" · "),
          variant: "destructive",
        });
        return;
      }
    }
    setFieldErrors({});
    setCreationStep((step) => Math.min(step + 1, PROPERTY_FORM_STEPS.length - 1));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      available: { label: "Disponible", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
      reserved: { label: "Reservado", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
      rented: { label: "Alquilado", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
      sold: { label: "Vendido", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
      maintenance: { label: "En mantenimiento", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
      suspended: { label: "Suspendido", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inmuebles</h1>
          <p className="text-muted-foreground mt-1">Gestión de propiedades, servicios y galería de fotos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Inmueble
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Editar Inmueble" : "Nuevo Inmueble"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 border-b pb-4">
              <div className="flex items-center justify-between gap-2">
                {PROPERTY_FORM_STEPS.map((step, index) => (
                  <div key={step.title} className="flex min-w-0 flex-1 items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${index === creationStep ? "bg-primary text-primary-foreground" : index < creationStep ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{index < creationStep ? <Check className="h-4 w-4" /> : index + 1}</div>
                    <div className="hidden min-w-0 sm:block"><p className={`truncate text-xs font-semibold ${index === creationStep ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p><p className="truncate text-[11px] text-muted-foreground">{step.description}</p></div>
                    {index < PROPERTY_FORM_STEPS.length - 1 && <div className={`h-px flex-1 ${index < creationStep ? "bg-emerald-400" : "bg-border"}`} />}
                  </div>
                ))}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((creationStep + 1) / PROPERTY_FORM_STEPS.length) * 100}%` }} /></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {creationStep === 0 && <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    placeholder="C-001"
                  />
                  <FieldError message={fieldErrors.code} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Propietario *</Label>
                  <SearchableSelect
                    id="ownerId"
                    value={formData.ownerId}
                    onValueChange={(v) => setFormData({ ...formData, ownerId: v })}
                    placeholder="Seleccionar propietario"
                    searchPlaceholder="Buscar propietario…"
                    aria-invalid={Boolean(fieldErrors.ownerId)}
                    options={owners.map((owner) => ({ value: owner.id, label: owner.fullName }))}
                    onSearch={async (query) => {
                      const response = await fetch(`/api/owners?search=${encodeURIComponent(query)}&limit=20`);
                      if (!response.ok) return [];
                      const data = await response.json();
                      return (data.data ?? []).map((owner: { id: string; fullName: string }) => ({ value: owner.id, label: owner.fullName }));
                    }}
                  />
                  <FieldError message={fieldErrors.ownerId} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Apartamento en La Lagunita"
                  />
                  <FieldError message={fieldErrors.title} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder="Calle, urbanización, sector"
                  />
                  <FieldError message={fieldErrors.address} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    placeholder="Caracas"
                  />
                  <FieldError message={fieldErrors.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Tipo de inmueble *</Label>
                  <Select value={formData.propertyType} onValueChange={(value) => setFormData({ ...formData, propertyType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROPERTY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAreaSqm">Área total (m²)</Label>
                  <Input id="totalAreaSqm" type="number" min="0" step="0.01" value={formData.totalAreaSqm} onChange={(event) => setFormData({ ...formData, totalAreaSqm: event.target.value })} placeholder="120" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="builtAreaSqm">Área construida (m²)</Label>
                  <Input id="builtAreaSqm" type="number" min="0" step="0.01" value={formData.builtAreaSqm} onChange={(event) => setFormData({ ...formData, builtAreaSqm: event.target.value })} placeholder="95" />
                </div>
                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div className="space-y-2"><Label htmlFor="bedrooms">Habitaciones</Label><Input id="bedrooms" type="number" min="0" step="1" value={formData.bedrooms} onChange={(event) => setFormData({ ...formData, bedrooms: event.target.value })} placeholder="3" /></div>
                  <div className="space-y-2"><Label htmlFor="bathrooms">Baños</Label><Input id="bathrooms" type="number" min="0" step="1" value={formData.bathrooms} onChange={(event) => setFormData({ ...formData, bathrooms: event.target.value })} placeholder="2" /></div>
                  <div className="space-y-2"><Label htmlFor="parkingSpaces">Estacionamientos</Label><Input id="parkingSpaces" type="number" min="0" step="1" value={formData.parkingSpaces} onChange={(event) => setFormData({ ...formData, parkingSpaces: event.target.value })} placeholder="2" /></div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="amenities">Amenidades</Label>
                  <Input id="amenities" value={formData.amenities} onChange={(event) => setFormData({ ...formData, amenities: event.target.value })} placeholder="Piscina, gimnasio, terraza, vigilancia" />
                  <p className="text-xs text-muted-foreground">Separa cada amenidad con una coma.</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Ubicación en el mapa</Label>
                  <LocationPicker
                    value={formData.latitude !== null && formData.longitude !== null
                      ? { latitude: formData.latitude, longitude: formData.longitude }
                      : null}
                    onChange={({ latitude, longitude }) =>
                      setFormData({ ...formData, latitude, longitude })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>}

              {creationStep === 1 && <>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Datos de Servicios</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="condoName">Nombre de Condominio</Label>
                    <Input
                      id="condoName"
                      value={formData.condoName}
                      onChange={(e) => setFormData({ ...formData, condoName: e.target.value })}
                      placeholder="Condominio Torre A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condoAccountNumber">Número de Cuenta Condominio</Label>
                    <Input
                      id="condoAccountNumber"
                      value={formData.condoAccountNumber}
                      onChange={(e) => setFormData({ ...formData, condoAccountNumber: e.target.value })}
                      placeholder="0102-0123-45-6789012345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condoAdministration">Administradora</Label>
                    <Input
                      id="condoAdministration"
                      value={formData.condoAdministration}
                      onChange={(e) => setFormData({ ...formData, condoAdministration: e.target.value })}
                      placeholder="Administradora del condominio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condoFeeAmount">Cuota de Condominio</Label>
                    <Input
                      id="condoFeeAmount"
                      type="number"
                      step="0.01"
                      value={formData.condoFeeAmount}
                      onChange={(e) => setFormData({ ...formData, condoFeeAmount: e.target.value })}
                      placeholder="120.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condoContact">Contacto del Condominio</Label>
                    <Input
                      id="condoContact"
                      value={formData.condoContact}
                      onChange={(e) => setFormData({ ...formData, condoContact: e.target.value })}
                      placeholder="Teléfono o correo de administración"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityAccountNumber">Número de Cuenta Electricidad (NIC/NIS)</Label>
                    <Input
                      id="electricityAccountNumber"
                      value={formData.electricityAccountNumber}
                      onChange={(e) => setFormData({ ...formData, electricityAccountNumber: e.target.value })}
                      placeholder="NIC: 123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityProvider">Empresa Eléctrica</Label>
                    <Input
                      id="electricityProvider"
                      value={formData.electricityProvider}
                      onChange={(e) => setFormData({ ...formData, electricityProvider: e.target.value })}
                      placeholder="Empresa prestadora del servicio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityMeterNumber">Número de Medidor</Label>
                    <Input
                      id="electricityMeterNumber"
                      value={formData.electricityMeterNumber}
                      onChange={(e) => setFormData({ ...formData, electricityMeterNumber: e.target.value })}
                      placeholder="Medidor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityTariff">Tarifa Eléctrica</Label>
                    <Input
                      id="electricityTariff"
                      value={formData.electricityTariff}
                      onChange={(e) => setFormData({ ...formData, electricityTariff: e.target.value })}
                      placeholder="Tarifa o plan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internetProvider">Proveedor de Internet</Label>
                    <Input
                      id="internetProvider"
                      value={formData.internetProvider}
                      onChange={(e) => setFormData({ ...formData, internetProvider: e.target.value })}
                      placeholder="Inter, NetUno, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internetAccountNumber">Número de Cuenta Internet</Label>
                    <Input
                      id="internetAccountNumber"
                      value={formData.internetAccountNumber}
                      onChange={(e) => setFormData({ ...formData, internetAccountNumber: e.target.value })}
                      placeholder="Número de contrato"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium">Captación y condiciones comerciales</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="captureCommission">Comisión acordada (%)</Label>
                    <Input id="captureCommission" type="number" min="0" max="100" step="0.01" value={formData.captureCommission} onChange={(event) => setFormData({ ...formData, captureCommission: event.target.value })} placeholder="5" />
                  </div>
                  <div className="flex items-center gap-3 pt-7">
                    <input id="captureExclusive" type="checkbox" checked={formData.captureExclusive} onChange={(event) => setFormData({ ...formData, captureExclusive: event.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
                    <Label htmlFor="captureExclusive">Captación exclusiva</Label>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="captureContractUrl">Contrato de captación (URL)</Label>
                    <Input id="captureContractUrl" value={formData.captureContractUrl} onChange={(event) => setFormData({ ...formData, captureContractUrl: event.target.value })} placeholder="https://..." />
                  </div>
                </div>
              </div>
              </>}

              {creationStep === 2 && <>
              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium">Multimedia y material comercial</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="videoUrl">Video del inmueble</Label><Input id="videoUrl" value={formData.videoUrl} onChange={(event) => setFormData({ ...formData, videoUrl: event.target.value })} placeholder="https://youtube.com/..." /></div>
                  <div className="space-y-2"><Label htmlFor="floorPlanUrl">Plano 2D/3D</Label><Input id="floorPlanUrl" value={formData.floorPlanUrl} onChange={(event) => setFormData({ ...formData, floorPlanUrl: event.target.value })} placeholder="https://..." /></div>
                  <div className="space-y-2 md:col-span-2"><Label htmlFor="virtualTourUrl">Recorrido virtual</Label><Input id="virtualTourUrl" value={formData.virtualTourUrl} onChange={(event) => setFormData({ ...formData, virtualTourUrl: event.target.value })} placeholder="https://..." /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium">Campos personalizados</h3>
                    <p className="text-sm text-muted-foreground">Atributos adicionales exclusivos de este inmueble</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setCustomFieldDrafts((fields) => [...fields, { id: crypto.randomUUID(), name: "", value: "" }])}>
                    <Plus className="mr-2 h-4 w-4" />Agregar campo
                  </Button>
                </div>
                {customFieldDrafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin atributos adicionales</p>
                ) : (
                  <div className="space-y-2">
                    {customFieldDrafts.map((field) => (
                      <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                        <Input aria-label="Nombre del campo personalizado" placeholder="Nombre del campo" value={field.name} onChange={(event) => setCustomFieldDrafts((fields) => fields.map((item) => item.id === field.id ? { ...item, name: event.target.value } : item))} />
                        <Input aria-label="Valor del campo personalizado" placeholder="Valor" value={field.value} onChange={(event) => setCustomFieldDrafts((fields) => fields.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} />
                        <Button type="button" size="icon" variant="ghost" aria-label="Quitar campo personalizado" title="Quitar campo" onClick={() => setCustomFieldDrafts((fields) => fields.filter((item) => item.id !== field.id))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                {creationStep > 0 && <Button type="button" variant="ghost" onClick={() => setCreationStep((step) => step - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Anterior</Button>}
                {creationStep < PROPERTY_FORM_STEPS.length - 1 ? <Button type="button" onClick={goToNextStep}>Siguiente<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{editingProperty ? "Guardar cambios" : "Crear inmueble"}</Button>}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isLocationMapOpen} onOpenChange={setIsLocationMapOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[92vh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
            <DialogTitle>Mapa de inmuebles</DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-3 sm:px-5 sm:pb-5">
            {isLoadingLocations ? (
              <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
              <PropertyPortfolioMap properties={locations} totalPropertyCount={totalPropertiesForMap} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Portafolio</p>
            <h2 className="mt-1 text-xl font-semibold">Inventario de inmuebles</h2>
            <p className="mt-1 text-sm text-muted-foreground">{pagination.total} {pagination.total === 1 ? "propiedad registrada" : "propiedades registradas"}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código, título o dirección"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 sm:w-72"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchableSelect
              value={ownerFilter}
              onValueChange={setOwnerFilter}
              placeholder="Propietario"
              searchPlaceholder="Buscar propietario…"
              clearable
              clearLabel="Todos los propietarios"
              className="sm:w-52"
              options={owners.map((owner) => ({ value: owner.id, label: owner.fullName }))}
              onSearch={async (query) => {
                const response = await fetch(`/api/owners?search=${encodeURIComponent(query)}&limit=20`);
                if (!response.ok) return [];
                const data = await response.json();
                return (data.data ?? []).map((owner: { id: string; fullName: string }) => ({ value: owner.id, label: owner.fullName }));
              }}
            />
            <Select value={tagFilter || "all"} onValueChange={(value) => setTagFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Etiquetas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etiquetas</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" placeholder="Canon mín." value={minCanon} onChange={(e) => setMinCanon(e.target.value)} className="w-28" aria-label="Canon mínimo" />
              <Input type="number" min="0" placeholder="Canon máx." value={maxCanon} onChange={(e) => setMaxCanon(e.target.value)} className="w-28" aria-label="Canon máximo" />
            </div>
            <div className="flex h-10 w-fit overflow-hidden rounded-md border bg-background" role="group" aria-label="Modo de visualización del inventario">
              <Button type="button" variant="ghost" size="sm" aria-pressed={viewMode === "cards"} aria-label="Ver en tarjetas" title="Ver en tarjetas" className={`h-full rounded-none px-3 ${viewMode === "cards" ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setViewMode("cards")}>
                <Grid2X2 className="h-4 w-4 sm:mr-2" /><span className="sr-only sm:not-sr-only">Tarjetas</span>
              </Button>
              <div className="w-px bg-border" />
              <Button type="button" variant="ghost" size="sm" aria-pressed={viewMode === "table"} aria-label="Ver en tabla" title="Ver en tabla" className={`h-full rounded-none px-3 ${viewMode === "table" ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setViewMode("table")}>
                <List className="h-4 w-4 sm:mr-2" /><span className="sr-only sm:not-sr-only">Tabla</span>
              </Button>
            </div>
            <Button type="button" variant="outline" className="shrink-0" onClick={() => setIsLocationMapOpen(true)}>
              <MapPin className="mr-2 h-4 w-4" />Mapa
            </Button>
          </div>
        </div>

        {isLoading ? (
          viewMode === "cards" ? (
            <CardGridSkeleton items={6} className="xl:grid-cols-2" />
          ) : (
            <TableSkeleton rows={8} columns={7} />
          )
        ) : properties.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-16 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No hay inmuebles para mostrar</p>
            <p className="mt-1 text-sm text-muted-foreground">Registra una propiedad o cambia los filtros.</p>
            <Button className="mt-5" onClick={handleOpenCreate}><Plus className="mr-2 h-4 w-4" />Crear inmueble</Button>
          </div>
        ) : (
          <>
            {viewMode === "cards" ? <div className="grid gap-4 xl:grid-cols-2">
              {properties.map((property) => (
                <article key={property.id} className="group grid overflow-hidden rounded-lg border border-border/80 bg-card transition-colors hover:border-primary/45 sm:grid-cols-[minmax(12rem,0.95fr)_1.2fr]">
                  <Link href={`/dashboard/inmuebles/${property.id}`} className="relative block min-h-48 overflow-hidden bg-muted sm:min-h-56" aria-label={`Ver ${property.title}`}>
                    {property.photos[0] ? (
                      <img src={property.photos[0].photoUrl} alt={property.photos[0].description || property.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-linear-to-br from-primary/10 via-muted to-amber-500/10 text-muted-foreground">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/70"><Home className="h-6 w-6" /></div>
                        <span className="text-xs font-medium">Sin fotografías</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded bg-background/95 px-2.5 py-1 font-mono text-xs font-semibold text-foreground shadow-sm">{property.code}</span>
                    <span className="absolute bottom-3 left-3">{getStatusBadge(property.status)}</span>
                  </Link>

                  <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/dashboard/inmuebles/${property.id}`} className="line-clamp-2 text-lg font-semibold leading-snug hover:text-primary">{property.title}</Link>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{property.city}</span></p>
                          {property.tags && property.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {property.tags.map((tag) => (
                                <span key={tag.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(property)} aria-label={`Editar ${property.title}`} title="Editar"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(property.id)} aria-label={`Eliminar ${property.title}`} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="mt-5 border-t border-border/70 pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Propietario</p>
                        <p className="mt-1 truncate text-sm font-medium">{property.owner.fullName}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contratos</p>
                        <p className="mt-1 text-sm font-semibold">{property._count.leases} <span className="font-normal text-muted-foreground">registrados</span></p>
                      </div>
                      <Link href={`/dashboard/inmuebles/${property.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                        Ver ficha <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div> : <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Inmueble</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Contratos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-mono text-xs font-semibold">{property.code}</TableCell>
                      <TableCell className="min-w-48"><Link href={`/dashboard/inmuebles/${property.id}`} className="font-medium hover:text-primary">{property.title}</Link></TableCell>
                      <TableCell className="min-w-48"><span className="flex items-center gap-1.5 text-sm"><MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{property.city}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{property.address}</span></TableCell>
                      <TableCell className="min-w-40">{property.owner.fullName}</TableCell>
                      <TableCell>{getStatusBadge(property.status)}</TableCell>
                      <TableCell className="tabular-nums">{property._count.leases}</TableCell>
                      <TableCell><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${property.title}`} title="Editar" onClick={() => handleOpenEdit(property)}><Edit className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${property.title}`} title="Eliminar" onClick={() => handleDelete(property.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button><Button asChild variant="ghost" size="icon" aria-label={`Ver ${property.title}`} title="Ver ficha"><Link href={`/dashboard/inmuebles/${property.id}`}><Eye className="h-4 w-4" /></Link></Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>}

            {pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Mostrando {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
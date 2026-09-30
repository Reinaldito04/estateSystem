import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ClientFormData, ClientProfile } from "../types";

const roleOptions = [
  { value: "TENANT", label: "Inquilino" },
  { value: "BUYER", label: "Comprador" },
  { value: "PROSPECT", label: "Prospecto" },
  { value: "GUARANTOR", label: "Fiador" },
];

const maritalStatusOptions = [
  { value: "SINGLE", label: "Soltero(a)" },
  { value: "MARRIED", label: "Casado(a)" },
  { value: "DIVORCED", label: "Divorciado(a)" },
  { value: "WIDOWED", label: "Viudo(a)" },
  { value: "COMMON_LAW", label: "Unión libre" },
];

const riskOptions = [
  { value: "LOW", label: "Bajo" },
  { value: "MEDIUM", label: "Medio" },
  { value: "HIGH", label: "Alto" },
  { value: "CRITICAL", label: "Crítico" },
];

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: ClientProfile | null;
  formData: ClientFormData;
  setFormData: Dispatch<SetStateAction<ClientFormData>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
}

function renderRoleFields(formData: ClientFormData, setFormData: Dispatch<SetStateAction<ClientFormData>>) {
  if (formData.role === "TENANT") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="workPlace">Lugar de trabajo</Label>
          <Input
            id="workPlace"
            value={formData.workPlace}
            onChange={(event) => setFormData({ ...formData, workPlace: event.target.value })}
            placeholder="Empresa / ocupación"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyIncome">Ingreso mensual</Label>
          <Input
            id="monthlyIncome"
            type="number"
            step="0.01"
            value={formData.monthlyIncome}
            onChange={(event) => setFormData({ ...formData, monthlyIncome: event.target.value })}
            placeholder="2500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContactName">Contacto de emergencia</Label>
          <Input
            id="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={(event) => setFormData({ ...formData, emergencyContactName: event.target.value })}
            placeholder="Nombre"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergencyContactPhone">Teléfono emergencia</Label>
          <Input
            id="emergencyContactPhone"
            value={formData.emergencyContactPhone}
            onChange={(event) => setFormData({ ...formData, emergencyContactPhone: event.target.value })}
            placeholder="0412-0000000"
          />
        </div>
      </>
    );
  }

  if (formData.role === "BUYER" || formData.role === "PROSPECT") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="preferredPropertyType">Tipo de inmueble preferido</Label>
          <Input
            id="preferredPropertyType"
            value={formData.preferredPropertyType}
            onChange={(event) => setFormData({ ...formData, preferredPropertyType: event.target.value })}
            placeholder="Apartamento / casa / local"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxBudget">Presupuesto máximo</Label>
          <Input
            id="maxBudget"
            type="number"
            step="0.01"
            value={formData.maxBudget}
            onChange={(event) => setFormData({ ...formData, maxBudget: event.target.value })}
            placeholder="120000"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="housingRequirement">Requisito de vivienda</Label>
          <Input
            id="housingRequirement"
            value={formData.housingRequirement}
            onChange={(event) => setFormData({ ...formData, housingRequirement: event.target.value })}
            placeholder="3 habitaciones, zona segura, cerca de transporte"
          />
        </div>
      </>
    );
  }

  return null;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  editingClient,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  onCreate,
}: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                required
                placeholder="Ana López"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalDocumentId">Identificación legal *</Label>
              <Input
                id="legalDocumentId"
                value={formData.legalDocumentId}
                onChange={(event) => setFormData({ ...formData, legalDocumentId: event.target.value })}
                required
                placeholder="V-12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value as ClientFormData["role"] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Estado civil</Label>
              <select
                id="maritalStatus"
                value={formData.maritalStatus}
                onChange={(event) => setFormData({ ...formData, maritalStatus: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sin especificar</option>
                {maritalStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="ana@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                required
                placeholder="0412-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alternatePhone">Teléfono alternativo</Label>
              <Input
                id="alternatePhone"
                value={formData.alternatePhone}
                onChange={(event) => setFormData({ ...formData, alternatePhone: event.target.value })}
                placeholder="0424-7654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                placeholder="Valencia"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Calle principal, edificio, apartamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Nivel de riesgo</Label>
              <select
                id="riskLevel"
                value={formData.riskLevel}
                onChange={(event) => setFormData({ ...formData, riskLevel: event.target.value as ClientFormData["riskLevel"] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {riskOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="riskSummary">Resumen de riesgo</Label>
              <Input
                id="riskSummary"
                value={formData.riskSummary}
                onChange={(event) => setFormData({ ...formData, riskSummary: event.target.value })}
                placeholder="Ingresos estables, sin antecedentes negativos"
              />
            </div>
            {renderRoleFields(formData, setFormData)}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notas del expediente</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                placeholder="Interés por apartamento, requiere seguimiento y documentos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingClient ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

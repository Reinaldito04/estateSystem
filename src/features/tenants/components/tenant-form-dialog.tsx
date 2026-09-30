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
import type { Tenant, TenantFormData } from "../types";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTenant: Tenant | null;
  formData: TenantFormData;
  setFormData: Dispatch<SetStateAction<TenantFormData>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
}

export function TenantFormDialog({
  open,
  onOpenChange,
  editingTenant,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  onCreate,
}: TenantFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Inquilino
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingTenant ? "Editar Inquilino" : "Nuevo Inquilino"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                required
                placeholder="María González"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentId">Documento de Identidad *</Label>
              <Input
                id="documentId"
                value={formData.documentId}
                onChange={(event) => setFormData({ ...formData, documentId: event.target.value })}
                required
                placeholder="V-87654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="maria@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                required
                placeholder="0412-9876543"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workPlace">Lugar de Trabajo</Label>
              <Input
                id="workPlace"
                value={formData.workPlace}
                onChange={(event) => setFormData({ ...formData, workPlace: event.target.value })}
                placeholder="Empresa ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Ingreso Mensual</Label>
              <Input
                id="monthlyIncome"
                type="number"
                step="0.01"
                value={formData.monthlyIncome}
                onChange={(event) => setFormData({ ...formData, monthlyIncome: event.target.value })}
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contacto de Emergencia</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(event) => setFormData({ ...formData, emergencyContactName: event.target.value })}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia</Label>
              <Input
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(event) => setFormData({ ...formData, emergencyContactPhone: event.target.value })}
                placeholder="0412-1112233"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTenant ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
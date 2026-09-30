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
import type { Owner, OwnerFormData } from "../types";

interface OwnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOwner: Owner | null;
  formData: OwnerFormData;
  setFormData: Dispatch<SetStateAction<OwnerFormData>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
}

export function OwnerFormDialog({
  open,
  onOpenChange,
  editingOwner,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  onCreate,
}: OwnerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Propietario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingOwner ? "Editar Propietario" : "Nuevo Propietario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-semibold">Identificación</h3>
            <p className="mt-1 text-sm text-muted-foreground">Datos básicos para identificar al titular legal.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                required
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentId">Documento de Identidad *</Label>
              <Input
                id="documentId"
                value={formData.documentId}
                onChange={(event) => setFormData({ ...formData, documentId: event.target.value })}
                required
                placeholder="V-12345678"
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Canales de contacto</h3>
            <p className="mt-1 text-sm text-muted-foreground">Mantén actualizados los medios para gestiones y notificaciones.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="juan@email.com"
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
              <Label htmlFor="alternatePhone">Teléfono Alternativo</Label>
              <Input
                id="alternatePhone"
                value={formData.alternatePhone}
                onChange={(event) => setFormData({ ...formData, alternatePhone: event.target.value })}
                placeholder="0424-1234567"
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Información administrativa</h3>
            <p className="mt-1 text-sm text-muted-foreground">Usa estos datos para la gestión documental y financiera.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="Calle principal, edificio, apartamento"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bankDetails">Datos Bancarios</Label>
              <Input
                id="bankDetails"
                value={formData.bankDetails}
                onChange={(event) => setFormData({ ...formData, bankDetails: event.target.value })}
                placeholder="Banco, tipo de cuenta, número de cuenta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingOwner ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
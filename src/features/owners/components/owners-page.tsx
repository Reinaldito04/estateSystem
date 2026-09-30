"use client";

import { Building2, ClipboardList, UsersRound } from "lucide-react";
import { OwnerFormDialog } from "@/features/owners/components/owner-form-dialog";
import { OwnersTable } from "@/features/owners/components/owners-table";
import { useOwners } from "@/features/owners/hooks/use-owners";
import { Card, CardContent } from "@/components/ui/card";

export function OwnersPage() {
  const owners = useOwners();
  const propertiesOnPage = owners.owners.reduce((total, owner) => total + owner._count.properties, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propietarios</h1>
          <p className="mt-1 text-muted-foreground">Gestión de fichas de propietarios e inmuebles asociados</p>
        </div>
        <OwnerFormDialog
          open={owners.isDialogOpen}
          onOpenChange={owners.setIsDialogOpen}
          editingOwner={owners.editingOwner}
          formData={owners.formData}
          setFormData={owners.setFormData}
          isSubmitting={owners.isSubmitting}
          onSubmit={owners.handleSubmit}
          onCreate={owners.handleOpenCreate}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Propietarios registrados</p>
              <p className="text-2xl font-semibold tracking-tight">{owners.pagination.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inmuebles visibles</p>
              <p className="text-2xl font-semibold tracking-tight">{propertiesOnPage}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resultados actuales</p>
              <p className="text-2xl font-semibold tracking-tight">{owners.owners.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <OwnersTable
        owners={owners.owners}
        pagination={owners.pagination}
        setPagination={owners.setPagination}
        search={owners.search}
        setSearch={owners.setSearch}
        isLoading={owners.isLoading}
        onCreate={owners.handleOpenCreate}
        onEdit={owners.handleEdit}
        onDelete={owners.handleDelete}
      />
    </div>
  );
}
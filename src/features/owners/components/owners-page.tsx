"use client";

import { OwnerFormDialog } from "@/features/owners/components/owner-form-dialog";
import { OwnersTable } from "@/features/owners/components/owners-table";
import { useOwners } from "@/features/owners/hooks/use-owners";

export function OwnersPage() {
  const owners = useOwners();

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
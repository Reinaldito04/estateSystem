"use client";

import { TenantFormDialog } from "@/features/tenants/components/tenant-form-dialog";
import { TenantsTable } from "@/features/tenants/components/tenants-table";
import { useTenants } from "@/features/tenants/hooks/use-tenants";

export function TenantsPage() {
  const tenants = useTenants();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquilinos</h1>
          <p className="mt-1 text-muted-foreground">Gestión de fichas de inquilinos y contratos asociados</p>
        </div>
        <TenantFormDialog
          open={tenants.isDialogOpen}
          onOpenChange={tenants.setIsDialogOpen}
          editingTenant={tenants.editingTenant}
          formData={tenants.formData}
          setFormData={tenants.setFormData}
          isSubmitting={tenants.isSubmitting}
          onSubmit={tenants.handleSubmit}
          onCreate={tenants.handleOpenCreate}
        />
      </div>
      <TenantsTable
        tenants={tenants.tenants}
        pagination={tenants.pagination}
        setPagination={tenants.setPagination}
        search={tenants.search}
        setSearch={tenants.setSearch}
        isLoading={tenants.isLoading}
        onCreate={tenants.handleOpenCreate}
        onEdit={tenants.handleEdit}
        onDelete={tenants.handleDelete}
      />
    </div>
  );
}
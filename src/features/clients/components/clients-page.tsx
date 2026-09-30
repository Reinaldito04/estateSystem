"use client";

import { ClientFormDialog } from "@/features/clients/components/client-form-dialog";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { useClients } from "@/features/clients/hooks/use-clients";

export function ClientsPage() {
  const clients = useClients();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM de clientes</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona el expediente comercial y contractual de inquilinos, compradores, prospectos y fiadores.
          </p>
        </div>
        <ClientFormDialog
          open={clients.isDialogOpen}
          onOpenChange={clients.setIsDialogOpen}
          editingClient={clients.editingClient}
          formData={clients.formData}
          setFormData={clients.setFormData}
          isSubmitting={clients.isSubmitting}
          onSubmit={clients.handleSubmit}
          onCreate={clients.handleOpenCreate}
        />
      </div>
      <ClientsTable
        clients={clients.clients}
        pagination={clients.pagination}
        setPagination={clients.setPagination}
        search={clients.search}
        setSearch={clients.setSearch}
        isLoading={clients.isLoading}
        onCreate={clients.handleOpenCreate}
        onEdit={clients.handleEdit}
        onDelete={clients.handleDelete}
      />
    </div>
  );
}

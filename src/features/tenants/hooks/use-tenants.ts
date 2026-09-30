import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Pagination, Tenant, TenantFormData } from "../types";

const emptyForm: TenantFormData = {
  fullName: "",
  documentId: "",
  email: "",
  phone: "",
  workPlace: "",
  monthlyIncome: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const initialPagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });
      const response = await fetch(`/api/tenants?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTenants(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar inquilinos", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTenants();
  }, [pagination.page, search]);

  const resetForm = () => {
    setEditingTenant(null);
    setFormData(emptyForm);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : "/api/tenants";
      const method = editingTenant ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
        }),
      });
      if (response.ok) {
        toast({
          title: editingTenant ? "Actualizado" : "Creado",
          description: `Inquilino ${editingTenant ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        void fetchTenants();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      fullName: tenant.fullName,
      documentId: tenant.documentId,
      email: tenant.email || "",
      phone: tenant.phone,
      workPlace: tenant.workPlace || "",
      monthlyIncome: tenant.monthlyIncome || "",
      emergencyContactName: tenant.emergencyContactName || "",
      emergencyContactPhone: tenant.emergencyContactPhone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este inquilino?")) return;
    try {
      const response = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Inquilino eliminado correctamente" });
        void fetchTenants();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  return {
    tenants,
    pagination,
    setPagination,
    search,
    setSearch,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingTenant,
    formData,
    setFormData,
    isSubmitting,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleOpenCreate,
  };
}
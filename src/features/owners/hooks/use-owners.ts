import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Owner, OwnerFormData, Pagination } from "../types";

const emptyForm: OwnerFormData = {
  fullName: "",
  documentId: "",
  email: "",
  phone: "",
  alternatePhone: "",
  address: "",
  bankDetails: "",
};

const initialPagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function useOwners() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });
      const response = await fetch(`/api/owners?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOwners(data.data);
        setPagination(data.pagination);
      } else {
        toast({ title: "Error", description: "Error al cargar propietarios", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchOwners();
  }, [pagination.page, search]);

  const resetForm = () => {
    setEditingOwner(null);
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
      const url = editingOwner ? `/api/owners/${editingOwner.id}` : "/api/owners";
      const method = editingOwner ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: editingOwner ? "Actualizado" : "Creado",
          description: `Propietario ${editingOwner ? "actualizado" : "creado"} correctamente`,
        });
        setIsDialogOpen(false);
        resetForm();
        void fetchOwners();
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

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      fullName: owner.fullName,
      documentId: owner.documentId,
      email: owner.email || "",
      phone: owner.phone,
      alternatePhone: owner.alternatePhone || "",
      address: owner.address || "",
      bankDetails: owner.bankDetails || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este propietario?")) return;
    try {
      const response = await fetch(`/api/owners/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Propietario eliminado correctamente" });
        void fetchOwners();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
  };

  return {
    owners,
    pagination,
    setPagination,
    search,
    setSearch,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingOwner,
    formData,
    setFormData,
    isSubmitting,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleOpenCreate,
  };
}
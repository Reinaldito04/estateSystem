import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ClientFormData, ClientProfile, Pagination } from "../types";

const emptyForm: ClientFormData = {
  fullName: "",
  legalDocumentId: "",
  maritalStatus: "",
  email: "",
  phone: "",
  alternatePhone: "",
  address: "",
  city: "",
  role: "PROSPECT",
  status: "active",
  riskLevel: "MEDIUM",
  riskSummary: "",
  notes: "",
  workPlace: "",
  monthlyIncome: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  preferredPropertyType: "",
  maxBudget: "",
  housingRequirement: "",
};

const initialPagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function useClients() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/clients?${params}`);
      if (!response.ok) {
        throw new Error("Error al cargar clientes");
      }

      const data = await response.json();
      setClients(data.data);
      setPagination(data.pagination);
    } catch {
      toast({ title: "Error", description: "Error al cargar clientes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchClients();
  }, [fetchClients]);

  const resetForm = () => {
    setEditingClient(null);
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
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maritalStatus: formData.maritalStatus || undefined,
          email: formData.email || undefined,
          alternatePhone: formData.alternatePhone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          riskSummary: formData.riskSummary || undefined,
          notes: formData.notes || undefined,
          workPlace: formData.workPlace || undefined,
          monthlyIncome: formData.monthlyIncome ? Number(formData.monthlyIncome) : undefined,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
          preferredPropertyType: formData.preferredPropertyType || undefined,
          maxBudget: formData.maxBudget ? Number(formData.maxBudget) : undefined,
          housingRequirement: formData.housingRequirement || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar el cliente");
      }

      toast({
        title: editingClient ? "Actualizado" : "Creado",
        description: `Cliente ${editingClient ? "actualizado" : "creado"} correctamente`,
      });
      setIsDialogOpen(false);
      resetForm();
      void fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar", 
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: ClientProfile) => {
    setEditingClient(client);
    setFormData({
      fullName: client.fullName,
      legalDocumentId: client.legalDocumentId,
      maritalStatus: client.maritalStatus || "",
      email: client.email || "",
      phone: client.phone,
      alternatePhone: client.alternatePhone || "",
      address: client.address || "",
      city: client.city || "",
      role: client.role,
      status: client.status,
      riskLevel: client.riskLevel,
      riskSummary: client.riskSummary || "",
      notes: client.notes || "",
      workPlace: client.workPlace || "",
      monthlyIncome: client.monthlyIncome || "",
      emergencyContactName: client.emergencyContactName || "",
      emergencyContactPhone: client.emergencyContactPhone || "",
      preferredPropertyType: client.preferredPropertyType || "",
      maxBudget: client.maxBudget || "",
      housingRequirement: client.housingRequirement || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este cliente?")) return;

    try {
      const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo eliminar");
      }

      toast({ title: "Eliminado", description: "Cliente eliminado correctamente" });
      void fetchClients();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar",
        variant: "destructive",
      });
    }
  };

  return {
    clients,
    pagination,
    setPagination,
    search,
    setSearch,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingClient,
    formData,
    setFormData,
    isSubmitting,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleOpenCreate,
  };
}

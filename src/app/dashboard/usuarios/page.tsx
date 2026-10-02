"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Pencil } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";
import { TableSkeleton } from "@/components/shared/skeletons";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "AGENT", label: "Agente" },
  { value: "ASSISTANT", label: "Asistente" },
  { value: "ACCOUNTANT", label: "Contabilidad" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
] as const;

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "SUSPENDED", label: "Suspendido" },
] as const;

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

const emptyForm = { email: "", fullName: "", phone: "", role: "AGENT", status: "ACTIVE", password: "" };

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isAdmin = session?.user?.role === "ADMIN";

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) setUsers((await response.json()).data);
    } catch {
      console.error("Error loading users");
    }
  };

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : { data: [] }))
      .then((result) => {
        if (isCurrent) setUsers(result.data ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { fullName: form.fullName, phone: form.phone, role: form.role, status: form.status, ...(form.password ? { password: form.password } : {}) }
            : form,
        ),
      });
      if (response.ok) {
        toast({ title: editingId ? "Usuario actualizado" : "Usuario creado" });
        setForm(emptyForm);
        setEditingId(null);
        fetchUsers();
      } else {
        const error = await response.json();
        const parsed = getApiError(error, "No se pudo guardar");
        setFieldErrors(parsed.fields);
        toast({ title: "Error", description: parsed.message, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const editUser = (user: UserRecord) => {
    setEditingId(user.id);
    setForm({ email: user.email, fullName: user.fullName, phone: user.phone || "", role: user.role, status: user.status, password: "" });
  };

  const deactivate = async (id: string) => {
    if (!confirm("¿Desactivar este usuario?")) return;
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (response.ok) fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground mt-1">Equipo con acceso al sistema y roles</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> {editingId ? "Editar usuario" : "Nuevo usuario"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1"><Label htmlFor="u-name">Nombre *</Label><Input id="u-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /><FieldError message={fieldErrors.fullName} /></div>
              <div className="space-y-1"><Label htmlFor="u-email">Correo *</Label><Input id="u-email" type="email" required disabled={Boolean(editingId)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><FieldError message={fieldErrors.email} /></div>
              <div className="space-y-1"><Label htmlFor="u-phone">Teléfono</Label><Input id="u-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1">
                <Label htmlFor="u-role">Rol</Label>
                <select id="u-role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="u-status">Estado</Label>
                <select id="u-status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="u-password">{editingId ? "Nueva contraseña (opcional)" : "Contraseña *"}</Label><Input id="u-password" type="password" required={!editingId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><FieldError message={fieldErrors.password} /></div>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={isSubmitting}>{editingId ? "Guardar cambios" : "Crear usuario"}</Button>
                {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Equipo</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={6} columns={isAdmin ? 6 : 5} />
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Correo</th>
                  <th className="py-2">Rol</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Último acceso</th>
                  {isAdmin && <th className="py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{user.fullName}</td>
                    <td className="py-2 text-muted-foreground">{user.email}</td>
                    <td className="py-2">{user.role}</td>
                    <td className="py-2"><Badge variant={user.status === "ACTIVE" ? "success" : "secondary"}>{user.status}</Badge></td>
                    <td className="py-2 text-xs text-muted-foreground">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</td>
                    {isAdmin && (
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label={`Editar ${user.fullName}`} onClick={() => editUser(user)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" aria-label={`Desactivar ${user.fullName}`} onClick={() => deactivate(user.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

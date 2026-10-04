"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Badge } from "@/components/ui/badge";
import { User, KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiError } from "@/lib/api-error";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  AGENT: "Agente",
  ASSISTANT: "Asistente",
  ACCOUNTANT: "Contabilidad",
  MAINTENANCE: "Mantenimiento",
};

type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function ProfilePage() {
  const { update } = useSession();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [accountForm, setAccountForm] = useState({ fullName: "", phone: "" });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Profile | null) => {
        if (!isCurrent || !data) return;
        setProfile(data);
        setAccountForm({ fullName: data.fullName, phone: data.phone ?? "" });
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAccount(true);
    setAccountErrors({});
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsed = getApiError(payload, "No se pudo guardar el perfil");
        setAccountErrors(parsed.fields);
        toast({ title: "Error", description: parsed.message, variant: "destructive" });
        return;
      }
      const updated = payload as Profile;
      setProfile(updated);
      setAccountForm({ fullName: updated.fullName, phone: updated.phone ?? "" });
      await update({ name: updated.fullName });
      toast({ title: "Perfil actualizado" });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordErrors({});
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }
    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsed = getApiError(payload, "No se pudo cambiar la contraseña");
        setPasswordErrors(parsed.fields);
        toast({ title: "Error", description: parsed.message, variant: "destructive" });
        return;
      }
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Contraseña actualizada", description: "Tu nueva contraseña ya está activa." });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar el perfil</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1">Tus datos de acceso y seguridad de la cuenta</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Datos personales</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="p-name">Nombre *</Label>
                <Input
                  id="p-name"
                  required
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                />
                <FieldError message={accountErrors.fullName} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="p-phone"
                    className="pl-9"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  />
                </div>
                <FieldError message={accountErrors.phone} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-email">Correo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="p-email" className="pl-9" value={profile.email} disabled readOnly />
                </div>
                <p className="text-xs text-muted-foreground">El correo de acceso solo lo puede cambiar un administrador.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Rol:</span>
                <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
              </div>
              <Button type="submit" disabled={isSavingAccount}>
                {isSavingAccount ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="p-current">Contraseña actual *</Label>
                <Input
                  id="p-current"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
                <FieldError message={passwordErrors.currentPassword} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-new">Nueva contraseña *</Label>
                <Input
                  id="p-new"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <FieldError message={passwordErrors.newPassword} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-confirm">Repetir nueva contraseña *</Label>
                <Input
                  id="p-confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
                <FieldError message={passwordErrors.confirmPassword} />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
              <Button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

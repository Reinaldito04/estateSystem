"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  AlertTriangle,
  FileText,
  RefreshCw,
  Send,
  Loader2,
  Calendar,
  Building2,
  User,
  ShieldAlert,
} from "lucide-react";
import { formatDate, formatCurrency, calculateDaysUntil } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ExpiringLease {
  id: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyCanonAmount: string;
  isActive: boolean;
  property: {
    id: string;
    code: string;
    title: string;
    owner: { id: string; fullName: string; phone: string };
  };
  tenant: { id: string; fullName: string; phone: string };
  notices: { id: string; noticeType: string; issueDate: string }[];
}

interface Notice {
  id: string;
  noticeType: string;
  issueDate: string;
  proposedCanonAmount: string | null;
  proposedStartDate: string | null;
  proposedEndDate: string | null;
  documentUrl: string | null;
  notes: string | null;
  lease: {
    id: string;
    contractNumber: string;
    property: { id: string; code: string; title: string };
    tenant: { id: string; fullName: string; phone: string };
  };
}

interface AutomatedAlert {
  id: string;
  kind: string;
  severity: string;
  dueDate: string;
  days: number;
  title: string;
  description: string;
  leaseId?: string;
  entityId?: string;
}

export default function NotificationsPage() {
  const [expiringLeases, setExpiringLeases] = useState<ExpiringLease[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [automatedAlerts, setAutomatedAlerts] = useState<AutomatedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<ExpiringLease | null>(null);
  const [formData, setFormData] = useState({
    noticeType: "RENOVATION_PROPOSAL",
    proposedCanonAmount: "",
    proposedStartDate: "",
    proposedEndDate: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchExpiringLeases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notices/expiring");
      if (response.ok) {
        const data = await response.json();
        setExpiringLeases(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Error al cargar contratos por vencer", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
      const response = await fetch("/api/notices");
      if (response.ok) {
        const data = await response.json();
        setNotices(data.data);
      }
    } catch {
      console.error("Error fetching notices");
    }
  };

  const fetchAutomatedAlerts = async () => {
    try {
      const response = await fetch("/api/notices/automated?days=90");
      if (response.ok) {
        const data = await response.json();
        setAutomatedAlerts(data.data);
      }
    } catch {
      console.error("Error fetching automated alerts");
    }
  };

  useEffect(() => {
    fetchExpiringLeases();
    fetchNotices();
    fetchAutomatedAlerts();
  }, []);

  const generateExpirationNotices = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/notices/expiring", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Notificaciones generadas",
          description: data.message,
        });
        fetchExpiringLeases();
        fetchNotices();
        fetchAutomatedAlerts();
      } else {
        toast({ title: "Error", description: "Error al generar notificaciones", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: selectedLease.id,
          noticeType: formData.noticeType,
          proposedCanonAmount: formData.proposedCanonAmount ? parseFloat(formData.proposedCanonAmount) : undefined,
          proposedStartDate: formData.proposedStartDate || undefined,
          proposedEndDate: formData.proposedEndDate || undefined,
          notes: formData.notes,
        }),
      });
      if (response.ok) {
        toast({ title: "Creado", description: "Notificación creada correctamente" });
        setIsDialogOpen(false);
        resetForm();
        fetchNotices();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al crear", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedLease(null);
    setFormData({
      noticeType: "RENOVATION_PROPOSAL",
      proposedCanonAmount: "",
      proposedStartDate: "",
      proposedEndDate: "",
      notes: "",
    });
  };

  const handleOpenDialog = (lease: ExpiringLease) => {
    setSelectedLease(lease);
    setFormData({
      noticeType: "RENOVATION_PROPOSAL",
      proposedCanonAmount: lease.monthlyCanonAmount,
      proposedStartDate: "",
      proposedEndDate: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const getNoticeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LEASE_EXPIRATION: "Vencimiento de Contrato",
      RENOVATION_PROPOSAL: "Propuesta de Renovación",
      OWNER_NOTICE: "Notificación a Propietario",
    };
    return labels[type] || type;
  };

  const getNoticeTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      LEASE_EXPIRATION: "bg-red-100 text-red-800",
      RENOVATION_PROPOSAL: "bg-blue-100 text-blue-800",
      OWNER_NOTICE: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
        {getNoticeTypeLabel(type)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones y Alertas</h1>
          <p className="text-muted-foreground mt-1">Vencimientos de contratos, propuestas de renovación y notificaciones</p>
        </div>
        <Button onClick={generateExpirationNotices} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Generar Alertas de Vencimiento
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-5 w-5 text-amber-600" />Alertas automáticas <Badge variant={automatedAlerts.length > 0 ? "warning" : "success"}>{automatedAlerts.length}</Badge></CardTitle></CardHeader>
        <CardContent>
          {automatedAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No hay vencimientos, reajustes ni documentos próximos a vencer en los próximos 90 días.</p> : <div className="grid gap-2 md:grid-cols-2">{automatedAlerts.map((alert) => <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{alert.title}</p><p className="truncate text-xs text-muted-foreground">{alert.description} · {formatDate(alert.dueDate)}</p></div><Badge variant={alert.severity === "high" ? "destructive" : "warning"}>{alert.days} días</Badge></div>)}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Contratos por Vencer (30 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : expiringLeases.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay contratos por vencer en los próximos 30 días</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringLeases.map((lease) => {
                const daysLeft = calculateDaysUntil(lease.endDate);
                return (
                  <div key={lease.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{lease.contractNumber}</span>
                        <span className={`text-sm font-medium ${daysLeft <= 15 ? "text-red-600" : "text-orange-600"}`}>
                          {daysLeft} días
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lease.property.code} - {lease.property.title}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {lease.tenant.fullName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Vence: {formatDate(lease.endDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lease.notices.length === 0 ? (
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(lease)}>
                          <Send className="h-4 w-4 mr-2" />
                          Crear Notificación
                        </Button>
                      ) : (
                        <Badge variant="success">Notificación enviada</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Historial de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay notificaciones registradas</p>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getNoticeTypeBadge(notice.noticeType)}
                      <span className="font-medium">{notice.lease.contractNumber}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDate(notice.issueDate)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Inmueble: {notice.lease.property.code} - {notice.lease.property.title}</p>
                    <p>Inquilino: {notice.lease.tenant.fullName}</p>
                    {notice.proposedCanonAmount && (
                      <p>Canon propuesto: {formatCurrency(notice.proposedCanonAmount)}</p>
                    )}
                    {notice.proposedStartDate && notice.proposedEndDate && (
                      <p>
                        Período propuesto: {formatDate(notice.proposedStartDate)} - {formatDate(notice.proposedEndDate)}
                      </p>
                    )}
                    {notice.notes && <p className="mt-2 p-2 bg-muted rounded">{notice.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Notificación - {selectedLease?.contractNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNotice} className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Notificación</label>
                <Select value={formData.noticeType} onValueChange={(v) => setFormData({ ...formData, noticeType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RENOVATION_PROPOSAL">Propuesta de Renovación</SelectItem>
                    <SelectItem value="OWNER_NOTICE">Notificación a Propietario</SelectItem>
                    <SelectItem value="LEASE_EXPIRATION">Vencimiento de Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Canon Propuesto</label>
                <input
                  type="number"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.proposedCanonAmount}
                  onChange={(e) => setFormData({ ...formData, proposedCanonAmount: e.target.value })}
                  placeholder="850"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Inicio Propuesta</label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.proposedStartDate}
                  onChange={(e) => setFormData({ ...formData, proposedStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Fin Propuesta</label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.proposedEndDate}
                  onChange={(e) => setFormData({ ...formData, proposedEndDate: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Notificación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
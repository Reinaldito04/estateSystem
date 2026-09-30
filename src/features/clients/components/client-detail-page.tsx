"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Building2, Calendar, DollarSign, FileText, Mail, MessageSquare, Phone, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ClientProfile } from "../types";

const emptyReferenceForm = {
  referenceType: "PERSONAL",
  fullName: "",
  relationship: "",
  company: "",
  phone: "",
  email: "",
  notes: "",
};

const emptyCommunicationForm = {
  channel: "EMAIL",
  direction: "OUTBOUND",
  subject: "",
  content: "",
  relatedRequest: "",
};

const emptyDocumentForm = {
  documentType: "",
  title: "",
  fileUrl: "",
  notes: "",
};

type ClientDetail = ClientProfile & {
  references: Array<{
    id: string;
    referenceType: string;
    fullName: string;
    relationship: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  communications: Array<{
    id: string;
    channel: string;
    direction: string;
    subject: string | null;
    content: string;
    relatedRequest: string | null;
    createdAt: string;
  }>;
  riskDocuments: Array<{
    id: string;
    documentType: string;
    title: string;
    fileUrl: string | null;
    notes: string | null;
    uploadedAt: string;
  }>;
  tenantOperations: {
    id: string;
    leases: Array<{
      id: string;
      contractNumber: string;
      startDate: string;
      endDate: string;
      monthlyCanonAmount: number;
      contractStatus: string;
      isActive: boolean;
      property: { id: string; code: string; title: string; address: string };
      transactions: Array<{
        id: string;
        amount: number;
        category: string;
        paymentDate: string;
        paymentMethod: string;
        description: string | null;
      }>;
    }>;
    propertyIssues: Array<{
      id: string;
      issueType: string;
      description: string;
      status: string;
      reportDate: string;
      property: { code: string; title: string };
    }>;
    documents: Array<{
      id: string;
      documentName: string;
      fileUrl: string;
      uploadedAt: string;
    }>;
  } | null;
};

const roleLabels: Record<string, string> = {
  OWNER: "Propietario",
  TENANT: "Inquilino",
  BUYER: "Comprador",
  PROSPECT: "Prospecto",
  GUARANTOR: "Fiador",
};

const riskLabels: Record<string, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referenceForm, setReferenceForm] = useState(emptyReferenceForm);
  const [communicationForm, setCommunicationForm] = useState(emptyCommunicationForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

  const refreshClient = async () => {
    const response = await fetch(`/api/clients/${clientId}`);
    if (!response.ok) throw new Error("No se pudo recargar el cliente");
    const result = await response.json();
    setClient(result);
  };

  const handleAddReference = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch(`/api/clients/${clientId}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referenceForm),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la referencia");

      setReferenceForm(emptyReferenceForm);
      await refreshClient();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al guardar la referencia");
    }
  };

  const handleAddCommunication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch(`/api/clients/${clientId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(communicationForm),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la comunicación");

      setCommunicationForm(emptyCommunicationForm);
      await refreshClient();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al guardar la comunicación");
    }
  };

  const handleAddDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentForm),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el documento");

      setDocumentForm(emptyDocumentForm);
      await refreshClient();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al guardar el documento");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadClient = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}`);
        if (!response.ok) throw new Error("No se pudo cargar el cliente");
        const result = await response.json();
        if (isMounted) setClient(result);
      } catch {
        if (isMounted) setClient(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadClient();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Cargando expediente del cliente…</div>;
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/dashboard/clientes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a clientes
          </Link>
        </Button>
        <p className="text-muted-foreground">No se encontró el cliente solicitado.</p>
      </div>
    );
  }

  const renderRoleSpecificInformation = () => {
    if (client.role === "OWNER") {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Datos del propietario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Datos bancarios:</strong> {client.bankDetails || "No registrado"}</p>
          </CardContent>
        </Card>
      );
    }

    if (client.role === "TENANT") {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Datos del inquilino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Lugar de trabajo:</strong> {client.workPlace || "No informado"}</p>
            <p><strong>Ingreso mensual:</strong> {client.monthlyIncome ? new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(Number(client.monthlyIncome)) : "No informado"}</p>
            <p><strong>Contacto de emergencia:</strong> {client.emergencyContactName || "No informado"}</p>
            <p><strong>Teléfono emergencia:</strong> {client.emergencyContactPhone || "No informado"}</p>
          </CardContent>
        </Card>
      );
    }

    if (client.role === "BUYER" || client.role === "PROSPECT") {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Tipo de inmueble preferido:</strong> {client.preferredPropertyType || "No informado"}</p>
            <p><strong>Presupuesto máximo:</strong> {client.maxBudget ? new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(Number(client.maxBudget)) : "No informado"}</p>
            <p><strong>Requisito de vivienda:</strong> {client.housingRequirement || "No informado"}</p>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderTenantOperations = () => {
    if (client.role !== "TENANT" || !client.tenantOperations) return null;

    const leases = client.tenantOperations.leases;
    const payments = leases.flatMap((lease) => lease.transactions);
    const paidAmount = payments.reduce((total, payment) => total + payment.amount, 0);

    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Operación del cliente</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contratos, pagos, incidencias y documentos asociados a este inquilino.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3 p-5"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">Contratos</p><p className="text-2xl font-semibold">{leases.length}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><DollarSign className="h-5 w-5 text-emerald-600" /><div><p className="text-sm text-muted-foreground">Pagos registrados</p><p className="text-2xl font-semibold">{payments.length}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><Wrench className="h-5 w-5 text-amber-600" /><div><p className="text-sm text-muted-foreground">Averías</p><p className="text-2xl font-semibold">{client.tenantOperations.propertyIssues.length}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><FileText className="h-5 w-5 text-blue-600" /><div><p className="text-sm text-muted-foreground">Total pagado</p><p className="text-lg font-semibold">{formatCurrency(paidAmount)}</p></div></CardContent></Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Contratos asignados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {leases.length === 0 ? <p className="text-sm text-muted-foreground">No hay contratos asignados.</p> : leases.map((lease) => (
                <Link key={lease.id} href={`/dashboard/contratos/${lease.id}`} className="block rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{lease.contractNumber}</p><p className="text-sm text-muted-foreground">{lease.property.code} · {lease.property.title}</p></div><Badge variant={lease.isActive ? "success" : "outline"}>{lease.isActive ? "Activo" : "Inactivo"}</Badge></div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</span><span>{formatCurrency(lease.monthlyCanonAmount)} / mes</span></div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4" /> Historial de pagos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 ? <p className="text-sm text-muted-foreground">No hay pagos registrados.</p> : payments.slice(0, 6).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{formatCurrency(payment.amount)}</p><p className="text-sm text-muted-foreground">{payment.description || payment.category} · {payment.paymentMethod}</p></div><span className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-3">
            <Link href="/dashboard/clientes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a clientes
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{client.fullName}</h1>
          <p className="mt-1 text-muted-foreground">Expediente CRM del cliente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{roleLabels[client.role] ?? client.role}</Badge>
          <Badge variant={client.riskLevel === "CRITICAL" ? "destructive" : client.riskLevel === "HIGH" ? "secondary" : "outline"}>
            {riskLabels[client.riskLevel] ?? client.riskLevel}
          </Badge>
          <Badge variant="outline">{client.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4" /> Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Documento:</strong> {client.legalDocumentId}</p>
            <p><strong>Estado civil:</strong> {client.maritalStatus ? client.maritalStatus : "No informado"}</p>
            <p><strong>Ciudad:</strong> {client.city || "No informada"}</p>
            <p><strong>Registro:</strong> {formatDate(client.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Phone className="h-4 w-4" /> Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{client.phone}</p>
            {client.alternatePhone && <p>{client.alternatePhone}</p>}
            {client.email ? <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email}</p> : <p>Sin correo</p>}
            <p>{client.address || "Sin dirección"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Riesgo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Resumen:</strong> {client.riskSummary || "Sin resumen"}</p>
            <p><strong>Notas:</strong> {client.notes || "Sin observaciones"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Soportes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Referencias: {client.references.length}</p>
            <p>Comunicaciones: {client.communications.length}</p>
            <p>Documentos de riesgo: {client.riskDocuments.length}</p>
          </CardContent>
        </Card>
      </div>

      {renderRoleSpecificInformation()}
      {renderTenantOperations()}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4" /> Referencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <form onSubmit={handleAddReference} className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</label>
                <select
                  value={referenceForm.referenceType}
                  onChange={(event) => setReferenceForm({ ...referenceForm, referenceType: event.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="LABORAL">Laboral</option>
                  <option value="PROFESSIONAL">Profesional</option>
                </select>
              </div>
              <Input value={referenceForm.fullName} onChange={(event) => setReferenceForm({ ...referenceForm, fullName: event.target.value })} placeholder="Nombre de la referencia" required />
              <Input value={referenceForm.relationship} onChange={(event) => setReferenceForm({ ...referenceForm, relationship: event.target.value })} placeholder="Parentesco o relación" />
              <Input value={referenceForm.company} onChange={(event) => setReferenceForm({ ...referenceForm, company: event.target.value })} placeholder="Empresa" />
              <Input value={referenceForm.phone} onChange={(event) => setReferenceForm({ ...referenceForm, phone: event.target.value })} placeholder="Teléfono" />
              <Input type="email" value={referenceForm.email} onChange={(event) => setReferenceForm({ ...referenceForm, email: event.target.value })} placeholder="Correo" />
              <textarea
                value={referenceForm.notes}
                onChange={(event) => setReferenceForm({ ...referenceForm, notes: event.target.value })}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Observaciones"
              />
              <Button type="submit" className="w-full">Agregar referencia</Button>
            </form>
            {client.references.length === 0 ? (
              <p className="text-muted-foreground">Sin referencias registradas.</p>
            ) : (
              client.references.map((reference) => (
                <div key={reference.id} className="rounded-lg border p-3">
                  <p className="font-medium">{reference.fullName}</p>
                  <p className="text-muted-foreground">{reference.relationship || reference.company || "Referencia"}</p>
                  {reference.phone && <p>{reference.phone}</p>}
                  {reference.email && <p>{reference.email}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Historial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <form onSubmit={handleAddCommunication} className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canal</label>
                <select
                  value={communicationForm.channel}
                  onChange={(event) => setCommunicationForm({ ...communicationForm, channel: event.target.value as typeof communicationForm.channel })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EMAIL">Correo</option>
                  <option value="SMS">SMS</option>
                  <option value="CALL">Llamada</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="MESSAGE">Mensaje</option>
                  <option value="FORMAL_REQUEST">Solicitud formal</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dirección</label>
                <select
                  value={communicationForm.direction}
                  onChange={(event) => setCommunicationForm({ ...communicationForm, direction: event.target.value as typeof communicationForm.direction })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="OUTBOUND">Salida</option>
                  <option value="INBOUND">Entrada</option>
                </select>
              </div>
              <Input value={communicationForm.subject} onChange={(event) => setCommunicationForm({ ...communicationForm, subject: event.target.value })} placeholder="Asunto" />
              <textarea
                value={communicationForm.content}
                onChange={(event) => setCommunicationForm({ ...communicationForm, content: event.target.value })}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Detalle de la comunicación"
                required
              />
              <Input value={communicationForm.relatedRequest} onChange={(event) => setCommunicationForm({ ...communicationForm, relatedRequest: event.target.value })} placeholder="Solicitud relacionada" />
              <Button type="submit" className="w-full">Agregar comunicación</Button>
            </form>
            {client.communications.length === 0 ? (
              <p className="text-muted-foreground">Sin comunicaciones registradas.</p>
            ) : (
              client.communications.map((communication) => (
                <div key={communication.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{communication.subject || communication.channel}</p>
                    <Badge variant="outline">{communication.channel}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{communication.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(communication.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Documentos de riesgo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <form onSubmit={handleAddDocument} className="space-y-3 rounded-lg border p-3">
              <Input value={documentForm.documentType} onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })} placeholder="Tipo de documento" required />
              <Input value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} placeholder="Título" required />
              <Input value={documentForm.fileUrl} onChange={(event) => setDocumentForm({ ...documentForm, fileUrl: event.target.value })} placeholder="URL del archivo" type="url" required />
              <textarea
                value={documentForm.notes}
                onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Notas del documento"
              />
              <Button type="submit" className="w-full">Adjuntar documento</Button>
            </form>
            {client.riskDocuments.length === 0 ? (
              <p className="text-muted-foreground">Sin soportes adjuntos.</p>
            ) : (
              client.riskDocuments.map((document) => (
                <div key={document.id} className="rounded-lg border p-3">
                  <p className="font-medium">{document.title}</p>
                  {document.fileUrl ? (
                    <a href={document.fileUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                      Ver archivo
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Sin archivo</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(document.uploadedAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

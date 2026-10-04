"use client";

import Image from "next/image";
import { useState, useEffect, use, useRef, type PointerEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  FileSignature,
  RefreshCw,
  Loader2,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate, calculateDaysUntil, PAYMENT_CATEGORIES } from "@/lib/utils";
import { getApiError } from "@/lib/api-error";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

interface Lease {
  id: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyCanonAmount: string;
  depositAmount: string;
  reservationAmount: string;
  contractFeeAmount: string;
  contractFileUrl: string | null;
  isActive: boolean;
  createdAt: string;
  property: {
    id: string;
    code: string;
    title: string;
    address: string;
    owner: { id: string; fullName: string; phone: string; email: string | null };
  };
  tenant: {
    id: string;
    fullName: string;
    documentId: string;
    phone: string;
    email: string | null;
    workPlace: string | null;
  };
  transactions: {
    id: string;
    category: string;
    amount: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string | null;
    receiptUrl: string | null;
    description: string | null;
  }[];
  notices: {
    id: string;
    noticeType: string;
    issueDate: string;
    proposedCanonAmount: string | null;
    proposedStartDate: string | null;
    proposedEndDate: string | null;
    documentUrl: string | null;
    notes: string | null;
  }[];
  documents: { id: string; documentName: string; fileUrl: string; uploadedAt: string }[];
  _count: { transactions: number; notices: number };
  balance: {
    rentDue: number;
    paidRent: number;
    debtAmount: number;
    overdueInstallments: number;
    debtDays: number;
    lateFeeAmount: number;
    totalDue: number;
  };
  contractStatus: string;
  renewalMode: string;
  renewalNoticeDays: number;
  priceAdjustmentType: string;
  priceAdjustmentValue: string | null;
  priceAdjustmentIndex: string | null;
  nextAdjustmentDate: string | null;
  guarantorRequired: boolean;
  guarantorName: string | null;
  guarantorDocumentId: string | null;
  guarantorPhone: string | null;
  guarantorEmail: string | null;
  draftContent: string | null;
  signatureProvider: string | null;
  signatureEnvelopeId: string | null;
  signatureStatus: string;
  signatureMethod: string;
  signedBy: string | null;
  signatureHash: string | null;
  signatureData: string | null;
  signatureConsentAt: string | null;
  signedAt: string | null;
  signedIp: string | null;
  template: { id: string; name: string; contractType: string } | null;
  signatureEvents: { id: string; provider: string; eventType: string; status: string; ipAddress: string | null; actorName: string | null; createdAt: string }[];
}

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lease, setLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<{ id: string; name: string; content?: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("default-lease-template");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isLocalSignatureOpen, setIsLocalSignatureOpen] = useState(false);
  const [localSigner, setLocalSigner] = useState({ name: "", role: "", acceptTerms: false });
  const [isSigningLocally, setIsSigningLocally] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const response = await fetch(`/api/leases/${id}`);
        if (response.ok) {
          const data = await response.json();
          setLease(data);
        }
      } catch (error) {
        console.error("Error fetching lease:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLease();
  }, [id]);

  useEffect(() => {
    fetch("/api/contract-templates").then((response) => response.ok ? response.json() : null).then((result) => {
      if (result?.data) setTemplates(result.data);
    }).catch(() => undefined);
  }, []);

  const generateDraft = async () => {
    if (!lease) return;
    setIsGeneratingDraft(true);
    try {
      const response = await fetch(`/api/leases/${lease.id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: selectedTemplate }) });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo generar el borrador").message);
      setLease({ ...lease, draftContent: result.draftContent, contractStatus: result.contractStatus, template: { id: result.template.id, name: result.template.name, contractType: "LEASE" } });
    } catch (error) {
      console.error(error);
    } finally { setIsGeneratingDraft(false); }
  };

  const registerSignatureEvent = async (status: "SENT" | "SIGNED" | "DECLINED") => {
    if (!lease) return;
    const response = await fetch(`/api/leases/${lease.id}/signature`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: lease.signatureProvider || "MANUAL", eventType: status === "SENT" ? "SEND" : status === "SIGNED" ? "SIGN" : "DECLINE", status, actorName: lease.tenant.fullName }) });
    if (response.ok) setLease({ ...lease, signatureStatus: status, contractStatus: status === "SIGNED" ? "ACTIVE" : "PENDING_SIGNATURE", signatureEvents: [await response.json(), ...lease.signatureEvents] });
  };

  const signLocally = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lease || !hasSignatureStroke || !signatureCanvasRef.current) return;
    setIsSigningLocally(true);
    try {
      const signatureData = signatureCanvasRef.current.toDataURL("image/png");
      const response = await fetch(`/api/leases/${lease.id}/signature`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "LOCAL", provider: "LOCAL", eventType: "SIGN", status: "SIGNED", signerName: localSigner.name, signerRole: localSigner.role, acceptTerms: localSigner.acceptTerms, signatureData }) });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiError(result, "No se pudo firmar localmente").message);
      setLease({ ...lease, signatureStatus: "SIGNED", signatureMethod: "LOCAL_CANVAS_SHA256", signatureData, signedBy: result.signedBy, signatureHash: result.signatureHash, signatureConsentAt: result.signedAt, signedAt: result.signedAt, signedIp: result.ipAddress || lease.signedIp, contractStatus: "ACTIVE", signatureEvents: [result, ...lease.signatureEvents] });
      setIsLocalSignatureOpen(false);
      setLocalSigner({ name: "", role: "", acceptTerms: false });
      setHasSignatureStroke(false);
    } catch (error) {
      console.error(error);
    } finally { setIsSigningLocally(false); }
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const beginSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const canvas = signatureCanvasRef.current;
    if (!point || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0b2545";
    canvas.setPointerCapture(event.pointerId);
  };

  const drawSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = getCanvasPoint(event);
    const context = signatureCanvasRef.current?.getContext("2d");
    if (!point || !context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignatureStroke(true);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureStroke(false);
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!lease) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contrato no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/contratos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  const daysLeft = calculateDaysUntil(lease.endDate);
  const paidPercentage = lease.balance.rentDue > 0
    ? Math.min(100, Math.round((lease.balance.paidRent / lease.balance.rentDue) * 100))
    : 0;
  const daysLabel = !lease.isActive
    ? "Contrato vencido"
    : daysLeft < 0
      ? `${Math.abs(daysLeft)} días vencido`
      : `${daysLeft} días restantes`;
  const getCategoryLabel = (category: string) =>
    PAYMENT_CATEGORIES.find((item) => item.value === category)?.label || category;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
        <Button asChild variant="outline" size="icon" className="mt-1 shrink-0 rounded-full">
          <Link href="/dashboard/contratos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">Contrato de alquiler</p>
            <Badge variant={lease.isActive ? "success" : "secondary"}>{lease.isActive ? "Vigente" : "Vencido"}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{lease.contractNumber}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{lease.property.code} · {lease.property.title}</p>
        </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/transacciones?leaseId=${lease.id}`}>
              <Plus className="mr-2 h-4 w-4" />Registrar pago
            </Link>
          </Button>
          {lease.contractFileUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={lease.contractFileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />Ver contrato
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/api/leases/${lease.id}/acta`} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />Acta de entrega
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={lease.balance.debtAmount > 0 ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"}>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Deuda actual</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${lease.balance.debtAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(lease.balance.debtAmount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{lease.balance.overdueInstallments} cuota{lease.balance.overdueInstallments === 1 ? "" : "s"} pendiente{lease.balance.overdueInstallments === 1 ? "e" : "s"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Canon mensual</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(lease.monthlyCanonAmount)}</p>
            {lease.balance.lateFeeAmount > 0 ? (
              <p className="mt-1 text-sm font-medium text-amber-600">Mora: {formatCurrency(lease.balance.lateFeeAmount)}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Vencimiento cada mes</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Estado de pagos</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{paidPercentage}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPercentage}%` }} /></div>
            <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(lease.balance.paidRent)} de {formatCurrency(lease.balance.rentDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Vigencia</p>
            <p className={`mt-2 text-2xl font-semibold ${daysLeft <= 30 ? "text-amber-600" : "text-emerald-600"}`}>{daysLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">Finaliza el {formatDate(lease.endDate)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSignature className="h-4 w-4 text-primary" />Ciclo legal y firma</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Estado legal</p><p className="mt-1 font-semibold">{lease.contractStatus === "PENDING_SIGNATURE" ? "Pendiente de firma" : lease.contractStatus === "IN_REVIEW" ? "En revisión" : lease.contractStatus === "ACTIVE" ? "Activo" : lease.contractStatus === "DRAFT" ? "Borrador" : lease.contractStatus}</p></div>
              <div><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Renovación</p><p className="mt-1 font-semibold">{lease.renewalMode === "AUTOMATIC" ? "Automática" : "Manual"}</p><p className="text-xs text-muted-foreground">Aviso: {lease.renewalNoticeDays} días</p></div>
              <div><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Firma</p><p className="mt-1 font-semibold">{lease.signatureStatus === "SIGNED" ? "Firmado" : lease.signatureStatus === "SENT" ? "Enviado" : lease.signatureStatus === "DECLINED" ? "Rechazado" : "No iniciada"}</p><p className="text-xs text-muted-foreground">{lease.signatureProvider || "Sin proveedor"}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {lease.signatureStatus !== "SIGNED" && <Button type="button" size="sm" variant="outline" onClick={() => registerSignatureEvent("SENT")}><FileSignature className="mr-2 h-4 w-4" />Registrar envío</Button>}
              {lease.signatureStatus !== "SIGNED" && <Button type="button" size="sm" onClick={() => setIsLocalSignatureOpen(true)} disabled={!lease.draftContent}><FileSignature className="mr-2 h-4 w-4" />Firmar localmente</Button>}
              {lease.signatureStatus === "SIGNED" && <Badge variant="success">Firmado {lease.signedAt ? `el ${formatDate(lease.signedAt)}` : ""}</Badge>}
              {lease.signedBy && <span className="self-center text-xs text-muted-foreground">Firmante: {lease.signedBy}</span>}
              {lease.signedIp && <span className="self-center text-xs text-muted-foreground">IP: {lease.signedIp}</span>}
            </div>
            {lease.signatureHash && <div className="border-t pt-4"><p className="text-xs text-muted-foreground">Huella SHA-256 del documento firmado</p><p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{lease.signatureHash}</p></div>}
            {lease.signatureData && <div className="border-t pt-4"><p className="text-xs text-muted-foreground">Firma manuscrita registrada</p><div className="mt-2 overflow-hidden rounded-md border bg-white"><Image src={lease.signatureData} alt={`Firma de ${lease.signedBy || "cliente"}`} width={450} height={110} unoptimized className="h-24 w-full object-contain" /></div></div>}
            {lease.signatureEvents.length > 0 && <div className="space-y-2 border-t pt-4"><p className="text-sm font-medium">Trazabilidad</p>{lease.signatureEvents.slice(0, 4).map((event) => <div key={event.id} className="flex items-center justify-between gap-3 text-xs"><span>{event.eventType} · {event.provider}</span><span className="text-muted-foreground">{formatDate(event.createdAt)}{event.ipAddress ? ` · ${event.ipAddress}` : ""}</span></div>)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="h-4 w-4 text-primary" />Plantilla y borrador</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SearchableSelect
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              placeholder="Seleccionar plantilla"
              searchPlaceholder="Buscar plantilla…"
              clearable
              clearLabel="Sin plantilla"
              options={templates.map((template) => ({ value: template.id, label: template.name }))}
            />
            <Button type="button" className="w-full" onClick={generateDraft} disabled={isGeneratingDraft}>{isGeneratingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Generar borrador</Button>
            {lease.draftContent ? <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">{lease.draftContent}</pre> : <p className="text-sm text-muted-foreground">Genera un borrador para revisar automáticamente los datos del inmueble y las partes.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado de deuda del inquilino</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-sm text-muted-foreground">Deuda actual</p>
            <p className={`text-2xl font-bold ${lease.balance.debtAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatCurrency(lease.balance.debtAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Días con deuda</p>
            <p className="text-2xl font-bold">{lease.balance.debtDays}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cuotas vencidas</p>
            <p className="text-2xl font-bold">{lease.balance.overdueInstallments}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Canon generado</p>
            <p className="text-lg font-semibold">{formatCurrency(lease.balance.rentDue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Canon pagado</p>
            <p className="text-lg font-semibold text-emerald-600">{formatCurrency(lease.balance.paidRent)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Condiciones del contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Depósito de Garantía</p>
                <p className="font-medium">{formatCurrency(lease.depositAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Monto de Reserva</p>
                <p className="font-medium">{formatCurrency(lease.reservationAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Gastos de Contrato</p>
                <p className="font-medium">{formatCurrency(lease.contractFeeAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Reajuste de canon</p>
                <p className="font-medium">{lease.priceAdjustmentType === "NONE" ? "Sin ajuste" : lease.priceAdjustmentType === "FIXED_PERCENT" ? `${lease.priceAdjustmentValue || 0}% fijo` : lease.priceAdjustmentType === "IPC" ? "Según IPC" : `Según ${lease.priceAdjustmentIndex || "índice configurado"}`}</p>
                {lease.nextAdjustmentDate && <p className="text-sm text-muted-foreground">Próximo: {formatDate(lease.nextAdjustmentDate)}</p>}
              </div>
            </div>
            {lease.guarantorRequired && <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Fiador / aval</p><p className="font-medium">{lease.guarantorName || "Pendiente de registrar"}</p><p className="text-sm text-muted-foreground">{lease.guarantorDocumentId || "Sin documento"}</p></div></div>}
            {lease.contractFileUrl && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Archivo del Contrato</p>
                  <a href={lease.contractFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Ver PDF
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personas y ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Inquilino</p>
                <p className="font-medium">{lease.tenant.fullName}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lease.tenant.phone}</span>
                  {lease.tenant.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lease.tenant.email}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Propietario</p>
                <p className="font-medium">{lease.property.owner.fullName}</p>
                <p className="text-sm text-muted-foreground">{lease.property.owner.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Dirección del inmueble</p>
                <p className="font-medium">{lease.property.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {lease.transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lease.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.paymentDate)}</TableCell>
                      <TableCell><span className="font-medium">{getCategoryLabel(t.category)}</span></TableCell>
                      <TableCell>{t.paymentMethod}</TableCell>
                      <TableCell>{t.referenceNumber || "-"}</TableCell>
                      <TableCell>
                        {t.receiptUrl ? (
                          <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                            <ReceiptText className="h-3.5 w-3.5" />Ver
                          </a>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones y Propuestas</CardTitle>
        </CardHeader>
        <CardContent>
          {lease.notices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay notificaciones</p>
          ) : (
            <div className="space-y-3">
              {lease.notices.map((notice) => (
                <div key={notice.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {notice.noticeType === "LEASE_EXPIRATION" ? "Vencimiento de Contrato" :
                         notice.noticeType === "RENOVATION_PROPOSAL" ? "Propuesta de Renovación" :
                         "Notificación a Propietario"}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatDate(notice.issueDate)}</p>
                    </div>
                    {notice.documentUrl && (
                      <a href={notice.documentUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">Ver documento</Button>
                      </a>
                    )}
                  </div>
                  {notice.proposedCanonAmount && (
                    <p className="text-sm mt-2">Canon propuesto: {formatCurrency(notice.proposedCanonAmount)}</p>
                  )}
                  {notice.notes && <p className="text-sm text-muted-foreground mt-1">{notice.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isLocalSignatureOpen} onOpenChange={(open) => { setIsLocalSignatureOpen(open); if (!open) clearSignature(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Firmar contrato localmente</DialogTitle>
          </DialogHeader>
          <form onSubmit={signLocally} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Se generará una huella SHA-256 del borrador actual junto con el firmante, fecha, hora e IP de esta sesión. Esta firma queda registrada dentro del sistema y no sustituye un certificado digital cualificado externo.
            </div>
            <div className="space-y-2"><Label htmlFor="local-signer-name">Nombre del firmante *</Label><Input id="local-signer-name" required value={localSigner.name} onChange={(event) => setLocalSigner({ ...localSigner, name: event.target.value })} placeholder="Nombre completo" /></div>
            <div className="space-y-2"><Label htmlFor="local-signer-role">Rol</Label><Input id="local-signer-role" value={localSigner.role} onChange={(event) => setLocalSigner({ ...localSigner, role: event.target.value })} placeholder="Inquilino, propietario, representante..." /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="local-signature-canvas">Firma manuscrita *</Label><Button type="button" variant="ghost" size="sm" onClick={clearSignature}>Borrar</Button></div>
              <div className="overflow-hidden rounded-lg border bg-white">
                <canvas ref={signatureCanvasRef} id="local-signature-canvas" width={900} height={220} onPointerDown={beginSignature} onPointerMove={drawSignature} className="h-44 w-full touch-none cursor-crosshair" aria-label="Área para dibujar la firma" />
              </div>
              <p className="text-xs text-muted-foreground">Firma con el mouse, el dedo o un lápiz digital.</p>
            </div>
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" required checked={localSigner.acceptTerms} onChange={(event) => setLocalSigner({ ...localSigner, acceptTerms: event.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" /><span>Confirmo que he revisado el borrador y autorizo registrar esta firma electrónica local.</span></label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsLocalSignatureOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSigningLocally || !hasSignatureStroke}>{isSigningLocally && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar firma</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
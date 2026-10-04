"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_CATEGORIES } from "@/lib/utils";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboard";
import { downloadCsv, toCsv } from "@/lib/csv";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import {
  ContractsPanel,
  FinancePanel,
  OperationsPanel,
  PipelinePanel,
  PortfolioPanel,
  SectionHeading,
  SettlementsPanel,
} from "@/components/dashboard/panels";
import {
  CONTRACT_STATUS_LABELS,
  ISSUE_STATUS_LABELS,
  PAYMENT_CATEGORY_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/components/dashboard/labels";
import type { DashboardData } from "@/components/dashboard/types";
import { ArrowUpRight, Calendar, Clock, Download, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { CardGridSkeleton, ListSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<DashboardRange>("6m");
  const [currency, setCurrency] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [relativeLabel, setRelativeLabel] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((key) => key + 1), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data) return;
    const update = () => setRelativeLabel(relativeTime(data.generatedAt));
    update();
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    const params = new URLSearchParams({ range });
    if (currency) params.set("currency", currency);
    fetch(`/api/dashboard?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result: DashboardData | null) => {
        if (!isCurrent || !result) return;
        setData(result);
        if (!currency && result.primaryCurrency) setCurrency(result.primaryCurrency);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [range, currency, refreshKey]);

  const categoryLabel = (category: string) =>
    PAYMENT_CATEGORIES.find((item) => item.value === category)?.label || PAYMENT_CATEGORY_LABELS[category] || category;

  const handleExport = useCallback(() => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Dashboard", "Rango", data.range, "Moneda", data.primaryCurrency, "Generado", formatDate(data.generatedAt)],
      [],
      ["Indicador", "Valor"],
      ["Propietarios", data.stats.owners],
      ["Inquilinos", data.stats.tenants],
      ["Prospectos/Compradores", data.stats.prospects],
      ["Inmuebles", data.stats.properties],
      ["Inmuebles disponibles", data.stats.availableProperties],
      ["Contratos activos", data.stats.activeLeases],
      ["Contratos por vencer", data.stats.expiringLeases],
      ["Averías abiertas", data.stats.pendingIssues],
      ["Ingresos del período", data.comparison.income.current],
      ["Cobranza del período (%)", data.finance.collection.rate],
      ["Deuda acumulada", data.finance.debtAging.total],
      [],
      ["Flujo de caja", "Ingresos", "Gastos", "Neto"],
      ...data.finance.cashflow.map((row) => [row.month, row.income, row.expenses, row.net]),
      [],
      ["Ingresos por categoría", "Total"],
      ...data.finance.incomeByCategory.map((row) => [categoryLabel(row.key), row.total]),
      [],
      ["Mayores deudores", "Contrato", "Inmueble", "Monto", "Días"],
      ...data.finance.topDebtors.map((row) => [row.tenant, row.contractNumber, row.property, row.amount, row.days]),
      [],
      ["Cartera por estado", "Cantidad"],
      ...data.portfolio.byStatus.map((row) => [PROPERTY_STATUS_LABELS[row.key] ?? row.key, row.count]),
      ["Cartera por tipo", "Cantidad"],
      ...data.portfolio.byType.map((row) => [PROPERTY_TYPE_LABELS[row.key] ?? row.key, row.count]),
      [],
      ["Embudo", "Cantidad"],
      ...data.pipeline.funnel.map((row) => [row.label, row.count]),
      [],
      ["Contratos nuevos", "Cantidad"],
      ...data.contracts.newByMonth.map((row) => [row.month, row.count]),
      ["Contratos finalizados", "Cantidad"],
      ...data.contracts.terminatedByMonth.map((row) => [row.month, row.count]),
      [],
      ["Contratos por estado", "Cantidad"],
      ...data.contracts.byStatus.map((row) => [CONTRACT_STATUS_LABELS[row.key] ?? row.key, row.count]),
      [],
      ["Averías por estado", "Cantidad"],
      ...data.operations.issues.byStatus.map((row) => [ISSUE_STATUS_LABELS[row.key] ?? row.key, row.count]),
      [],
      ["Liquidaciones", "Valor"],
      ["Pendientes", data.settlements.pending],
      ["Por pagar", data.settlements.pendingPayout],
      ["Pagado en el período", data.settlements.paidThisPeriod],
      ["Comisión de agencia", data.settlements.agencyCommission],
    ];
    downloadCsv(`dashboard-${data.range}-${data.primaryCurrency}.csv`, toCsv(rows));
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Gestión de cartera</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Resumen general del sistema inmobiliario</p>
          </div>
        </div>
        <StatCardsSkeleton count={8} />
        <CardGridSkeleton items={3} />
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Gestión de cartera</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Flujo operativo y financiero · actualizado {relativeLabel || formatDate(data.generatedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1" role="group" aria-label="Rango temporal">
            {DASHBOARD_RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                aria-pressed={range === option.value}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  range === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.value.toUpperCase()}
              </button>
            ))}
          </div>

          {data.availableCurrencies.length > 1 && (
            <select
              aria-label="Moneda"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-9 rounded-lg border border-border/60 bg-background px-2.5 text-sm"
            >
              {data.availableCurrencies.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}

          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Actualizar"
            disabled={isLoading}
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <KpiCards data={data} />

      <section className="space-y-4" aria-label="Cartera">
        <SectionHeading eyebrow="Cartera" title="Ocupación, canon y distribución" />
        <PortfolioPanel data={data} />
      </section>

      <section className="space-y-4" aria-label="Flujo financiero">
        <SectionHeading eyebrow="Financiero" title="Flujo de caja, cobranza y mora" />
        <FinancePanel data={data} />
      </section>

      <section className="space-y-4" aria-label="Pipeline comercial">
        <SectionHeading eyebrow="Comercial" title="Embudo de captación a contrato" />
        <PipelinePanel data={data} />
      </section>

      <section className="space-y-4" aria-label="Contratos">
        <SectionHeading eyebrow="Contratos" title="Altas, renovaciones y ajustes" />
        <ContractsPanel data={data} />
      </section>

      <section className="space-y-4" aria-label="Operaciones">
        <SectionHeading eyebrow="Operaciones" title="Averías y mantenimiento" />
        <OperationsPanel data={data} />
      </section>

      <section className="space-y-4" aria-label="Liquidaciones">
        <SectionHeading eyebrow="Liquidaciones" title="Pagos a propietarios y comisiones" />
        <SettlementsPanel data={data} />
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 border-border/60 shadow-card md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Últimos movimientos de la cartera</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/dashboard/transacciones">
                Ver todas
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentTransactions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">Sin movimientos registrados.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{transaction.description || categoryLabel(transaction.category)}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {transaction.property.code}
                          <span aria-hidden="true">·</span>
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatDate(transaction.paymentDate)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(transaction.amount, transaction.currency)}</p>
                      <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border/60 shadow-card md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Rentabilidad por inmueble</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Ingresos menos gastos registrados</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {data.analytics.propertyPerformance.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin datos de rentabilidad</p>
            ) : (
              <div className="space-y-2">
                {data.analytics.propertyPerformance.slice(0, 6).map((row) => (
                  <Link
                    key={row.propertyId}
                    href={`/dashboard/inmuebles/${row.propertyId}`}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.code} · {row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Ingresos {formatCurrency(row.income, row.currency)} · Gastos {formatCurrency(row.expenses, row.currency)}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-sm font-semibold tabular-nums", row.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {formatCurrency(row.net, row.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { DeltaBadge } from "./delta-badge";
import {
  CashflowChart,
  BreakdownBarChart,
  ContractsChart,
  MiniBars,
  CHART_COLORS,
} from "./charts";
import {
  CONTRACT_STATUS_LABELS,
  INTEREST_STATUS_LABELS,
  ISSUE_STATUS_LABELS,
  PAYMENT_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  VISIT_STATUS_LABELS,
} from "./labels";
import type { DashboardData } from "./types";

export function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-xl font-semibold tabular-nums", accent)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProgressBar({ value, color = CHART_COLORS.emerald }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
    </div>
  );
}

export function PortfolioPanel({ data }: { data: DashboardData }) {
  const { occupancy, rentRollByCurrency, avgCanon, byStatus, byType, byCity } = data.portfolio;
  const currency = data.primaryCurrency;
  const rentRoll = rentRollByCurrency.find((row) => row.currency === currency)?.total ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Ocupación de cartera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Ocupación" value={`${occupancy.occupancyRate}%`} accent="text-emerald-600" />
            <Metric label="Vacancia" value={`${occupancy.vacancyRate}%`} accent="text-amber-600" />
          </div>
          <ProgressBar value={occupancy.occupancyRate} />
          <p className="text-xs text-muted-foreground">
            {occupancy.occupied} de {occupancy.total} inmuebles con contrato activo · {occupancy.available} disponibles
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Días en mercado" value={String(occupancy.avgDaysOnMarket)} hint="Promedio hasta 1er contrato" />
            <Metric label="Canon promedio" value={formatCurrency(avgCanon, currency)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Canon mensual (rent roll)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-semibold tabular-nums">{formatCurrency(rentRoll, currency)}</p>
          {rentRollByCurrency.length > 1 && (
            <div className="space-y-1.5">
              {rentRollByCurrency.map((row) => (
                <div key={row.currency} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.currency}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(row.total, row.currency)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Por tipo de inmueble</p>
            <MiniBars data={byType} labelMap={PROPERTY_TYPE_LABELS} color={CHART_COLORS.violet} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Distribución de cartera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Por estado</p>
            <MiniBars data={byStatus} labelMap={PROPERTY_STATUS_LABELS} color={CHART_COLORS.emerald} />
          </div>
          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Por ciudad</p>
            <MiniBars data={byCity} labelMap={{}} color={CHART_COLORS.sky} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FinancePanel({ data }: { data: DashboardData }) {
  const { cashflow, collection, incomeByCategory, incomeByMethod, incomeByCurrency, debtAging, topDebtors } = data.finance;
  const currency = data.primaryCurrency;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Flujo de caja</CardTitle>
            <span className="text-xs text-muted-foreground">{currency}</span>
          </CardHeader>
          <CardContent>
            <CashflowChart data={cashflow} currency={currency} />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Cobranza del período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-2">
              <p className="text-3xl font-semibold tabular-nums">{collection.rate}%</p>
              <DeltaBadge deltaPct={collection.deltaPct} />
            </div>
            <ProgressBar value={collection.rate} color={collection.rate >= 80 ? CHART_COLORS.emerald : collection.rate >= 50 ? CHART_COLORS.amber : CHART_COLORS.red} />
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cobrado</span>
                <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(collection.collected, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Devengado</span>
                <span className="font-medium tabular-nums">{formatCurrency(collection.expected, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Período anterior</span>
                <span className="tabular-nums">{collection.previousRate}%</span>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Deuda acumulada</p>
              <p className="text-xl font-semibold tabular-nums text-red-600">{formatCurrency(debtAging.total, currency)}</p>
              {debtAging.byCurrency.length > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {debtAging.byCurrency.map((row) => `${row.currency} ${formatCurrency(row.total, row.currency)}`).join(" · ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/60 shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ingresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart data={incomeByCategory} labelMap={PAYMENT_CATEGORY_LABELS} currency={currency} />
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Por método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart data={incomeByMethod} labelMap={PAYMENT_METHOD_LABELS} currency={currency} />
            {incomeByCurrency.length > 1 && (
              <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Por moneda</p>
                {incomeByCurrency.map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{row.key}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(row.total, row.key)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Mora por antigüedad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              { label: "Hasta 30 días", value: debtAging.buckets.days30 },
              { label: "31-60 días", value: debtAging.buckets.days60 },
              { label: "61-90 días", value: debtAging.buckets.days90 },
              { label: "+90 días", value: debtAging.buckets.over90, danger: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-medium tabular-nums", row.danger && "text-red-600")}>{formatCurrency(row.value, currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Mayores deudores</CardTitle>
          <Link href="/dashboard/contratos" className="text-xs font-medium text-primary hover:underline">Ver contratos</Link>
        </CardHeader>
        <CardContent className="p-0">
          {topDebtors.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Sin deudas pendientes registradas.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {topDebtors.map((debtor) => (
                <Link
                  key={debtor.leaseId}
                  href={`/dashboard/contratos/${debtor.leaseId}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{debtor.tenant}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {debtor.contractNumber} · {debtor.property}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-red-600">{formatCurrency(debtor.amount, debtor.currency)}</p>
                    <p className="text-xs text-muted-foreground">{debtor.days} días</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PipelinePanel({ data }: { data: DashboardData }) {
  const { funnel, conversion, visits, reservations, interestsByStatus } = data.pipeline;
  const max = Math.max(...funnel.map((step) => step.count), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 shadow-card lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Embudo comercial del período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {funnel.map((step, index) => (
            <div key={step.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {step.count}
                  {index > 0 && <span className="ml-2 text-xs text-primary">{conversion[index - 1]}% conv.</span>}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(step.count / max) * 100}%`,
                    backgroundColor: [CHART_COLORS.sky, CHART_COLORS.violet, CHART_COLORS.amber, CHART_COLORS.emerald][index] ?? CHART_COLORS.primary,
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Conversión calculada sobre los registros creados en el rango seleccionado.</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Actividad comercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Visitas próximas" value={String(visits.upcoming)} />
            <Metric label="Reservas próximas" value={String(reservations.upcoming)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Interesados por estado</p>
            <MiniBars
              data={Object.entries(interestsByStatus).map(([key, count]) => ({ key, count }))}
              labelMap={INTEREST_STATUS_LABELS}
              color={CHART_COLORS.sky}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Visitas por estado</p>
            <MiniBars
              data={Object.entries(visits.byStatus).map(([key, count]) => ({ key, count }))}
              labelMap={VISIT_STATUS_LABELS}
              color={CHART_COLORS.violet}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Reservas por estado</p>
            <MiniBars
              data={Object.entries(reservations.byStatus).map(([key, count]) => ({ key, count }))}
              labelMap={RESERVATION_STATUS_LABELS}
              color={CHART_COLORS.amber}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ContractsPanel({ data }: { data: DashboardData }) {
  const { newByMonth, terminatedByMonth, byStatus, upcomingRenewals, upcomingAdjustments, avgCanonByType, avgDurationMonths } = data.contracts;
  const currency = data.primaryCurrency;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Contratos nuevos vs. finalizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractsChart newByMonth={newByMonth} terminatedByMonth={terminatedByMonth} />
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Estado de contratos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric label="Duración media" value={`${avgDurationMonths} meses`} />
            <MiniBars data={byStatus} labelMap={CONTRACT_STATUS_LABELS} color={CHART_COLORS.primary} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Canon promedio por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {avgCanonByType.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Sin contratos activos.</p>
            ) : (
              avgCanonByType.map((row) => (
                <div key={row.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{PROPERTY_TYPE_LABELS[row.key] ?? row.key}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(row.avgCanon, currency)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Renovaciones próximas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRenewals.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Sin contratos por renovar.</p>
            ) : (
              upcomingRenewals.map((lease) => (
                <Link
                  key={lease.id}
                  href={`/dashboard/contratos/${lease.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lease.property.code} · {lease.tenant}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(lease.endDate)} · {formatCurrency(lease.canon, lease.currency)}</p>
                  </div>
                  <Badge variant={lease.daysLeft <= 15 ? "destructive" : "warning"}>{lease.daysLeft} días</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ajustes de canon próximos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAdjustments.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Sin ajustes programados.</p>
            ) : (
              upcomingAdjustments.map((adjustment) => (
                <Link
                  key={adjustment.id}
                  href={`/dashboard/contratos/${adjustment.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{adjustment.contractNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{adjustment.property}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium">{formatDate(adjustment.nextAdjustmentDate)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(adjustment.canon, adjustment.currency)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function OperationsPanel({ data }: { data: DashboardData }) {
  const { issues, maintenance } = data.operations;
  const currency = data.primaryCurrency;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Averías</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Abiertas" value={String(issues.open)} accent="text-red-600" />
            <Metric label="Resueltas" value={String(issues.resolved)} accent="text-emerald-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Tiempo medio" value={`${issues.avgResolutionDays} días`} />
            <Metric label="Costo total" value={formatCurrency(issues.totalRepairCost, currency)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Por estado</p>
            <MiniBars data={issues.byStatus} labelMap={ISSUE_STATUS_LABELS} color={CHART_COLORS.red} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Tipos de avería más frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBars data={issues.byType} labelMap={{}} color={CHART_COLORS.amber} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Mantenimiento y tareas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Planes activos" value={String(maintenance.activePlans)} />
            <Metric label="Cumplimiento" value={`${maintenance.complianceRate}%`} accent="text-emerald-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Tareas vencidas" value={String(maintenance.overdueTasks)} accent={maintenance.overdueTasks > 0 ? "text-red-600" : undefined} />
            <Metric label="Próximas 30 días" value={String(maintenance.upcomingTasks)} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Cumplimiento de tareas</span>
              <span>{maintenance.completedTasks} completadas</span>
            </div>
            <ProgressBar value={maintenance.complianceRate} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettlementsPanel({ data }: { data: DashboardData }) {
  const { settlements } = data;
  const currency = settlements.currency;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Liquidaciones pendientes" value={String(settlements.pending)} hint="Borrador o emitidas" />
      <Metric label="Por pagar a propietarios" value={formatCurrency(settlements.pendingPayout, currency)} accent="text-amber-600" />
      <Metric label="Pagado en el período" value={formatCurrency(settlements.paidThisPeriod, currency)} accent="text-emerald-600" />
      <Metric label="Comisión de agencia" value={formatCurrency(settlements.agencyCommission, currency)} hint={`Tasa media ${settlements.avgCommissionRate}%`} />
    </div>
  );
}

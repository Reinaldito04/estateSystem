"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { AlertTriangle, Building2, FileText, Gauge, Home, Users, Wallet, type LucideIcon } from "lucide-react";
import { DeltaBadge } from "./delta-badge";
import type { ComparisonMetric, DashboardData } from "./types";

type Kpi = {
  name: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  href: string;
  delta?: ComparisonMetric;
  betterWhenDown?: boolean;
};

export function KpiCards({ data }: { data: DashboardData }) {
  const currency = data.primaryCurrency;
  const { comparison, finance, settlements } = data;

  const kpis: Kpi[] = [
    {
      name: "Propietarios",
      value: String(data.stats.owners),
      hint: "Cartera registrada",
      icon: Users,
      color: "text-blue-600 bg-blue-500/10",
      href: "/dashboard/propietarios",
    },
    {
      name: "Inquilinos",
      value: String(data.stats.tenants),
      hint: `${data.stats.prospects} prospectos/compradores`,
      icon: Building2,
      color: "text-emerald-600 bg-emerald-500/10",
      href: "/dashboard/clientes",
    },
    {
      name: "Inmuebles",
      value: String(data.stats.properties),
      hint: `${data.stats.availableProperties} disponibles`,
      icon: Home,
      color: "text-violet-600 bg-violet-500/10",
      href: "/dashboard/inmuebles",
    },
    {
      name: "Contratos activos",
      value: String(data.stats.activeLeases),
      hint: `${data.stats.expiringLeases} por vencer`,
      icon: FileText,
      color: "text-amber-600 bg-amber-500/10",
      href: "/dashboard/contratos",
      delta: comparison.activeLeases,
    },
    {
      name: "Ingresos del período",
      value: formatCurrency(comparison.income.current, currency),
      hint: `${comparison.newContracts.current} contratos nuevos`,
      icon: Wallet,
      color: "text-sky-600 bg-sky-500/10",
      href: "/dashboard/transacciones",
      delta: comparison.income,
    },
    {
      name: "Cobranza del período",
      value: `${finance.collection.rate}%`,
      hint: `${formatCurrency(finance.collection.collected, currency)} de ${formatCurrency(finance.collection.expected, currency)}`,
      icon: Gauge,
      color: "text-emerald-600 bg-emerald-500/10",
      href: "/dashboard/transacciones",
      delta: comparison.collected,
    },
    {
      name: "Deuda acumulada",
      value: formatCurrency(data.finance.debtAging.total, currency),
      hint: "Canon vencido pendiente",
      icon: AlertTriangle,
      color: "text-red-600 bg-red-500/10",
      href: "/dashboard/contratos",
    },
    {
      name: "Comisión de agencia",
      value: formatCurrency(settlements.agencyCommission, currency),
      hint: `Tasa media ${settlements.avgCommissionRate}%`,
      icon: Wallet,
      color: "text-violet-600 bg-violet-500/10",
      href: "/dashboard/estados-cuenta",
      delta: comparison.agencyCommission,
    },
  ];

  return (
    <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Link key={kpi.name} href={kpi.href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="h-full border-border/60 bg-card shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-card-hover">
              <CardContent className="flex h-full min-h-[7.5rem] flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-medium text-muted-foreground">{kpi.name}</p>
                  <span className={cn("rounded-lg p-2.5", kpi.color)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <p className="mt-2 text-[1.5rem] font-semibold leading-none tabular-nums tracking-tight">{kpi.value}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">{kpi.hint}</p>
                    {kpi.delta && <DeltaBadge deltaPct={kpi.delta.deltaPct} betterWhenDown={kpi.betterWhenDown} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}

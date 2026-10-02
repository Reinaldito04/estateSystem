"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  Home,
  FileText,
  DollarSign,
  AlertTriangle,
  Calendar,
  Building2,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_CATEGORIES, PAYMENT_STATUSES } from "@/lib/utils";
import { ListSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";

type Stat = {
  name: string;
  value: string;
  change: string;
  icon: typeof Users;
  color: string;
  href: string;
};

type DashboardData = {
  stats: {
    owners: number;
    tenants: number;
    properties: number;
    availableProperties: number;
    activeLeases: number;
    pendingIssues: number;
    expiringLeases: number;
    monthIncomeByCurrency: { currency: string; total: number }[];
  };
  recentTransactions: {
    id: string;
    category: string;
    amount: string;
    currency: string;
    status: string;
    description: string | null;
    paymentDate: string;
    property: { code: string; title: string };
  }[];
  upcomingExpirations: {
    id: string;
    contractNumber: string;
    property: { code: string; title: string };
    tenant: string;
    endDate: string;
    daysLeft: number;
    canon: string;
    currency: string;
  }[];
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <Link href={stat.href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className="h-full border-border/60 bg-card shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-card-hover">
        <CardContent className="flex h-full min-h-[9.5rem] flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-muted-foreground">{stat.name}</p>
            <span className={cn("rounded-lg p-2.5", stat.color)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="mt-3 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight">{stat.value}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              {stat.change}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) setData(await response.json());
      } catch (error) {
        console.error("Error loading dashboard:", error);
      }
    };
    load();
  }, []);

  const categoryLabel = (category: string) =>
    PAYMENT_CATEGORIES.find((item) => item.value === category)?.label || category;

  const statusLabel = (status: string) =>
    PAYMENT_STATUSES.find((item) => item.value === status)?.label || status;

  const stats: Stat[] = data
    ? [
        { name: "Propietarios", value: String(data.stats.owners), change: "Cartera registrada", icon: Users, color: "text-blue-600 bg-blue-500/10", href: "/dashboard/propietarios" },
        { name: "Clientes inquilinos", value: String(data.stats.tenants), change: "Cartera registrada", icon: Building2, color: "text-emerald-600 bg-emerald-500/10", href: "/dashboard/clientes" },
        { name: "Inmuebles", value: String(data.stats.properties), change: `${data.stats.availableProperties} disponibles`, icon: Home, color: "text-violet-600 bg-violet-500/10", href: "/dashboard/inmuebles" },
        { name: "Contratos Vigentes", value: String(data.stats.activeLeases), change: `${data.stats.expiringLeases} por vencer`, icon: FileText, color: "text-amber-600 bg-amber-500/10", href: "/dashboard/contratos" },
        {
          name: "Ingresos Mes",
          value: data.stats.monthIncomeByCurrency.length > 0
            ? data.stats.monthIncomeByCurrency.map((row) => formatCurrency(row.total, row.currency)).join(" · ")
            : formatCurrency(0),
          change: "Pagos del mes en curso",
          icon: DollarSign,
          color: "text-emerald-600 bg-emerald-500/10",
          href: "/dashboard/transacciones",
        },
        { name: "Averías Pendientes", value: String(data.stats.pendingIssues), change: "Reportadas o en proceso", icon: AlertTriangle, color: "text-red-600 bg-red-500/10", href: "/dashboard/averias" },
      ]
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Gestión de cartera</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Resumen general del sistema inmobiliario</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/dashboard/propietarios">
              <Users className="h-4 w-4" aria-hidden="true" />
              Propietarios
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/inmuebles">
              <Home className="h-4 w-4" aria-hidden="true" />
              Inmuebles
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data ? (
          stats.map((stat) => <StatCard key={stat.name} stat={stat} />)
        ) : (
          <StatCardsSkeleton count={6} className="sm:col-span-2 xl:col-span-3" />
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 border-border/60 shadow-card">
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
            <div className="divide-y divide-border/60">
              {!data ? (
                <ListSkeleton items={4} className="px-5 py-4 sm:px-6" />
              ) : data.recentTransactions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">Sin movimientos registrados.</p>
              ) : (
                data.recentTransactions.map((transaction) => (
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
                        {statusLabel(transaction.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-border/60 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Contratos por vencer</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Según días de aviso por contrato</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link href="/dashboard/contratos">
                Ver todas
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {!data ? (
                <ListSkeleton items={3} className="pt-2" />
              ) : data.upcomingExpirations.length === 0 ? (
                <p className="py-3.5 text-sm text-muted-foreground">Sin contratos próximos a vencer.</p>
              ) : (
                data.upcomingExpirations.map((contract, index) => (
                  <div key={contract.id} className={cn("flex items-center justify-between gap-3 py-3.5", index === 0 && "pt-4", index === data.upcomingExpirations.length - 1 && "pb-0")}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {contract.property.code} <span className="text-muted-foreground">·</span> {contract.tenant}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Canon: {formatCurrency(contract.canon, contract.currency)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-sm font-semibold tabular-nums", contract.daysLeft <= 15 ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
                        {contract.daysLeft} días
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Vence: {formatDate(contract.endDate)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

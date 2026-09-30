"use client";

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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const stats = [
  {
    name: "Propietarios",
    value: "24",
    change: "+2 este mes",
    icon: Users,
    color: "text-blue-600 bg-blue-100",
    href: "/dashboard/propietarios",
  },
  {
    name: "Inquilinos",
    value: "38",
    change: "+5 este mes",
    icon: Building2,
    color: "text-green-600 bg-green-100",
    href: "/dashboard/inquilinos",
  },
  {
    name: "Inmuebles",
    value: "42",
    change: "3 disponibles",
    icon: Home,
    color: "text-purple-600 bg-purple-100",
    href: "/dashboard/inmuebles",
  },
  {
    name: "Contratos Vigentes",
    value: "35",
    change: "5 por vencer",
    icon: FileText,
    color: "text-orange-600 bg-orange-100",
    href: "/dashboard/contratos",
  },
  {
    name: "Ingresos Mes",
    value: formatCurrency(45000),
    change: "+12% vs mes anterior",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-100",
    href: "/dashboard/transacciones",
  },
  {
    name: "Averías Pendientes",
    value: "7",
    change: "2 urgentes",
    icon: AlertTriangle,
    color: "text-red-600 bg-red-100",
    href: "/dashboard/averias",
  },
];

const recentActivity = [
  { id: 1, type: "Pago", description: "Canon alquiler - Inmueble C-001", amount: "$850", date: "Hoy", status: "Completado" },
  { id: 2, type: "Contrato", description: "Nuevo contrato - Inmueble C-005", amount: "$1,200", date: "Ayer", status: "Pendiente" },
  { id: 3, type: "Avería", description: "Fuga de agua - Inmueble C-012", amount: "$0", date: "Ayer", status: "En proceso" },
  { id: 4, type: "Pago", description: "Condominio - Inmueble C-003", amount: "$150", date: "Hace 2 días", status: "Completado" },
  { id: 5, type: "Documento", description: "Cédula propietario - Inmueble C-008", amount: "$0", date: "Hace 3 días", status: "Subido" },
];

const upcomingExpirations = [
  { property: "C-001", tenant: "Juan Pérez", endDate: "2026-10-15", daysLeft: 16, canon: "$850" },
  { property: "C-005", tenant: "María González", endDate: "2026-10-20", daysLeft: 21, canon: "$1,200" },
  { property: "C-012", tenant: "Carlos Rodríguez", endDate: "2026-10-25", daysLeft: 26, canon: "$950" },
  { property: "C-003", tenant: "Ana Martínez", endDate: "2026-11-01", daysLeft: 33, canon: "$1,100" },
  { property: "C-008", tenant: "Luis Fernández", endDate: "2026-11-10", daysLeft: 42, canon: "$780" },
];

const activityStatusStyles: Record<string, string> = {
  Completado: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Pendiente: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "En proceso": "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  Subido: "bg-muted text-muted-foreground",
};

function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  const Icon = stat.icon;
  return (
    <Link href={stat.href} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className="h-full border-transparent shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-border group-hover:shadow-md">
        <CardContent className="flex h-full min-h-36 flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-muted-foreground">{stat.name}</p>
            <span className={cn("rounded-md p-2.5", stat.color)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="mt-2 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.change}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Gestión de cartera</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">Dashboard</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Resumen general del sistema inmobiliario</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2">
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

      <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Últimos movimientos de la cartera</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transacciones">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activity.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.type} <span aria-hidden="true">·</span> {activity.date}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{activity.amount}</p>
                    <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", activityStatusStyles[activity.status])}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base font-semibold">Contratos por vencer</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Próximos 30 días</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/contratos">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {upcomingExpirations.map((contract, index) => (
                <div key={contract.property} className={cn("flex items-center justify-between gap-3 py-3", index === 0 && "pt-0", index === upcomingExpirations.length - 1 && "pb-0")}>
                  <div>
                    <p className="text-sm font-medium">{contract.property} <span className="text-muted-foreground">·</span> {contract.tenant}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Canon: {contract.canon}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", contract.daysLeft <= 15 ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
                      {contract.daysLeft} días
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Vence: {new Date(contract.endDate).toLocaleDateString("es-VE")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
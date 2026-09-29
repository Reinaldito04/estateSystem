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
  TrendingUp,
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

function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  const Icon = stat.icon;
  return (
    <Link href={stat.href} className="block">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
            <div className={cn("p-3 rounded-full", stat.color)}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen general del sistema inmobiliario</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/propietarios/nuevo">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Nuevo Propietario
              </span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/inmuebles/nuevo">
              <span className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Nuevo Inmueble
              </span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transacciones">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">{activity.type} • {activity.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{activity.amount}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{activity.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Contratos por Vencer (30 días)</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/contratos">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingExpirations.map((contract) => (
                <div key={contract.property} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{contract.property} - {contract.tenant}</p>
                    <p className="text-sm text-muted-foreground">Canon: {contract.canon}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${contract.daysLeft <= 15 ? "text-destructive" : "text-warning"}`}>
                      {contract.daysLeft} días
                    </p>
                    <p className="text-xs text-muted-foreground">Vence: {new Date(contract.endDate).toLocaleDateString("es-VE")}</p>
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
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  FileText,
  DollarSign,
  Wrench,
  Calculator,
  FolderOpen,
  LayoutDashboard,
  Building2,
  User,
  Building,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Propietarios", href: "/dashboard/propietarios", icon: Users },
  { name: "Inquilinos", href: "/dashboard/inquilinos", icon: User },
  { name: "Inmuebles", href: "/dashboard/inmuebles", icon: Building2 },
  { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
  { name: "Transacciones", href: "/dashboard/transacciones", icon: DollarSign },
  { name: "Averías", href: "/dashboard/averias", icon: Wrench },
  { name: "Estados de Cuenta", href: "/dashboard/estados-cuenta", icon: Calculator },
  { name: "Documentos", href: "/dashboard/documentos", icon: FolderOpen },
  { name: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
];

export function Sidebar({
  mobileMenuOpen,
  onNavigate,
}: {
  mobileMenuOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r border-white/10 bg-[#17352F] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-20 shrink-0 items-center border-b border-white/10 px-5">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B9E5C6] text-[#17352F]">
            <Building className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold leading-tight">Inmobiliaria</span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">Sistema de gestión</span>
        </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" aria-label="Secciones">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Espacio de trabajo</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-[#B9E5C6] text-[#17352F] shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-12 w-full justify-start gap-3 px-3 text-white hover:bg-white/10 hover:text-white">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#B9E5C6] text-[#17352F]">AD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate">Admin User</span>
                  <span className="text-xs text-white/55">Administrador</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </aside>
  );
}
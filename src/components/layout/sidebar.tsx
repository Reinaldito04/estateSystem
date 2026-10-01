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
  CalendarDays,
  HardHat,
  ChevronDown,
  Sparkles,
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
import { useState } from "react";

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const managementNavigation = [
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Propietarios", href: "/dashboard/propietarios", icon: Users },
  { name: "Inmuebles", href: "/dashboard/inmuebles", icon: Building2 },
  { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
];

const financialNavigation = [
  { name: "Transacciones", href: "/dashboard/transacciones", icon: DollarSign },
  { name: "Estados de Cuenta", href: "/dashboard/estados-cuenta", icon: Calculator },
];

const operationalNavigation = [
  { name: "Calendario", href: "/dashboard/calendario", icon: CalendarDays },
  { name: "Averías", href: "/dashboard/averias", icon: Wrench },
  { name: "Proveedores", href: "/dashboard/proveedores", icon: HardHat },
  { name: "Documentos", href: "/dashboard/documentos", icon: FolderOpen },
  { name: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
];

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

function NavSection({ label, items, pathname, onNavigate, delay }: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  delay: number;
}) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300 ease-out",
                  isActive
                    ? "bg-gradient-to-r from-[#B9E5C6] to-[#A8DDB8] text-[#17352F] shadow-lg shadow-[#B9E5C6]/20"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white hover:translate-x-1"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#17352F] animate-scale-in" />
                )}
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                  isActive
                    ? "bg-[#17352F]/10 text-[#17352F]"
                    : "bg-white/[0.04] text-white/40 group-hover:bg-white/[0.08] group-hover:text-white/80"
                )}>
                  <Icon className="h-[1.1rem] w-[1.1rem] transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                </span>
                <span className="truncate flex-1">{item.name}</span>
                {item.badge && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-all duration-300",
                    isActive
                      ? "bg-[#17352F] text-[#B9E5C6]"
                      : "bg-[#B9E5C6]/20 text-[#B9E5C6] group-hover:bg-[#B9E5C6]/30"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({
  mobileMenuOpen,
  onNavigate,
}: {
  mobileMenuOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-[17rem] flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#17352F] via-[#1A3D35] to-[#142E28] text-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:shadow-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="relative flex h-[4.5rem] shrink-0 items-center border-b border-white/[0.06] px-5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#B9E5C6]/[0.03] to-transparent" />
        <Link href="/dashboard" onClick={onNavigate} className="relative flex items-center gap-3 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#B9E5C6] to-[#8FD4A8] text-[#17352F] shadow-lg shadow-[#B9E5C6]/20 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[#B9E5C6]/30">
            <Building className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold leading-tight tracking-tight">Inmobiliaria</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">Sistema de gestión</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6" aria-label="Secciones">
        <NavSection label="General" items={mainNavigation} pathname={pathname} onNavigate={onNavigate} delay={0} />
        <NavSection label="Gestión" items={managementNavigation} pathname={pathname} onNavigate={onNavigate} delay={50} />
        <NavSection label="Financiero" items={financialNavigation} pathname={pathname} onNavigate={onNavigate} delay={100} />
        <NavSection label="Operaciones" items={operationalNavigation} pathname={pathname} onNavigate={onNavigate} delay={150} />
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-[#B9E5C6]/60" />
          <span className="text-[10px] text-white/35">v1.0.0 · Sistema activo</span>
        </div>
        <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-12 w-full justify-start gap-3 px-3 text-white hover:bg-white/[0.06] hover:text-white rounded-xl transition-all duration-300"
            >
              <Avatar className="h-9 w-9 ring-2 ring-[#B9E5C6]/20 transition-all duration-300 hover:ring-[#B9E5C6]/40">
                <AvatarFallback className="bg-gradient-to-br from-[#B9E5C6] to-[#8FD4A8] text-[#17352F] text-xs font-bold">AD</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="truncate text-sm font-medium">Admin User</span>
                <span className="text-[11px] text-white/40">Administrador</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-white/30 transition-transform duration-300", userMenuOpen && "rotate-180")} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 animate-scale-in">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@inmobiliaria.com</p>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer">
              <User className="h-4 w-4 text-muted-foreground" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer">
              <Building className="h-4 w-4 text-muted-foreground" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer text-destructive focus:text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

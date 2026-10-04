"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Upload,
  X,
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
import { useSession, signOut } from "next-auth/react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  AGENT: "Agente",
  ASSISTANT: "Asistente",
  ACCOUNTANT: "Contabilidad",
  MAINTENANCE: "Mantenimiento",
};

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const managementNavigation = [
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Propietarios", href: "/dashboard/propietarios", icon: Users },
  { name: "Inmuebles", href: "/dashboard/inmuebles", icon: Building2 },
  { name: "Contratos", href: "/dashboard/contratos", icon: FileText },
  { name: "Importar", href: "/dashboard/importar", icon: Upload },
];

const financialNavigation = [
  { name: "Transacciones", href: "/dashboard/transacciones", icon: DollarSign },
  { name: "Estados de Cuenta", href: "/dashboard/estados-cuenta", icon: Calculator },
];

const operationalNavigation = [
  { name: "Calendario", href: "/dashboard/calendario", icon: CalendarDays },
  { name: "Averías", href: "/dashboard/averias", icon: Wrench },
  { name: "Proveedores", href: "/dashboard/proveedores", icon: HardHat },
  { name: "Auditoría", href: "/dashboard/auditoria", icon: HardHat },
  { name: "Documentos", href: "/dashboard/documentos", icon: FolderOpen },
  { name: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
  { name: "Usuarios", href: "/dashboard/usuarios", icon: Users },
];

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

function NavSection({ label, items, pathname, onNavigate, delay, collapsed }: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  delay: number;
  collapsed: boolean;
}) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      {collapsed ? (
        <div className="mx-auto mb-3 h-px w-7 bg-white/10" aria-hidden="true" />
      ) : (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/35">
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.name : undefined}
                aria-label={collapsed ? item.name : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl py-2.5 text-[13px] font-medium transition-all duration-300 ease-out",
                  collapsed ? "justify-center px-2" : "px-3",
                  isActive
                    ? "bg-gradient-to-r from-[var(--sidebar-accent-strong)] to-[var(--sidebar-accent)] text-[var(--sidebar-accent-text)] shadow-lg shadow-blue-400/20"
                    : "text-blue-100/55 hover:translate-x-1 hover:bg-white/[0.06] hover:text-white"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent-text)] animate-scale-in" />
                )}
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                  isActive
                    ? "bg-[var(--sidebar-accent-text)]/10 text-[var(--sidebar-accent-text)]"
                    : "bg-white/[0.04] text-blue-100/45 group-hover:bg-white/[0.1] group-hover:text-white"
                )}>
                  <Icon className="h-[1.1rem] w-[1.1rem] transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                </span>
                {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                {!collapsed && item.badge && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-all duration-300",
                    isActive
                      ? "bg-[var(--sidebar-accent-text)] text-[var(--sidebar-accent-strong)]"
                      : "bg-blue-300/20 text-blue-200 group-hover:bg-blue-300/30"
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
  collapsed = false,
}: {
  mobileMenuOpen: boolean;
  onNavigate: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = session?.user?.name ?? "Usuario";
  const userEmail = session?.user?.email ?? "";
  const userRoleLabel = session?.user?.role ? ROLE_LABELS[session.user.role] ?? session.user.role : "";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-[17rem] flex-col border-r border-white/[0.06] bg-gradient-to-b from-[var(--sidebar-from)] via-[var(--sidebar-via)] to-[var(--sidebar-to)] text-white shadow-2xl transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:shadow-none",
        collapsed ? "lg:w-20" : "lg:w-[17rem]",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="relative flex h-[4.5rem] shrink-0 items-center border-b border-white/[0.06] px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/[0.07] to-transparent" />
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn("relative flex items-center gap-3 group", collapsed && "mx-auto")}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--sidebar-accent-strong)] to-[var(--sidebar-accent)] text-[var(--sidebar-accent-text)] shadow-lg shadow-blue-400/25 transition-transform duration-300 group-hover:scale-105">
            <Building className="h-5 w-5" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold leading-tight tracking-tight">Inmobiliaria</span>
              <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-blue-200/40">Sistema de gestión</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={onNavigate}
          aria-label="Cerrar menú"
          className="relative ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-100/60 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-6 overflow-y-auto overflow-x-hidden py-5",
          collapsed ? "px-2" : "px-3"
        )}
        aria-label="Secciones"
      >
        <NavSection label="General" items={mainNavigation} pathname={pathname} onNavigate={onNavigate} delay={0} collapsed={collapsed} />
        <NavSection label="Gestión" items={managementNavigation} pathname={pathname} onNavigate={onNavigate} delay={50} collapsed={collapsed} />
        <NavSection label="Financiero" items={financialNavigation} pathname={pathname} onNavigate={onNavigate} delay={100} collapsed={collapsed} />
        <NavSection label="Operaciones" items={operationalNavigation} pathname={pathname} onNavigate={onNavigate} delay={150} collapsed={collapsed} />
      </nav>

      <div className={cn("border-t border-white/[0.06] p-3", collapsed && "px-2")}>
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--sidebar-accent)]/70" />
            <span className="text-[10px] text-blue-100/40">v1.0.0 · Sistema activo</span>
          </div>
        )}
        <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              title={collapsed ? "Cuenta" : undefined}
              className={cn(
                "h-12 w-full gap-3 rounded-xl text-white transition-all duration-300 hover:bg-white/[0.06] hover:text-white",
                collapsed ? "justify-center px-0" : "justify-start px-3"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-400/25 transition-all duration-300 hover:ring-blue-400/50">
                <AvatarFallback className="bg-gradient-to-br from-[var(--sidebar-accent-strong)] to-[var(--sidebar-accent)] text-xs font-bold text-[var(--sidebar-accent-text)]">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                    <span className="truncate text-sm font-medium">{userName}</span>
                    <span className="text-[11px] text-blue-100/40">{userRoleLabel}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-blue-100/40 transition-transform duration-300", userMenuOpen && "rotate-180")} />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? "start" : "end"} side={collapsed ? "right" : "bottom"} className="w-56 p-1.5 animate-scale-in">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2"
              onSelect={() => {
                setUserMenuOpen(false);
                router.push("/dashboard/perfil");
              }}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-destructive focus:text-destructive"
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <AlertTriangle className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

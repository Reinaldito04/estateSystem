"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, Sun, Moon, AlertTriangle, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { GlobalSearch } from "./global-search";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/clientes": "Clientes",
  "/dashboard/propietarios": "Propietarios",
  "/dashboard/inmuebles": "Inmuebles",
  "/dashboard/contratos": "Contratos",
  "/dashboard/transacciones": "Transacciones",
  "/dashboard/averias": "Averías",
  "/dashboard/calendario": "Calendario",
  "/dashboard/proveedores": "Proveedores",
  "/dashboard/usuarios": "Usuarios",
  "/dashboard/auditoria": "Auditoría",
  "/dashboard/estados-cuenta": "Estados de Cuenta",
  "/dashboard/documentos": "Documentos",
  "/dashboard/notificaciones": "Notificaciones",
  "/dashboard/perfil": "Perfil",
};

export function Header({
  onMenuToggle,
  sidebarCollapsed = false,
  onToggleSidebar,
}: {
  onMenuToggle: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [alertCount, setAlertCount] = useState(0);

  const userName = session?.user?.name ?? "Usuario";
  const userRole = session?.user?.role ?? "";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await fetch("/api/notices/automated?days=30");
        if (response.ok) {
          const data = await response.json();
          setAlertCount(Array.isArray(data.data) ? data.data.length : 0);
        }
      } catch {
        setAlertCount(0);
      }
    };
    loadAlerts();
  }, []);

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return ["Dashboard"];
    const base = breadcrumbMap[pathname];
    if (base) return ["Dashboard", base];
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 3) {
      const parent = breadcrumbMap[`/${segments[0]}/${segments[1]}`];
      if (parent) return ["Dashboard", parent, "Detalle"];
    }
    return ["Dashboard"];
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 shadow-[0_1px_2px_-1px_rgba(15,42,82,0.15)] backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden"
            onClick={onMenuToggle}
            aria-label="Abrir menú"
            title="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden rounded-xl text-muted-foreground hover:text-primary lg:inline-flex"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
              title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          )}

          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-1.5 text-sm">
              {breadcrumb.map((item, index) => (
                <li key={item} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />}
                  <span className={index === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          <GlobalSearch />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cambiar tema"
            title="Cambiar tema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative rounded-xl"
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notificaciones" title="Notificaciones" asChild>
            <a href="/dashboard/notificaciones">
              <Bell className="h-[1.1rem] w-[1.1rem]" />
              {alertCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </a>
          </Button>

          <div className="mx-1.5 h-6 w-px bg-border/60" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 ring-2 ring-border/40 transition-all hover:ring-primary/40">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-semibold text-white">
                    {initials || "US"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-destructive focus:text-destructive"
                onSelect={() => signOut({ callbackUrl: "/login" })}
              >
                <AlertTriangle className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

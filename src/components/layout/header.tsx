"use client";

import { Bell, Menu, Sun, Moon, User, Building, AlertTriangle, ChevronRight } from "lucide-react";
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
import { GlobalSearch } from "./global-search";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/propietarios": "Propietarios",
  "/dashboard/inmuebles": "Inmuebles",
  "/dashboard/contratos": "Contratos",
  "/dashboard/transacciones": "Transacciones",
  "/dashboard/averias": "Averías",
  "/dashboard/estados-cuenta": "Estados de Cuenta",
  "/dashboard/documentos": "Documentos",
  "/dashboard/notificaciones": "Notificaciones",
};

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

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
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label="Abrir menú"
            title="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

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
            className="relative"
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones" title="Notificaciones">
            <Bell className="h-[1.1rem] w-[1.1rem]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
              3
            </span>
          </Button>

          <div className="mx-1.5 h-6 w-px bg-border/60" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 ring-2 ring-border/40 transition-shadow hover:ring-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem className="flex items-center gap-2.5 rounded-md px-3 py-2 cursor-pointer">
                <User className="h-4 w-4 text-muted-foreground" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2.5 rounded-md px-3 py-2 cursor-pointer">
                <Building className="h-4 w-4 text-muted-foreground" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem className="flex items-center gap-2.5 rounded-md px-3 py-2 cursor-pointer text-destructive focus:text-destructive">
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

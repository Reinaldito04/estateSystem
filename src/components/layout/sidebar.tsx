"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Home,
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
  BarChart3,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-all">
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <Building className="h-8 w-8 text-primary" />
            <span className="hidden sm:block">Inmobiliaria</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.png" alt="Usuario" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate">Admin User</span>
                  <span className="text-xs text-muted-foreground">Administrador</span>
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
      </div>
    </aside>
  );
}
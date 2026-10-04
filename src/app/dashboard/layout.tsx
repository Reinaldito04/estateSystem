"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          onNavigate={() => setMobileMenuOpen(false)}
          collapsed={sidebarCollapsed}
        />
        <div
          className={cn(
            "transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-[17rem]"
          )}
        >
          <Header
            onMenuToggle={() => setMobileMenuOpen((open) => !open)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
          <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
        <Toaster />
      </div>
    </SessionProvider>
  );
}

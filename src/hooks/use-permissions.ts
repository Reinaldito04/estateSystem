"use client";

import { useSession } from "next-auth/react";
import { canWriteApi, type AppRole } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role as AppRole | undefined;
  const isAdmin = role === "ADMIN";

  return {
    role,
    isAdmin,
    can: (roles: AppRole[]) => (role ? roles.includes(role) : false),
    canWriteApi: (pathname: string) => (role ? canWriteApi(pathname, role) : false),
  };
}

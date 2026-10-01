import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) return null;
  return roles.includes(user.role) ? user : null;
}

export const ADMIN_ROLES: UserRole[] = ["ADMIN"];

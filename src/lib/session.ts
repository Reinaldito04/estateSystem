import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return null;
  if ((user as { invalid?: boolean }).invalid) return null;

  // Revalidate account status at request time so suspended/deactivated users
  // lose access immediately, regardless of JWT expiry.
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, status: true, deletedAt: true },
  });
  if (!account || account.status !== "ACTIVE" || account.deletedAt) return null;

  return { ...user, role: account.role };
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) return null;
  return roles.includes(user.role) ? user : null;
}

export const ADMIN_ROLES: UserRole[] = ["ADMIN"];

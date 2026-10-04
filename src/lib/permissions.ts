export type AppRole = "ADMIN" | "AGENT" | "ASSISTANT" | "ACCOUNTANT" | "MAINTENANCE";

export const ALL_ROLES: AppRole[] = ["ADMIN", "AGENT", "ASSISTANT", "ACCOUNTANT", "MAINTENANCE"];

// Roles allowed to perform write operations, per API prefix.
const WRITE_MATRIX: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/api/users", roles: ["ADMIN"] },
  { prefix: "/api/profile", roles: ALL_ROLES },
  { prefix: "/api/import", roles: ["ADMIN", "AGENT", "ASSISTANT"] },
  { prefix: "/api/owner-settlements", roles: ["ADMIN", "AGENT", "ACCOUNTANT"] },
  { prefix: "/api/account-statements", roles: ["ADMIN", "AGENT", "ACCOUNTANT"] },
  { prefix: "/api/transactions", roles: ["ADMIN", "AGENT", "ACCOUNTANT"] },
  { prefix: "/api/issues", roles: ["ADMIN", "AGENT", "MAINTENANCE"] },
  { prefix: "/api/tasks", roles: ["ADMIN", "AGENT", "MAINTENANCE"] },
  { prefix: "/api/assets", roles: ["ADMIN", "AGENT", "MAINTENANCE"] },
  { prefix: "/api/providers", roles: ["ADMIN", "AGENT", "MAINTENANCE"] },
  { prefix: "/api/maintenance-plans", roles: ["ADMIN", "AGENT", "MAINTENANCE"] },
  { prefix: "/api/clients", roles: ["ADMIN", "AGENT", "ASSISTANT"] },
  { prefix: "/api/documents", roles: ["ADMIN", "AGENT", "ASSISTANT"] },
];

// Prefixes that are restricted to specific roles even for reads.
const READ_MATRIX: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/api/users", roles: ["ADMIN"] },
  { prefix: "/api/audit", roles: ["ADMIN", "ACCOUNTANT"] },
  { prefix: "/api/account-statements", roles: ["ADMIN", "AGENT", "ACCOUNTANT"] },
  { prefix: "/api/owner-settlements", roles: ["ADMIN", "AGENT", "ACCOUNTANT"] },
];

export function canWriteApi(pathname: string, role: string): boolean {
  const normalizedRole = role as AppRole;
  for (const entry of WRITE_MATRIX) {
    if (pathname.startsWith(entry.prefix)) {
      return entry.roles.includes(normalizedRole);
    }
  }
  return normalizedRole === "ADMIN" || normalizedRole === "AGENT";
}

export function canReadApi(pathname: string, role: string): boolean {
  const normalizedRole = role as AppRole;
  for (const entry of READ_MATRIX) {
    if (pathname.startsWith(entry.prefix)) {
      return entry.roles.includes(normalizedRole);
    }
  }
  return true;
}

export function can(role: string | undefined | null, roles: AppRole[]): boolean {
  if (!role) return false;
  return roles.includes(role as AppRole);
}

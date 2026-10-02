import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWrite(method: string) {
  return WRITE_METHODS.has(method);
}

function canWrite(pathname: string, role: string) {
  if (pathname.startsWith("/api/users")) return role === "ADMIN";
  if (pathname.startsWith("/api/transactions") || pathname.startsWith("/api/account-statements")) {
    return ["ADMIN", "AGENT", "ACCOUNTANT"].includes(role);
  }
  if (
    pathname.startsWith("/api/issues") ||
    pathname.startsWith("/api/tasks") ||
    pathname.startsWith("/api/assets") ||
    pathname.startsWith("/api/providers") ||
    pathname.startsWith("/api/maintenance-plans")
  ) {
    return ["ADMIN", "AGENT", "MAINTENANCE"].includes(role);
  }
  if (pathname.startsWith("/api/clients") || pathname.startsWith("/api/documents")) {
    return ["ADMIN", "AGENT", "ASSISTANT"].includes(role);
  }
  return role === "ADMIN" || role === "AGENT";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    if (isWrite(request.method) && !canWrite(pathname, String(token.role || ""))) {
      return NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canReadApi, canWriteApi } from "@/lib/permissions";

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isWrite(method: string) {
  return WRITE_METHODS.has(method);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    const role = String(token.role || "");
    if (isWrite(request.method) && !canWriteApi(pathname, role)) {
      return NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
    }
    if (pathname.startsWith("/api") && !isWrite(request.method) && !canReadApi(pathname, role)) {
      return NextResponse.json({ error: "No tienes permiso para acceder a este recurso" }, { status: 403 });
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

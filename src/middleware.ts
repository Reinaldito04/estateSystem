import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canReadApi, canWriteApi } from "@/lib/permissions";
import { getClientIp, pruneBuckets, rateLimit } from "@/lib/rate-limit";

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron", "/api/health"];
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Cache of user-id -> { active, checkedAt } to avoid a DB round-trip per request.
const STATUS_CACHE_TTL_MS = 60_000;
const statusCache = new Map<string, { active: boolean; checkedAt: number }>();

async function isSessionActive(userId: string, request: NextRequest): Promise<boolean> {
  const cached = statusCache.get(userId);
  const now = Date.now();
  if (cached && now - cached.checkedAt < STATUS_CACHE_TTL_MS) return cached.active;

  try {
    const url = new URL("/api/auth/status", request.url);
    const response = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const active = response.ok;
    statusCache.set(userId, { active, checkedAt: now });
    return active;
  } catch {
    // Fail open on transient errors.
    return true;
  }
}

// endpoint prefix -> { limit, windowMs }
const RATE_LIMITS: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/auth", limit: 20, windowMs: 60_000 },
  { prefix: "/api/payment-reminders", limit: 5, windowMs: 60_000 },
  { prefix: "/api/leases/adjustments", limit: 10, windowMs: 60_000 },
];

function isWrite(method: string) {
  return WRITE_METHODS.has(method);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") && pathname !== "/api/auth/status") {
    pruneBuckets();
    const rule = RATE_LIMITS.find((entry) => pathname.startsWith(entry.prefix));
    if (rule) {
      const result = rateLimit(`${getClientIp(request.headers)}:${rule.prefix}`, rule.limit, rule.windowMs);
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
        );
      }
    }
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (token && !token.invalid && token.id) {
    const active = await isSessionActive(String(token.id), request);
    if (!active) {
      statusCache.delete(String(token.id));
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Sesión inválida o cuenta inactiva" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

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

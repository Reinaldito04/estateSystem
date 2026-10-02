import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyPendingAdjustments } from "@/lib/lease-adjustments";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await applyPendingAdjustments();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error running lease adjustments cron:", error);
    return NextResponse.json({ error: "Error al aplicar ajustes" }, { status: 500 });
  }
}

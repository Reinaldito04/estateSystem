import { NextResponse } from "next/server";
import { applyPendingAdjustments } from "@/lib/lease-adjustments";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError } from "@/lib/domain-error";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await applyPendingAdjustments();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (error) {
    return handleRouteError(error, "Error al aplicar ajustes de canon");
  }
}

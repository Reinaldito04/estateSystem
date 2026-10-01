import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = Math.min(200, Number(searchParams.get("limit") || "50"));

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType y entityId son requeridos" }, { status: 400 });
    }

    const logs = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, fullName: true } } },
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_NOTICE_DAYS, generateExpirationNotices, isWithinNoticeWindow } from "@/lib/lease-alerts";

const DAY = 24 * 60 * 60 * 1000;

function resolveHorizon(request: NextRequest, fallback: number) {
  const requested = Number(new URL(request.url).searchParams.get("days") || "");
  if (Number.isFinite(requested) && requested > 0) {
    return Math.min(MAX_NOTICE_DAYS, Math.max(1, requested));
  }
  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const horizon = resolveHorizon(request, MAX_NOTICE_DAYS);
    const result = await generateExpirationNotices(horizon);
    return NextResponse.json({
      message: `Se generaron ${result.newNotices} notificaciones de vencimiento`,
      expiringLeases: result.expiringLeases,
      newNotices: result.newNotices,
    });
  } catch (error) {
    console.error("Error generating expiration notices:", error);
    return NextResponse.json({ error: "Error al generar notificaciones" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const horizon = resolveHorizon(request, 90);
    const now = new Date();
    const maxDate = new Date(now.getTime() + horizon * DAY);

    const candidates = await prisma.lease.findMany({
      where: { isActive: true, endDate: { gte: now, lte: maxDate } },
      include: {
        property: { include: { owner: { select: { id: true, fullName: true, phone: true } } } },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, phone: true } } } },
        notices: { where: { noticeType: "LEASE_EXPIRATION" } },
      },
      orderBy: { endDate: "asc" },
    });

    const expiringLeases = candidates
      .filter((lease) => isWithinNoticeWindow(lease.endDate, lease.renewalNoticeDays, now, horizon))
      .map(({ leaseClients, ...lease }) => ({
        ...lease,
        owner: lease.property.owner,
        tenant: leaseClients[0]?.client || null,
      }));

    return NextResponse.json({ data: expiringLeases, horizon });
  } catch (error) {
    console.error("Error fetching expiring leases:", error);
    return NextResponse.json({ error: "Error al obtener contratos por vencer" }, { status: 500 });
  }
}

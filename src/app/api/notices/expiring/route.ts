import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLeases = await prisma.lease.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        property: {
          include: {
            owner: { select: { id: true, fullName: true } },
          },
        },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true } } } },
      },
    });

    const existingNotices = await prisma.leaseProposalAndNotice.findMany({
      where: {
        noticeType: "LEASE_EXPIRATION",
        leaseId: { in: expiringLeases.map((l) => l.id) },
      },
    });

    const existingLeaseIds = new Set(existingNotices.map((n) => n.leaseId));
    const newNotices = [];

    for (const lease of expiringLeases) {
      if (!existingLeaseIds.has(lease.id)) {
        const notice = await prisma.leaseProposalAndNotice.create({
          data: {
            leaseId: lease.id,
            noticeType: "LEASE_EXPIRATION",
            notes: `El contrato ${lease.contractNumber} del inmueble ${lease.property.code} - ${lease.property.title} vence el ${lease.endDate.toLocaleDateString("es-VE")}. Cliente: ${lease.leaseClients[0]?.client.fullName || "No asignado"}. Propietario: ${lease.property.owner.fullName}.`,
          },
        });
        newNotices.push(notice);
      }
    }

    return NextResponse.json({
      message: `Se generaron ${newNotices.length} notificaciones de vencimiento`,
      expiringLeases: expiringLeases.length,
      newNotices: newNotices.length,
    });
  } catch (error) {
    console.error("Error generating expiration notices:", error);
    return NextResponse.json({ error: "Error al generar notificaciones" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLeases = await prisma.lease.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        property: {
          include: {
            owner: { select: { id: true, fullName: true, phone: true } },
          },
        },
        leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, phone: true } } } },
        notices: {
          where: { noticeType: "LEASE_EXPIRATION" },
        },
      },
      orderBy: { endDate: "asc" },
    });

    return NextResponse.json({ data: expiringLeases.map(({ leaseClients, ...lease }) => ({ ...lease, tenant: leaseClients[0]?.client || null })) });
  } catch (error) {
    console.error("Error fetching expiring leases:", error);
    return NextResponse.json({ error: "Error al obtener contratos por vencer" }, { status: 500 });
  }
}
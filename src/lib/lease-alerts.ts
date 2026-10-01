import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;
export const MAX_NOTICE_DAYS = 365;

export function isWithinNoticeWindow(
  endDate: Date,
  renewalNoticeDays: number,
  now: Date,
  horizon: number,
) {
  const daysLeft = (endDate.getTime() - now.getTime()) / DAY;
  return daysLeft >= 0 && daysLeft <= Math.min(renewalNoticeDays, horizon);
}

export async function generateExpirationNotices(horizon = MAX_NOTICE_DAYS) {
  const now = new Date();
  const maxDate = new Date(now.getTime() + horizon * DAY);

  const candidates = await prisma.lease.findMany({
    where: { isActive: true, endDate: { gte: now, lte: maxDate } },
    include: {
      property: { include: { owner: { select: { id: true, fullName: true } } } },
      leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true } } } },
    },
    orderBy: { endDate: "asc" },
  });

  const expiringLeases = candidates.filter((lease) =>
    isWithinNoticeWindow(lease.endDate, lease.renewalNoticeDays, now, horizon),
  );

  const existingNotices = await prisma.leaseProposalAndNotice.findMany({
    where: {
      leaseId: { in: expiringLeases.map((lease) => lease.id) },
      noticeType: { in: ["LEASE_EXPIRATION", "OWNER_NOTICE"] },
    },
    select: { leaseId: true, noticeType: true },
  });

  const existingKeys = new Set(existingNotices.map((notice) => `${notice.leaseId}:${notice.noticeType}`));
  let newNotices = 0;

  for (const lease of expiringLeases) {
    const summary = `El contrato ${lease.contractNumber} del inmueble ${lease.property.code} - ${lease.property.title} vence el ${lease.endDate.toLocaleDateString("es-VE")}. Cliente: ${lease.leaseClients[0]?.client.fullName || "No asignado"}. Propietario: ${lease.property.owner.fullName}.`;

    if (!existingKeys.has(`${lease.id}:LEASE_EXPIRATION`)) {
      await prisma.leaseProposalAndNotice.create({
        data: {
          leaseId: lease.id,
          noticeType: "LEASE_EXPIRATION",
          recipientType: "TENANT",
          notes: summary,
        },
      });
      newNotices += 1;
    }

    if (!existingKeys.has(`${lease.id}:OWNER_NOTICE`)) {
      await prisma.leaseProposalAndNotice.create({
        data: {
          leaseId: lease.id,
          noticeType: "OWNER_NOTICE",
          recipientType: "OWNER",
          notes: summary,
        },
      });
      newNotices += 1;
    }
  }

  return { expiringLeases: expiringLeases.length, newNotices };
}

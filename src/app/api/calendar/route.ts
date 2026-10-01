import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COLORS = {
  task: "#2563eb",
  reservation: "#7c3aed",
  visit: "#0891b2",
  lease: "#d97706",
  issue: "#dc2626",
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    const from = new Date(searchParams.get("from") || defaultFrom);
    const to = new Date(searchParams.get("to") || defaultTo);

    const [tasks, reservations, visits, leases, issues] = await Promise.all([
      prisma.task.findMany({
        where: { dueDate: { gte: from, lte: to } },
        include: {
          property: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, fullName: true } },
          assignee: { select: { id: true, fullName: true } },
        },
      }),
      prisma.propertyReservation.findMany({
        where: { startDate: { lte: to }, endDate: { gte: from } },
        include: {
          property: { select: { id: true, code: true, title: true } },
          client: { select: { id: true, fullName: true } },
        },
      }),
      prisma.propertyVisit.findMany({
        where: { scheduledAt: { gte: from, lte: to } },
        include: { property: { select: { id: true, code: true, title: true } } },
      }),
      prisma.lease.findMany({
        where: { isActive: true, endDate: { gte: from, lte: to } },
        include: { property: { select: { id: true, code: true, title: true } } },
      }),
      prisma.propertyIssue.findMany({
        where: {
          reportDate: { gte: from, lte: to },
          status: { in: ["REPORTED", "IN_PROGRESS"] },
        },
        include: { property: { select: { id: true, code: true, title: true } } },
      }),
    ]);

    const events = [
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: (task.startAt ?? task.dueDate).toISOString(),
        end: task.endAt ? task.endAt.toISOString() : undefined,
        allDay: task.allDay,
        backgroundColor: COLORS.task,
        borderColor: COLORS.task,
        extendedProps: {
          type: "task" as const,
          entityId: task.id,
          status: task.status,
          category: task.category,
          priority: task.priority,
          property: task.property,
          client: task.client,
          assignee: task.assignee,
        },
      })),
      ...reservations.map((reservation) => ({
        id: `reservation-${reservation.id}`,
        title: `Reserva · ${reservation.property.code}`,
        start: reservation.startDate.toISOString(),
        end: reservation.endDate.toISOString(),
        allDay: true,
        backgroundColor: COLORS.reservation,
        borderColor: COLORS.reservation,
        extendedProps: {
          type: "reservation" as const,
          entityId: reservation.id,
          status: reservation.status,
          reservationType: reservation.type,
          property: reservation.property,
          client: reservation.client,
        },
      })),
      ...visits.map((visit) => ({
        id: `visit-${visit.id}`,
        title: `Visita · ${visit.visitorName}`,
        start: visit.scheduledAt.toISOString(),
        allDay: false,
        backgroundColor: COLORS.visit,
        borderColor: COLORS.visit,
        extendedProps: {
          type: "visit" as const,
          entityId: visit.id,
          status: visit.status,
          property: visit.property,
        },
      })),
      ...leases.map((lease) => ({
        id: `lease-${lease.id}`,
        title: `Vence contrato ${lease.contractNumber}`,
        start: lease.endDate.toISOString(),
        allDay: true,
        backgroundColor: COLORS.lease,
        borderColor: COLORS.lease,
        extendedProps: {
          type: "lease" as const,
          entityId: lease.id,
          leaseId: lease.id,
          property: lease.property,
        },
      })),
      ...issues.map((issue) => ({
        id: `issue-${issue.id}`,
        title: `Avería · ${issue.issueType}`,
        start: (issue.repairDate ?? issue.reportDate).toISOString(),
        allDay: true,
        backgroundColor: COLORS.issue,
        borderColor: COLORS.issue,
        extendedProps: {
          type: "issue" as const,
          entityId: issue.id,
          status: issue.status,
          property: issue.property,
        },
      })),
    ];

    return NextResponse.json({ data: events, range: { from: from.toISOString(), to: to.toISOString() } });
  } catch (error) {
    console.error("Error building calendar events:", error);
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 });
  }
}

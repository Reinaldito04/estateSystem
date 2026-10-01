import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const noticeSchema = z.object({
  leaseId: z.string().uuid("ID de contrato es requerido"),
  noticeType: z.enum(["LEASE_EXPIRATION", "RENOVATION_PROPOSAL", "OWNER_NOTICE"]),
  recipientType: z.enum(["OWNER", "TENANT"]).optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).default("DRAFT"),
  title: z.string().optional(),
  body: z.string().optional(),
  proposedCanonAmount: z.number().positive().optional(),
  proposedStartDate: z.string().transform((s) => new Date(s)).optional(),
  proposedEndDate: z.string().transform((s) => new Date(s)).optional(),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
});

const leaseInclude = {
  include: {
    property: {
      select: {
        id: true,
        code: true,
        title: true,
        owner: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    },
    leaseClients: { where: { role: "TENANT" as const }, select: { client: { select: { id: true, fullName: true, phone: true } } } },
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get("leaseId");
    const noticeType = searchParams.get("noticeType");

    const where = {
      ...(leaseId && { leaseId }),
      ...(noticeType && { noticeType: noticeType as "LEASE_EXPIRATION" | "RENOVATION_PROPOSAL" | "OWNER_NOTICE" }),
    };

    const notices = await prisma.leaseProposalAndNotice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        lease: leaseInclude,
      },
    });

    return NextResponse.json({
      data: notices.map(({ lease, ...notice }) => ({
        ...notice,
        lease: {
          ...lease,
          owner: lease.property.owner,
          tenant: lease.leaseClients[0]?.client || null,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = noticeSchema.parse(body);

    const notice = await prisma.leaseProposalAndNotice.create({
      data: {
        ...validatedData,
        ...(validatedData.status === "SENT" && { sentAt: new Date() }),
      },
      include: {
        lease: leaseInclude,
      },
    });

    return NextResponse.json(
      { ...notice, lease: { ...notice.lease, owner: notice.lease.property.owner, tenant: notice.lease.leaseClients[0]?.client || null } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating notice:", error);
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 });
  }
}


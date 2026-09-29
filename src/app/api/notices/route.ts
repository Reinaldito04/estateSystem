import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noticeSchema = z.object({
  leaseId: z.string().uuid("ID de contrato es requerido"),
  noticeType: z.enum(["LEASE_EXPIRATION", "RENOVATION_PROPOSAL", "OWNER_NOTICE"]),
  proposedCanonAmount: z.number().positive().optional(),
  proposedStartDate: z.string().transform((s) => new Date(s)).optional(),
  proposedEndDate: z.string().transform((s) => new Date(s)).optional(),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
});

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
        lease: {
          include: {
            property: { select: { id: true, code: true, title: true } },
            tenant: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: notices });
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
      data: validatedData,
      include: {
        lease: {
          include: {
            property: { select: { id: true, code: true, title: true } },
            tenant: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating notice:", error);
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 });
  }
}


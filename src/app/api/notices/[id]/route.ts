import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const noticeUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
  recipientType: z.enum(["OWNER", "TENANT"]).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  proposedCanonAmount: z.number().positive().optional(),
  proposedStartDate: z.string().transform((s) => new Date(s)).optional(),
  proposedEndDate: z.string().transform((s) => new Date(s)).optional(),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = noticeUpdateSchema.parse(body);

    const notice = await prisma.leaseProposalAndNotice.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.status === "SENT" && { sentAt: new Date() }),
      },
    });

    return NextResponse.json(notice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error updating notice:", error);
    return NextResponse.json({ error: "Error al actualizar notificación" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.leaseProposalAndNotice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json({ error: "Error al eliminar notificación" }, { status: 500 });
  }
}
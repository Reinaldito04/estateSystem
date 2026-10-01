import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const communicationSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "CALL", "WHATSAPP", "MESSAGE", "FORMAL_REQUEST"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]).default("OUTBOUND"),
  subject: z.string().optional(),
  content: z.string().min(1, "El contenido es requerido"),
  relatedRequest: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true } });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const body = communicationSchema.parse(await request.json());
    const communication = await prisma.clientCommunication.create({
      data: {
        clientId: id,
        channel: body.channel,
        direction: body.direction,
        subject: body.subject || null,
        content: body.content,
        relatedRequest: body.relatedRequest || null,
      },
    });

    return NextResponse.json(communication, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating client communication:", error);
    return NextResponse.json({ error: "Error al crear la comunicación" }, { status: 500 });
  }
}

import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const communicationSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "CALL", "WHATSAPP", "MESSAGE", "FORMAL_REQUEST"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]).default("OUTBOUND"),
  subject: z.string().optional(),
  content: z.string().min(1, "El contenido es requerido"),
  relatedRequest: z.string().optional(),
  send: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const client = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true, email: true, fullName: true } });

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

    let emailSent: boolean | undefined;
    let emailReason: string | undefined;

    if (body.send && body.channel === "EMAIL" && body.direction === "OUTBOUND") {
      emailSent = false;
      if (!client.email) {
        emailReason = "El cliente no tiene correo registrado";
      } else if (!isMailerConfigured()) {
        emailReason = "SMTP no configurado";
      } else {
        try {
          await sendMail({
            to: client.email,
            subject: body.subject || "Comunicación",
            text: body.content,
          });
          emailSent = true;
        } catch (error) {
          emailReason = error instanceof Error ? error.message : "Error al enviar el correo";
        }
      }
    }

    return NextResponse.json({ ...communication, emailSent, emailReason }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating client communication:", error);
    return NextResponse.json({ error: "Error al crear la comunicación" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createNoticeLetterDocument } from "@/lib/notice-letter";
import { isMailerConfigured, sendMail } from "@/lib/mailer";

export const runtime = "nodejs";

const AGENCY = process.env.AGENCY_NAME || "Inmobiliaria";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!isMailerConfigured()) {
      return NextResponse.json(
        { error: "El envío por correo no está configurado (SMTP_HOST, SMTP_FROM)." },
        { status: 400 },
      );
    }

    const notice = await prisma.leaseProposalAndNotice.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: { include: { owner: { select: { fullName: true, email: true } } } },
            leaseClients: { where: { role: "TENANT" }, select: { client: { select: { fullName: true, email: true } } } },
          },
        },
      },
    });

    if (!notice) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });

    const recipientType = notice.recipientType ?? (notice.noticeType === "OWNER_NOTICE" ? "OWNER" : "TENANT");
    const recipientName =
      recipientType === "OWNER"
        ? notice.lease.property.owner.fullName
        : notice.lease.leaseClients[0]?.client.fullName || "Inquilino";
    const recipientEmail =
      recipientType === "OWNER"
        ? notice.lease.property.owner.email
        : notice.lease.leaseClients[0]?.client.email || null;

    if (!recipientEmail) {
      return NextResponse.json({ error: "El destinatario no tiene correo registrado" }, { status: 400 });
    }

    const document = createNoticeLetterDocument({
      title: notice.title || "Notificación",
      body: notice.body || notice.notes || "Adjuntamos notificación del contrato.",
      noticeType: notice.noticeType,
      recipientType,
      recipientName,
      issueDate: notice.issueDate,
      agencyName: AGENCY,
      leaseNumber: notice.lease.contractNumber,
      propertyLabel: `${notice.lease.property.code} · ${notice.lease.property.title}`,
      propertyAddress: notice.lease.property.address,
      startDate: notice.lease.startDate,
      endDate: notice.lease.endDate,
      monthlyCanonAmount: Number(notice.lease.monthlyCanonAmount),
      currency: notice.lease.currency,
      proposedCanonAmount: notice.proposedCanonAmount ? Number(notice.proposedCanonAmount) : null,
      proposedStartDate: notice.proposedStartDate,
      proposedEndDate: notice.proposedEndDate,
    });

    const buffer = await renderToBuffer(document);

    await sendMail({
      to: recipientEmail,
      subject: `${notice.title || "Notificación"} - ${notice.lease.contractNumber}`,
      text: `Estimado(a) ${recipientName}, adjuntamos la notificación correspondiente al contrato ${notice.lease.contractNumber}.`,
      attachment: { filename: `carta-${notice.lease.contractNumber}.pdf`, content: Buffer.from(buffer) },
    });

    const updated = await prisma.leaseProposalAndNotice.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ sent: true, to: recipientEmail, notice: updated });
  } catch (error) {
    console.error("Error sending notice email:", error);
    return NextResponse.json({ error: "No se pudo enviar el correo" }, { status: 500 });
  }
}

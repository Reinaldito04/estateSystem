import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { createNoticeLetterDocument } from "@/lib/notice-letter";

export const runtime = "nodejs";

const AGENCY = process.env.AGENCY_NAME || "Inmobiliaria";

function defaultTitle(type: string) {
  if (type === "OWNER_NOTICE") return "Notificación de renovación / nuevo contrato";
  if (type === "RENOVATION_PROPOSAL") return "Propuesta de renovación de contrato";
  return "Notificación de vencimiento de contrato";
}

function buildBody(notice: {
  noticeType: string;
  recipientType: string | null;
  proposedStartDate: Date | null;
  proposedEndDate: Date | null;
  proposedCanonAmount: unknown;
}) {
  if (notice.noticeType === "RENOVATION_PROPOSAL") {
    return [
      `Por medio de la presente le hacemos llegar nuestra propuesta de renovación del contrato de arrendamiento.`,
      `Le invitamos a revisar las condiciones propuestas y comunicarnos su aceptación para continuar con el proceso.`,
    ].join("\n");
  }
  if (notice.noticeType === "OWNER_NOTICE") {
    return [
      `Le informamos que el contrato de arrendamiento de su inmueble se encuentra próximo a vencer, por lo que nos encontramos gestionando su renovación o la vinculación de un nuevo inquilino.`,
      `Quedamos atentos a sus instrucciones para proceder conforme a su preferencia.`,
    ].join("\n");
  }
  return [
    `Le recordamos que su contrato de arrendamiento se encuentra próximo a su fecha de vencimiento.`,
    `Agradecemos contactarnos para gestionar la renovación y evitar interrupciones en el servicio.`,
  ].join("\n");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notice = await prisma.leaseProposalAndNotice.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            property: {
              include: { owner: { select: { fullName: true } } },
            },
            leaseClients: { where: { role: "TENANT" }, select: { client: { select: { fullName: true } } } },
          },
        },
      },
    });

    if (!notice) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    }

    const recipientType = notice.recipientType ?? (notice.noticeType === "OWNER_NOTICE" ? "OWNER" : "TENANT");
    const recipientName =
      recipientType === "OWNER"
        ? notice.lease.property.owner.fullName
        : notice.lease.leaseClients[0]?.client.fullName || "Inquilino";

    const document = createNoticeLetterDocument({
      title: notice.title || defaultTitle(notice.noticeType),
      body: notice.body || notice.notes || buildBody(notice),
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
    const filename = `carta-${notice.lease.contractNumber}-${notice.id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating notice letter:", error);
    return NextResponse.json({ error: "Error al generar la carta" }, { status: 500 });
  }
}

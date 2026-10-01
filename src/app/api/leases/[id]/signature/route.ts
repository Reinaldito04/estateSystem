import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";

const signatureSchema = z.object({
  mode: z.enum(["LOCAL", "EXTERNAL"]).default("EXTERNAL"),
  provider: z.string().min(1),
  eventType: z.enum(["SEND", "VIEW", "SIGN", "DECLINE", "EXPIRE", "CANCEL"]),
  status: z.enum(["PENDING", "SENT", "SIGNED", "DECLINED", "EXPIRED", "CANCELLED"]),
  envelopeId: z.string().optional(),
  actorName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  signerName: z.string().min(1).optional(),
  signerRole: z.string().optional(),
  acceptTerms: z.literal(true).optional(),
  signatureData: z.string().startsWith("data:image/png;base64,").optional(),
});

type SignatureStatusValue = "NOT_REQUIRED" | "PENDING" | "SENT" | "SIGNED" | "DECLINED" | "EXPIRED";

function toSignatureStatus(status: string): SignatureStatusValue {
  return status === "CANCELLED" ? "DECLINED" : (status as SignatureStatusValue);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = signatureSchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const lease = await prisma.lease.findUnique({ where: { id }, select: { id: true, draftContent: true, contractNumber: true } });
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

    if (data.mode === "LOCAL") {
      if (data.eventType !== "SIGN" || data.status !== "SIGNED" || !data.signerName || data.acceptTerms !== true || !data.signatureData) {
        return NextResponse.json({ error: "Para firmar localmente debes aceptar el consentimiento y proporcionar el firmante" }, { status: 400 });
      }
      if (!lease.draftContent) return NextResponse.json({ error: "Genera el borrador antes de firmar" }, { status: 400 });
      const signedAt = new Date();
      const signatureHash = createHash("sha256").update(`${lease.id}|${lease.contractNumber}|${lease.draftContent}|${data.signatureData}|${data.signerName}|${signedAt.toISOString()}`).digest("hex");
      const event = await prisma.contractSignatureEvent.create({ data: { leaseId: id, provider: "LOCAL", eventType: "SIGN", status: "SIGNED", ipAddress, actorName: data.signerName, metadata: { mode: "LOCAL", signerRole: data.signerRole || "", signatureHash } as Prisma.InputJsonValue } });
      await prisma.leaseSignature.upsert({
        where: { leaseId: id },
        create: { leaseId: id, provider: "LOCAL", method: "ELECTRONIC", signedBy: data.signerName, signatureHash, signatureData: data.signatureData, signatureConsentAt: signedAt, status: "SIGNED", signedAt, signedIp: ipAddress },
        update: { provider: "LOCAL", method: "ELECTRONIC", signedBy: data.signerName, signatureHash, signatureData: data.signatureData, signatureConsentAt: signedAt, status: "SIGNED", signedAt, signedIp: ipAddress },
      });
      await prisma.lease.update({ where: { id }, data: { contractStatus: "ACTIVE" } });
      return NextResponse.json({ ...event, signatureHash, signatureData: data.signatureData, signedAt, signedBy: data.signerName }, { status: 201 });
    }

    const status = toSignatureStatus(data.status);
    const signedAt = status === "SIGNED" ? new Date() : undefined;
    const event = await prisma.contractSignatureEvent.create({ data: { leaseId: id, provider: data.provider, eventType: data.eventType, status: data.status, ipAddress, actorName: data.actorName, metadata: data.metadata as Prisma.InputJsonValue } });
    await prisma.leaseSignature.upsert({
      where: { leaseId: id },
      create: { leaseId: id, provider: data.provider, envelopeId: data.envelopeId, status, method: "ELECTRONIC", signedAt, signedIp: status === "SIGNED" ? ipAddress : undefined },
      update: { provider: data.provider, envelopeId: data.envelopeId, status, method: "ELECTRONIC", ...(signedAt !== undefined && { signedAt }), ...(status === "SIGNED" && { signedIp: ipAddress }) },
    });
    if (status === "SIGNED") {
      await prisma.lease.update({ where: { id }, data: { contractStatus: "ACTIVE" } });
    }
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "No se pudo registrar el evento de firma" }, { status: 500 });
  }
}

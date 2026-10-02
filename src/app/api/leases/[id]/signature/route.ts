import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { DomainError, handleRouteError } from "@/lib/domain-error";
import { getCurrentUser } from "@/lib/session";
import { assertNoActiveOverlap, assertStatusTransition, syncPropertyOccupancy } from "@/lib/lease-workflow";

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

function documentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = signatureSchema.parse(await request.json());
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const lease = await prisma.lease.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, draftContent: true, contractNumber: true, contractStatus: true, propertyId: true, startDate: true, endDate: true },
    });
    if (!lease) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

    const activating = data.status === "SIGNED";
    if (activating && !lease.draftContent) throw new DomainError("Genera el borrador antes de firmar");
    if (activating) {
      assertStatusTransition(lease.contractStatus, "ACTIVE", true);
      if (data.mode === "EXTERNAL" && !data.envelopeId?.trim()) {
        throw new DomainError("La firma externa exige un identificador de sobre");
      }
      if (data.mode === "LOCAL" && (data.eventType !== "SIGN" || !data.signerName || data.acceptTerms !== true || !data.signatureData)) {
        throw new DomainError("Para firmar localmente debes aceptar el consentimiento y proporcionar el firmante");
      }
      await assertNoActiveOverlap(lease.propertyId, lease.startDate, lease.endDate, id);
    }

    const signedAt = activating ? new Date() : undefined;
    const contentHash = lease.draftContent ? documentHash(lease.draftContent) : null;
    const signerName = data.signerName || data.actorName || "Firmante";
    const signatureHash = activating
      ? createHash("sha256").update(`${lease.id}|${lease.contractNumber}|${contentHash}|${data.signatureData || data.envelopeId || ""}|${signerName}|${signedAt?.toISOString()}`).digest("hex")
      : null;
    const user = await getCurrentUser();
    const status = toSignatureStatus(data.status);

    const event = await prisma.contractSignatureEvent.create({
      data: {
        leaseId: id,
        provider: data.mode === "LOCAL" ? "LOCAL" : data.provider,
        eventType: data.eventType,
        status: data.status,
        ipAddress,
        actorName: signerName,
        actorId: user?.id,
        metadata: { ...data.metadata, mode: data.mode, documentHash: contentHash, signatureHash } as Prisma.InputJsonValue,
      },
    });

    await prisma.leaseSignature.upsert({
      where: { leaseId: id },
      create: {
        leaseId: id,
        provider: data.mode === "LOCAL" ? "LOCAL" : data.provider,
        envelopeId: data.envelopeId,
        method: "ELECTRONIC",
        status,
        signedBy: activating ? signerName : undefined,
        signatureHash,
        signatureData: data.signatureData,
        signatureConsentAt: data.mode === "LOCAL" ? signedAt : undefined,
        signedAt,
        signedIp: activating ? ipAddress : undefined,
      },
      update: {
        provider: data.mode === "LOCAL" ? "LOCAL" : data.provider,
        envelopeId: data.envelopeId,
        status,
        ...(activating && {
          signedBy: signerName,
          signatureHash,
          signatureData: data.signatureData,
          signedAt,
          signedIp: ipAddress,
          ...(data.mode === "LOCAL" && { signatureConsentAt: signedAt }),
        }),
      },
    });

    if (activating) {
      await prisma.lease.update({ where: { id }, data: { contractStatus: "ACTIVE", isActive: true } });
      await syncPropertyOccupancy(lease.propertyId);
    }

    await recordAudit({
      entityType: "Lease",
      entityId: id,
      action: activating ? "SIGN" : "SIGNATURE_EVENT",
      userId: user?.id,
      changes: { status: data.status, documentHash: contentHash },
      request,
    });

    return NextResponse.json({ ...event, signatureHash, documentHash: contentHash, signedAt, signedBy: activating ? signerName : null }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "No se pudo registrar el evento de firma");
  }
}

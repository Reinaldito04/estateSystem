import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidClientId, removeClientFile, storeClientFile } from "@/lib/client-file-storage";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_FILE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

const RISK_TYPES = ["INCOME_PROOF", "PERSONAL_REFERENCE", "LABOR_REFERENCE", "CREDIT_REPORT"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  let storedFile: { clientId: string; filename: string } | null = null;

  try {
    const { id } = await params;
    if (!isValidClientId(id)) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (typeof file === "string" || !file || (kind !== "document" && kind !== "risk")) {
      return NextResponse.json({ error: "Archivo o tipo de contenido inválido" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo debe pesar entre 1 byte y 20 MB" }, { status: 400 });
    }

    const extension = ALLOWED_FILE_TYPES[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
    }

    const client = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const filename = `${crypto.randomUUID()}.${extension}`;
    const fileUrl = `/api/clients/${id}/media/${filename}`;
    await storeClientFile(id, filename, new Uint8Array(await file.arrayBuffer()));
    storedFile = { clientId: id, filename };

    if (kind === "risk") {
      const parsed = z
        .object({
          documentType: z.enum(RISK_TYPES),
          title: z.string().trim().min(1).max(160),
          notes: z.string().max(500).optional(),
        })
        .safeParse({
          documentType: formData.get("documentType"),
          title: formData.get("title") || file.name,
          notes: formData.get("notes") || undefined,
        });
      if (!parsed.success) {
        await removeClientFile(id, filename);
        return NextResponse.json({ error: "Datos del documento de riesgo inválidos" }, { status: 400 });
      }
      const document = await prisma.clientRiskDocument.create({
        data: {
          clientId: id,
          documentType: parsed.data.documentType,
          title: parsed.data.title,
          fileUrl,
          notes: parsed.data.notes || null,
        },
      });
      return NextResponse.json(document, { status: 201 });
    }

    const documentName = z
      .string()
      .trim()
      .min(1)
      .max(160)
      .safeParse(formData.get("documentName") || file.name);
    if (!documentName.success) {
      await removeClientFile(id, filename);
      return NextResponse.json({ error: "Nombre de documento inválido" }, { status: 400 });
    }

    const document = await prisma.entityDocument.create({
      data: {
        entityType: client.role === "OWNER" ? "OWNER" : "TENANT",
        clientId: id,
        documentName: documentName.data,
        fileUrl,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (storedFile) {
      await removeClientFile(storedFile.clientId, storedFile.filename).catch(() => undefined);
    }
    console.error("Error uploading client media:", error);
    return NextResponse.json({ error: "Error al guardar el archivo" }, { status: 500 });
  }
}

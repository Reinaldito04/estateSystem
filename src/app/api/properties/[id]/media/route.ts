import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removePropertyFile, storePropertyFile, isValidPropertyId } from "@/lib/property-file-storage";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  let storedFile: { propertyId: string; filename: string } | null = null;

  try {
    const { id } = await params;
    if (!isValidPropertyId(id)) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (typeof file === "string" || !file || (kind !== "photo" && kind !== "document")) {
      return NextResponse.json({ error: "Archivo o tipo de contenido inválido" }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo debe pesar entre 1 byte y 20 MB" }, { status: 400 });
    }

    const extension = ALLOWED_FILE_TYPES[file.type];
    if (!extension || (kind === "photo" && !file.type.startsWith("image/"))) {
      return NextResponse.json({ error: "Formato no permitido" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id }, select: { id: true } });
    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    const filename = `${crypto.randomUUID()}.${extension}`;
    const fileUrl = `/api/properties/${id}/media/${filename}`;
    await storePropertyFile(id, filename, new Uint8Array(await file.arrayBuffer()));
    storedFile = { propertyId: id, filename };

    if (kind === "photo") {
      const description = z.string().max(200).safeParse(formData.get("description") || "");
      if (!description.success) {
        await removePropertyFile(id, filename);
        return NextResponse.json({ error: "La descripción no puede superar 200 caracteres" }, { status: 400 });
      }

      const photo = await prisma.propertyPhoto.create({
        data: { propertyId: id, photoUrl: fileUrl, description: description.data || null },
      });
      return NextResponse.json(photo, { status: 201 });
    }

    const documentName = z.string().trim().min(1).max(160).safeParse(
      formData.get("documentName") || file.name
    );
    if (!documentName.success) {
      await removePropertyFile(id, filename);
      return NextResponse.json({ error: "Nombre de documento inválido" }, { status: 400 });
    }

    const document = await prisma.entityDocument.create({
      data: {
        entityType: "PROPERTY",
        propertyId: id,
        documentName: documentName.data,
        fileUrl,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (storedFile) {
      await removePropertyFile(storedFile.propertyId, storedFile.filename).catch(() => undefined);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error uploading property media:", error);
    return NextResponse.json({ error: "Error al guardar el archivo" }, { status: 500 });
  }
}
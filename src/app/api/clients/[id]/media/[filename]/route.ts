import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isValidClientFilename,
  isValidClientId,
  readClientFile,
  removeClientFile,
} from "@/lib/client-file-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; filename: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, filename } = await params;
    if (!isValidClientId(id) || !isValidClientFilename(filename)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileUrl = `/api/clients/${id}/media/${filename}`;
    const [document, riskDocument] = await Promise.all([
      prisma.entityDocument.findFirst({ where: { clientId: id, fileUrl } }),
      prisma.clientRiskDocument.findFirst({ where: { clientId: id, fileUrl } }),
    ]);

    if (!document && !riskDocument) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const contents = await readClientFile(id, filename);
    const extension = filename.split(".").pop()?.toLowerCase();
    const contentType = extension === "jpg" ? "image/jpeg"
      : extension === "png" ? "image/png"
        : extension === "webp" ? "image/webp"
          : extension === "gif" ? "image/gif"
            : extension === "pdf" ? "application/pdf"
              : "application/octet-stream";

    return new NextResponse(new Uint8Array(contents), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": extension === "pdf" ? "inline" : "attachment",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error reading client media:", error);
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, filename } = await params;
    const kind = request.nextUrl.searchParams.get("kind");
    if (!isValidClientId(id) || !isValidClientFilename(filename) || (kind !== "document" && kind !== "risk")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileUrl = `/api/clients/${id}/media/${filename}`;
    const result = kind === "risk"
      ? await prisma.clientRiskDocument.deleteMany({ where: { clientId: id, fileUrl } })
      : await prisma.entityDocument.deleteMany({ where: { clientId: id, fileUrl } });

    if (result.count === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    await removeClientFile(id, filename);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client media:", error);
    return NextResponse.json({ error: "Error al eliminar el archivo" }, { status: 500 });
  }
}

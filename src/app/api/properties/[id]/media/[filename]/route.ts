import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isValidPropertyFilename,
  isValidPropertyId,
  readPropertyFile,
  removePropertyFile,
} from "@/lib/property-file-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; filename: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, filename } = await params;
    if (!isUuid(id)) return notFoundResponse();
    if (!isValidPropertyId(id) || !isValidPropertyFilename(filename)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileUrl = `/api/properties/${id}/media/${filename}`;
    const [photo, document] = await Promise.all([
      prisma.propertyPhoto.findFirst({ where: { propertyId: id, photoUrl: fileUrl } }),
      prisma.entityDocument.findFirst({
        where: { entityType: "PROPERTY", propertyId: id, fileUrl },
      }),
    ]);

    if (!photo && !document) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const contents = await readPropertyFile(id, filename);
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
        "Content-Disposition": photo || extension === "pdf" ? "inline" : "attachment",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error reading property media:", error);
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, filename } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const kind = request.nextUrl.searchParams.get("kind");
    if (!isValidPropertyId(id) || !isValidPropertyFilename(filename) || (kind !== "photo" && kind !== "document")) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fileUrl = `/api/properties/${id}/media/${filename}`;
    const result = kind === "photo"
      ? await prisma.propertyPhoto.deleteMany({ where: { propertyId: id, photoUrl: fileUrl } })
      : await prisma.entityDocument.deleteMany({
          where: { entityType: "PROPERTY", propertyId: id, fileUrl },
        });

    if (result.count === 0) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    await removePropertyFile(id, filename);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property media:", error);
    return NextResponse.json({ error: "Error al eliminar el archivo" }, { status: 500 });
  }
}
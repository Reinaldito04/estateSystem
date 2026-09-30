import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [properties, totalProperties] = await Promise.all([
      prisma.property.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          code: true,
          title: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.property.count(),
    ]);

    return NextResponse.json({ data: properties, totalProperties });
  } catch (error) {
    console.error("Error fetching property locations:", error);
    return NextResponse.json({ error: "Error al obtener ubicaciones" }, { status: 500 });
  }
}
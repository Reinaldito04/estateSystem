import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const statements = await prisma.accountStatement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        property: { select: { id: true, code: true, title: true } },
        client: { select: { id: true, fullName: true } },
      },
    });
    return NextResponse.json({ data: statements });
  } catch (error) {
    console.error("Error fetching saved statements:", error);
    return NextResponse.json({ error: "Error al obtener estados guardados" }, { status: 500 });
  }
}

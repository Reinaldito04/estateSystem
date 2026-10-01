import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#64748b"),
});

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { properties: true } } },
    });
    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Error al obtener etiquetas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = createSchema.parse(await request.json());
    const tag = await prisma.tag.upsert({
      where: { name: data.name },
      update: { color: data.color },
      create: data,
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Error al crear etiqueta" }, { status: 500 });
  }
}

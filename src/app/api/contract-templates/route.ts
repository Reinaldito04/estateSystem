import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LEASE_TEMPLATE } from "@/lib/contract-templates";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1),
  contractType: z.enum(["LEASE", "SALE", "CAPTURE"]).default("LEASE"),
  description: z.string().optional(),
  content: z.string().min(1),
});

export async function GET() {
  const templates = await prisma.contractTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: [DEFAULT_LEASE_TEMPLATE, ...templates] });
}

export async function POST(request: NextRequest) {
  try {
    const data = templateSchema.parse(await request.json());
    const template = await prisma.contractTemplate.create({ data });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear la plantilla" }, { status: 500 });
  }
}
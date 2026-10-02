import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const createSchema = z.object({
  companyName: z.string().min(1, "Nombre es requerido"),
  contactName: z.string().optional(),
  type: z.enum(["LABOR", "MATERIALS", "SERVICE", "MAINTENANCE", "OTHER"]).default("OTHER"),
  taxId: z.string().optional(),
  phone: z.string().min(1, "Teléfono es requerido"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  specialty: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),

});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const active = searchParams.get("active");
    const search = searchParams.get("search") || "";

    const where: Prisma.ServiceProviderWhereInput = {
      deletedAt: null,
      ...(type && { type: type as Prisma.ServiceProviderWhereInput["type"] }),
      ...(active === "true" && { isActive: true }),
      ...(active === "false" && { isActive: false }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: "insensitive" } },
          { contactName: { contains: search, mode: "insensitive" } },
          { specialty: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const providers = await prisma.serviceProvider.findMany({
      where,
      orderBy: { companyName: "asc" },
      include: { _count: { select: { tasks: true, maintenancePlans: true, issues: true } } },
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = createSchema.parse(await request.json());
    const user = await getCurrentUser();
    const provider = await prisma.serviceProvider.create({
      data: { ...data, email: data.email || null, rating: data.rating ?? null, createdById: user?.id ?? null },
    });
    await recordAudit({ entityType: "ServiceProvider", entityId: provider.id, action: "CREATE", changes: { companyName: provider.companyName }, request });
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error creating provider:", error);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}

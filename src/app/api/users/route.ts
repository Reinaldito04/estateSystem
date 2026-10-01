import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, getCurrentUser, requireRole } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const ROLES = ["ADMIN", "AGENT", "ASSISTANT", "ACCOUNTANT", "MAINTENANCE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

const createSchema = z.object({
  email: z.string().email("Correo inválido"),
  fullName: z.string().min(1, "Nombre es requerido"),
  phone: z.string().optional(),
  role: z.enum(ROLES).default("AGENT"),
  status: z.enum(STATUSES).default("ACTIVE"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const active = searchParams.get("active");
    const search = searchParams.get("search") || "";

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role: role as Prisma.UserWhereInput["role"] }),
      ...(active === "true" && { status: "ACTIVE" }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(ADMIN_ROLES);
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const data = createSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        status: data.status,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });

    await recordAudit({ entityType: "User", entityId: user.id, action: "CREATE", changes: { email: user.email }, request });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}

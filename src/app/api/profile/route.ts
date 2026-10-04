import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { validationError } from "@/lib/validation";

export const runtime = "nodejs";

const PROFILE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const updateSchema = z
  .object({
    fullName: z.string().trim().min(1, "El nombre es requerido").optional(),
    phone: z.string().trim().max(40).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Debes indicar tu contraseña actual",
    path: ["currentPassword"],
  });

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: PROFILE_SELECT });
    if (!profile) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error al obtener el perfil" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const data = updateSchema.parse(await request.json());
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!account) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const payload: { fullName?: string; phone?: string | null; passwordHash?: string } = {};
    const changes: Record<string, boolean> = {};

    if (data.fullName !== undefined) {
      payload.fullName = data.fullName;
      changes.fullName = true;
    }
    if (data.phone !== undefined) {
      payload.phone = data.phone || null;
      changes.phone = true;
    }

    if (data.newPassword) {
      if (!account.passwordHash) {
        return NextResponse.json({ error: "La cuenta no tiene contraseña configurada" }, { status: 400 });
      }
      const valid = await bcrypt.compare(data.currentPassword ?? "", account.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "La contraseña actual no es correcta", fields: { currentPassword: "Contraseña incorrecta" } },
          { status: 400 },
        );
      }
      payload.passwordHash = await bcrypt.hash(data.newPassword, 10);
      changes.password = true;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No hay cambios que guardar" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: payload,
      select: PROFILE_SELECT,
    });

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      action: "UPDATE",
      changes,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 });
  }
}

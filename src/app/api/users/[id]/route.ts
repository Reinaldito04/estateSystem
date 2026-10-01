import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, requireRole } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const ROLES = ["ADMIN", "AGENT", "ASSISTANT", "ACCOUNTANT", "MAINTENANCE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(ADMIN_ROLES);
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = await params;
    const data = updateSchema.parse(await request.json());
    const { password, ...rest } = data;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
      },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });

    await recordAudit({ entityType: "User", entityId: id, action: "UPDATE", changes: { role: user.role, status: user.status }, request });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(ADMIN_ROLES);
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = await params;
    if (admin.id === id) {
      return NextResponse.json({ error: "No puede desactivar su propio usuario" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
    await recordAudit({ entityType: "User", entityId: id, action: "DELETE", request });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}

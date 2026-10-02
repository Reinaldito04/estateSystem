import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ active: false, reason: "no-session" }, { status: 401 });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, deletedAt: true },
    });

    if (!account || account.status !== "ACTIVE" || account.deletedAt) {
      return NextResponse.json({ active: false, reason: "inactive" }, { status: 401 });
    }

    return NextResponse.json({ active: true });
  } catch (error) {
    console.error("Session status check failed:", error);
    // Fail open on transient errors to avoid locking everyone out.
    return NextResponse.json({ active: true, degraded: true });
  }
}

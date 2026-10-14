import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * GET /api/audit-logs
 * Retrieves the authenticated user's audit trail events.
 * Scoped strictly to the authenticated actor: `where: { actorUserId: user.id }`.
 * Uses the composite index `[actorUserId, createdAt]`.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        actorUserId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityPublicId: true,
        entityLabel: true,
        details: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ auditLogs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Navbar from "@/components/navbar";
import ActivityLogList from "@/components/activity-log-list";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Strictly scoped to the authenticated actor
  const logs = await prisma.auditLog.findMany({
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Activity Log
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Immutable audit record of invoice lifecycle and deletion events.
          </p>
        </div>

        <ActivityLogList logs={logs} />
      </main>
    </div>
  );
}

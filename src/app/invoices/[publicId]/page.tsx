import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Navbar from "@/components/navbar";
import InvoiceDetail from "@/components/invoice-detail";

export const dynamic = "force-dynamic";

interface InvoicePageProps {
  params: Promise<{
    publicId: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: InvoicePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  const { publicId } = await params;

  // Enforce ownership directly in database query
  const invoice = await prisma.invoice.findFirst({
    where: {
      publicId,
      userId: user.id,
    },
    select: {
      publicId: true,
      invoiceNumber: true,
      clientName: true,
      description: true,
      amountKobo: true,
      issueDate: true,
      status: true,
      createdAt: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InvoiceDetail invoice={invoice} />
      </main>
    </div>
  );
}

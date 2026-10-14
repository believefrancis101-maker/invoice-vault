import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import Navbar from "@/components/navbar";
import InvoiceList from "@/components/invoice-list";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch only the authenticated user's invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
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

  const totalInvoices = invoices.length;
  const totalKobo = invoices.reduce((acc, inv) => acc + inv.amountKobo, 0);
  const paidCount = invoices.filter((inv) => inv.status === "PAID").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Invoices
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage and track your client billing records.
            </p>
          </div>

          <Link
            href="/invoices/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </Link>
        </div>

        {/* Metric summary cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Invoices
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalInvoices}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Invoiced Value
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatNaira(totalKobo)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Settled (Paid)
            </span>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {paidCount} <span className="text-xs font-normal text-zinc-500">of {totalInvoices}</span>
            </div>
          </div>
        </div>

        {/* Invoice list view */}
        <InvoiceList invoices={invoices} />
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { formatNaira, formatDate } from "@/lib/format";
import StatusBadge from "@/components/status-badge";

export interface InvoiceItem {
  publicId: string;
  invoiceNumber: string;
  clientName: string;
  description?: string | null;
  amountKobo: number;
  issueDate: string | Date;
  status: string;
  createdAt: string | Date;
}

interface InvoiceListProps {
  invoices: InvoiceItem[];
}

export default function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No invoices yet
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          You haven&apos;t created any invoices. Create your first invoice record to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
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
            Create Your First Invoice
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-semibold">
                Invoice #
              </th>
              <th scope="col" className="px-6 py-3.5 font-semibold">
                Client
              </th>
              <th scope="col" className="px-6 py-3.5 font-semibold">
                Issue Date
              </th>
              <th scope="col" className="px-6 py-3.5 font-semibold">
                Status
              </th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">
                Amount
              </th>
              <th scope="col" className="px-6 py-3.5 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {invoices.map((inv) => (
              <tr
                key={inv.publicId}
                className="group transition-colors hover:bg-zinc-50/75 dark:hover:bg-zinc-800/40"
              >
                <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/invoices/${inv.publicId}`}
                    className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {inv.clientName}
                  </div>
                  {inv.description && (
                    <div className="text-xs text-zinc-500 line-clamp-1 dark:text-zinc-400">
                      {inv.description}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                  {formatDate(inv.issueDate)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {formatNaira(inv.amountKobo)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <Link
                    href={`/invoices/${inv.publicId}`}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

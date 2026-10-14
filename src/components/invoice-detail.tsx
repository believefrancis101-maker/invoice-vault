"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatNaira, formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import type { InvoiceItem } from "@/components/invoice-list";

interface InvoiceDetailProps {
  invoice: InvoiceItem;
}

export default function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/invoices/${invoice.publicId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete invoice");
        setIsDeleting(false);
        return;
      }

      // Deletion succeeded; redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Invoices
        </Link>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-400 dark:border-red-900/60 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete Invoice
        </button>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-800/30 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Invoice Record
              </span>
              <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {invoice.invoiceNumber}
              </h1>
            </div>
            <div>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Amount banner */}
          <div className="rounded-lg bg-zinc-50 p-5 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Amount
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
                {formatNaira(invoice.amountKobo)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ({invoice.amountKobo.toLocaleString()} kobo)
              </span>
            </div>
          </div>

          {/* Key fields grid */}
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Client Name
              </dt>
              <dd className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {invoice.clientName}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Issue Date
              </dt>
              <dd className="mt-1 text-base text-zinc-900 dark:text-zinc-100">
                {formatDate(invoice.issueDate)}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Description
              </dt>
              <dd className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {invoice.description || (
                  <span className="italic text-zinc-400">No description provided</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Record Created
              </dt>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(invoice.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Public Identifier
              </dt>
              <dd className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {invoice.publicId}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Invoice {invoice.invoiceNumber}?
                </h3>
              </div>
            </div>

            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete this invoice for{" "}
              <strong className="text-zinc-900 dark:text-zinc-200">{invoice.clientName}</strong>?
              This action cannot be undone. An audit record will be preserved for compliance and
              activity tracking.
            </p>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

export default function InvoiceNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Invoice Not Found
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The requested invoice record does not exist or you do not have permission to access it.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

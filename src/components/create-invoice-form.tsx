"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createInvoiceFormSchema,
  INVOICE_STATUSES,
  type CreateInvoiceFormInput,
} from "@/lib/validation/invoice";
import { formatNaira, nairaToKobo } from "@/lib/format";

export default function CreateInvoiceForm() {
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<CreateInvoiceFormInput>({
    invoiceNumber: "",
    clientName: "",
    description: "",
    amountNaira: "" as unknown as number,
    issueDate: todayStr,
    status: "DRAFT",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live preview calculation
  const amountNum = parseFloat(String(formData.amountNaira || 0));
  const previewKobo = isNaN(amountNum) || amountNum < 0 ? 0 : nairaToKobo(amountNum);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    setGeneralError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const clientValidation = createInvoiceFormSchema.safeParse(formData);
    if (!clientValidation.success) {
      const errs: Record<string, string> = {};
      clientValidation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errs[fieldName]) {
          errs[fieldName] = issue.message;
        }
      });
      setFieldErrors(errs);
      return;
    }

    const payload = {
      invoiceNumber: clientValidation.data.invoiceNumber,
      clientName: clientValidation.data.clientName,
      description: clientValidation.data.description || null,
      amountKobo: nairaToKobo(clientValidation.data.amountNaira),
      issueDate: new Date(clientValidation.data.issueDate).toISOString(),
      status: clientValidation.data.status,
    };

    setIsLoading(true);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const errs: Record<string, string> = {};
          Object.entries(data.details).forEach(([field, msgs]) => {
            if (Array.isArray(msgs) && msgs.length > 0) {
              errs[field] = msgs[0];
            }
          });
          setFieldErrors(errs);
        } else {
          setGeneralError(data.error || "Failed to create invoice.");
        }
        setIsLoading(false);
        return;
      }

      // Successful creation: navigate to detail view of new invoice
      router.push(`/invoices/${data.invoice.publicId}`);
      router.refresh();
    } catch {
      setGeneralError("Network error. Please verify your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create Invoice
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add a new invoice record to your vault.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </Link>
      </div>

      {generalError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        >
          {generalError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Invoice Number */}
          <div>
            <label
              htmlFor="invoiceNumber"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              required
              placeholder="e.g. INV-2026-001"
              value={formData.invoiceNumber}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.invoiceNumber}
              className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-offset-zinc-900 ${
                fieldErrors.invoiceNumber
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-300 bg-white dark:border-zinc-700 focus:border-blue-600"
              }`}
            />
            {fieldErrors.invoiceNumber && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.invoiceNumber}
              </p>
            )}
          </div>

          {/* Client Name */}
          <div>
            <label
              htmlFor="clientName"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              required
              placeholder="e.g. Apex Global Solutions"
              value={formData.clientName}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.clientName}
              className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-offset-zinc-900 ${
                fieldErrors.clientName
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-300 bg-white dark:border-zinc-700 focus:border-blue-600"
              }`}
            />
            {fieldErrors.clientName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.clientName}
              </p>
            )}
          </div>

          {/* Amount in Naira */}
          <div>
            <label
              htmlFor="amountNaira"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount (₦ Naira) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-semibold">
                ₦
              </span>
              <input
                id="amountNaira"
                name="amountNaira"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amountNaira}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.amountNaira}
                className={`w-full rounded-lg border pl-8 pr-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-offset-zinc-900 ${
                  fieldErrors.amountNaira
                    ? "border-red-500 focus:border-red-500"
                    : "border-zinc-300 bg-white dark:border-zinc-700 focus:border-blue-600"
                }`}
              />
            </div>
            {fieldErrors.amountNaira ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.amountNaira}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Preview: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatNaira(previewKobo)}</span> ({previewKobo.toLocaleString()} kobo)
              </p>
            )}
          </div>

          {/* Issue Date */}
          <div>
            <label
              htmlFor="issueDate"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Issue Date <span className="text-red-500">*</span>
            </label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              required
              value={formData.issueDate}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.issueDate}
              className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-offset-zinc-900 ${
                fieldErrors.issueDate
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-300 bg-white dark:border-zinc-700 focus:border-blue-600"
              }`}
            />
            {fieldErrors.issueDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.issueDate}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="sm:col-span-2">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-zinc-900 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-offset-zinc-900"
            >
              {INVOICE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Description <span className="text-xs text-zinc-500">(Optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Brief summary of services rendered or goods sold..."
              value={formData.description}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.description}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-offset-zinc-900"
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
          >
            {isLoading ? "Saving Invoice..." : "Save Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

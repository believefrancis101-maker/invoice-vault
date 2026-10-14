import { z } from "zod";

export const INVOICE_STATUSES = [
  "DRAFT",
  "PENDING",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES, {
  message: `Status must be one of: ${INVOICE_STATUSES.join(", ")}`,
});

/**
 * Invoice creation input schema for server and client validation.
 * Accepts amountKobo as positive integer.
 */
export const createInvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_\-\/]+$/, "Invoice number can only contain letters, numbers, hyphens, slashes, and underscores"),
  clientName: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(100, "Client name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal(""))
    .nullable(),
  amountKobo: z.coerce
    .number({
      message: "Amount must be a valid number",
    })
    .int("Amount must be a whole number of kobo")
    .positive("Amount must be greater than zero"),
  issueDate: z.coerce.date({
    message: "Please provide a valid issue date",
  }),
  status: invoiceStatusSchema.default("DRAFT"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Schema for frontend forms which allows inputting Naira value
 * and converts to kobo for backend submission.
 */
export const createInvoiceFormSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(50, "Invoice number cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_\-\/]+$/, "Invoice number can only contain letters, numbers, hyphens, slashes, and underscores"),
  clientName: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(100, "Client name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  amountNaira: z.coerce
    .number({
      message: "Amount must be a valid number",
    })
    .positive("Amount must be greater than zero"),
  issueDate: z
    .string()
    .min(1, "Issue date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Please enter a valid date"),
  status: invoiceStatusSchema.default("DRAFT"),
});

export type CreateInvoiceFormInput = z.infer<typeof createInvoiceFormSchema>;

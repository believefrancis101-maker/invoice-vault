/**
 * Formatting helpers for Nigerian Naira (NGN) and dates
 * Amounts are stored as integer kobo (100 kobo = 1 Naira)
 */

export function formatNaira(amountKobo: number): string {
  if (typeof amountKobo !== "number" || isNaN(amountKobo)) {
    return "₦0.00";
  }

  const naira = amountKobo / 100;
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);

  return `₦${formatted}`;
}

export function koboToNaira(amountKobo: number): number {
  if (typeof amountKobo !== "number" || isNaN(amountKobo)) {
    return 0;
  }
  return amountKobo / 100;
}

export function nairaToKobo(naira: number | string): number {
  const num = typeof naira === "string" ? parseFloat(naira.replace(/,/g, "")) : naira;
  if (isNaN(num) || num < 0) {
    return 0;
  }
  return Math.round(num * 100);
}

export function formatDate(dateInput: Date | string | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "Invalid Date";
  }
}

export function formatDateTime(dateInput: Date | string | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "Invalid Date";
  }
}

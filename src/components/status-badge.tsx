import { InvoiceStatus } from "@/lib/validation/invoice";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase() as InvoiceStatus;

  const styleMap: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
    DRAFT: {
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-700 dark:text-zinc-300",
      dot: "bg-zinc-400",
    },
    PENDING: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
    },
    PAID: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
    },
    OVERDUE: {
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
      dot: "bg-red-500",
    },
    CANCELLED: {
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-500 dark:text-zinc-400 line-through",
      dot: "bg-zinc-400",
    },
  };

  const style = styleMap[normalized] || {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {normalized}
    </span>
  );
}

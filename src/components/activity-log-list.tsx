"use client";

import { formatDateTime, formatNaira } from "@/lib/format";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityPublicId: string;
  entityLabel: string;
  details?: string | null;
  createdAt: string | Date;
}

interface ActivityLogListProps {
  logs: AuditLogItem[];
}

export default function ActivityLogList({ logs }: ActivityLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No activity records yet
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Audit records will appear here whenever an invoice deletion or major lifecycle event occurs.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {logs.map((log) => {
          let parsedDetails: { clientName?: string; amountKobo?: number; status?: string } | null = null;
          if (log.details) {
            try {
              parsedDetails = JSON.parse(log.details);
            } catch {
              parsedDetails = null;
            }
          }

          return (
            <div key={log.id} className="p-5 sm:px-6 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900">
                    {log.action}
                  </span>
                  <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {log.entityLabel}
                  </span>
                </div>
                <time className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(log.createdAt)}
                </time>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  Entity: <strong className="font-medium text-zinc-900 dark:text-zinc-300">{log.entityType}</strong>
                </span>
                <span>
                  Public ID: <code className="font-mono text-zinc-500 dark:text-zinc-400">{log.entityPublicId}</code>
                </span>
                {parsedDetails?.clientName && (
                  <span>
                    Client: <strong className="font-medium text-zinc-900 dark:text-zinc-300">{parsedDetails.clientName}</strong>
                  </span>
                )}
                {typeof parsedDetails?.amountKobo === "number" && (
                  <span>
                    Amount: <strong className="font-medium text-zinc-900 dark:text-zinc-300">{formatNaira(parsedDetails.amountKobo)}</strong>
                  </span>
                )}
                {parsedDetails?.status && (
                  <span>
                    Status at deletion: <strong className="font-medium text-zinc-900 dark:text-zinc-300">{parsedDetails.status}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

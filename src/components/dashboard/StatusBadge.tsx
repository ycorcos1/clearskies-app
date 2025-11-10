"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type Status = "safe" | "caution" | "unsafe" | undefined;

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<
  Exclude<Status, undefined>,
  { label: string; icon: JSX.Element; className: string }
> = {
  safe: {
    label: "Safe",
    icon: <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  caution: {
    label: "Caution",
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  },
  unsafe: {
    label: "Unsafe",
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
    className: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status || !STATUS_CONFIG[status]) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Unknown
      </span>
    );
  }

  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;

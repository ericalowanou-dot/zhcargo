"use client";

import type { PaymentStatus } from "@prisma/client";

type BadgeProps = {
  status: PaymentStatus | string;
};

const MAP: Record<string, { label: string; cls: string }> = {
  SUCCESS: { label: "Confirmé", cls: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
  FAILED: { label: "Échoué", cls: "bg-rose-100 text-rose-700" },
  EXPIRED: { label: "Expiré", cls: "bg-slate-200 text-slate-700" },
  REFUNDED: { label: "Remboursé", cls: "bg-violet-100 text-violet-700" },
};

export function PaymentStatusBadge({ status }: BadgeProps) {
  const x = MAP[String(status || "").toUpperCase()] || {
    label: "—",
    cls: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${x.cls}`}
    >
      {x.label}
    </span>
  );
}


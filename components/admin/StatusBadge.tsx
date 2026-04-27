"use client";

import type { OrderStatus } from "@prisma/client";

const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "En attente",
    className: "bg-slate-100 text-slate-700",
  },
  PAID: {
    label: "Payée",
    className: "bg-blue-100 text-blue-800",
  },
  PROCESSING: {
    label: "En traitement",
    className: "bg-amber-100 text-amber-900",
  },
  TRANSIT: {
    label: "En transit",
    className: "bg-violet-100 text-violet-800",
  },
  DELIVERED: {
    label: "Livrée",
    className: "bg-emerald-100 text-emerald-800",
  },
  CANCELLED: {
    label: "Annulée",
    className: "bg-red-100 text-red-800",
  },
};

export function StatusBadge({
  status,
  large = false,
}: {
  status: OrderStatus;
  large?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 font-medium ${meta.className} ${
        large ? "text-sm" : "text-xs"
      }`}
    >
      {meta.label}
    </span>
  );
}

export function statusLabel(status: OrderStatus) {
  return STATUS_META[status].label;
}

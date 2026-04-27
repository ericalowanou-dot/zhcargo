"use client";

import { formatFcfa } from "@/lib/invoiceFormat";
import type { ReactNode } from "react";

export function PartnerCard({
  name,
  role,
  percentage,
  totalProfit,
  onPercentageChange,
  actions,
}: {
  name: string;
  role: string;
  percentage: number;
  totalProfit: number;
  onPercentageChange: (n: number) => void;
  actions?: ReactNode;
}) {
  const amount = (totalProfit * percentage) / 100;
  const invalid = percentage < 0 || percentage > 100;
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-t border-slate-100 py-2 text-sm">
      <div className="col-span-4 min-w-0">
        <p className="truncate font-medium text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{role}</p>
      </div>
      <div className="col-span-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={percentage}
            min={0}
            max={100}
            step="0.01"
            onChange={(e) => onPercentageChange(Number(e.target.value))}
            className={`w-20 rounded border px-2 py-1 text-sm ${
              invalid ? "border-red-400 bg-red-50" : "border-slate-200"
            }`}
          />
          <span>%</span>
        </div>
      </div>
      <div className="col-span-4 font-semibold text-[#1A3C6E]">{formatFcfa(amount)}</div>
      <div className="col-span-2 flex justify-end gap-2">{actions}</div>
    </div>
  );
}

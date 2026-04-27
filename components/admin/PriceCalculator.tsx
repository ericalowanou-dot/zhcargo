"use client";

import { formatFcfa } from "@/lib/invoiceFormat";

type Props = {
  purchasePrice: number;
  transportCost: number;
  margin: number;
  onPurchaseChange: (v: number) => void;
  onTransportChange: (v: number) => void;
  onMarginChange: (v: number) => void;
};

function fmtNum(n: string): number {
  const x = parseFloat(n.replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

export function PriceCalculator({
  purchasePrice,
  transportCost,
  margin,
  onPurchaseChange,
  onTransportChange,
  onMarginChange,
}: Props) {
  const sale = purchasePrice + transportCost + margin;
  const profit = margin;
  const marginPct = sale > 0 ? (margin / sale) * 100 : 0;

  const a = formatFcfa(purchasePrice).replace(" FCFA", "");
  const b = formatFcfa(transportCost).replace(" FCFA", "");
  const c = formatFcfa(margin).replace(" FCFA", "");

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-slate-600">
        Prix d’achat Chine (FCFA) <span className="text-red-500">*</span>
        <input
          type="number"
          min={0}
          step="1"
          required
          placeholder="Ex: 8000"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={Number.isNaN(purchasePrice) ? "" : purchasePrice}
          onChange={(e) => onPurchaseChange(fmtNum(e.target.value))}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Frais de transport unitaires (FCFA) <span className="text-red-500">*</span>
        <input
          type="number"
          min={0}
          step="1"
          required
          placeholder="Ex: 2000"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={Number.isNaN(transportCost) ? "" : transportCost}
          onChange={(e) => onTransportChange(fmtNum(e.target.value))}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Marge bénéficiaire (FCFA) <span className="text-red-500">*</span>
        <input
          type="number"
          min={0}
          step="1"
          required
          placeholder="Ex: 2500"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={Number.isNaN(margin) ? "" : margin}
          onChange={(e) => onMarginChange(fmtNum(e.target.value))}
        />
      </label>

      <div className="rounded-xl border-2 border-[#1A3C6E] bg-blue-50/50 p-4">
        <p className="text-xs font-medium text-slate-600">
          PRIX DE VENTE FINAL (automatique)
        </p>
        <p className="mt-1 text-sm text-slate-600">
          = {a} + {b} + {c} ={" "}
          <span className="text-lg font-extrabold text-[#1A3C6E]">
            {formatFcfa(sale)}
          </span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Ce prix sera affiché au client
        </p>
      </div>

      <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p>
          Bénéfice par unité :{" "}
          <span className="font-semibold text-[#E67E22]">
            {formatFcfa(profit)}
          </span>
        </p>
        <p>
          Marge bénéficiaire :{" "}
          <span className="font-semibold text-slate-800">
            {marginPct.toFixed(1)} %
          </span>{" "}
          <span className="text-slate-500">(marge / prix de vente)</span>
        </p>
      </div>
    </div>
  );
}

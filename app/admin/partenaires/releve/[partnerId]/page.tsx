"use client";

import { RevenueChart } from "@/components/admin/RevenueChart";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type ReleveData = {
  partner: { id: string; name: string; role: string; percentage: number };
  totalProfit: number;
  totalShare: number;
  breakdown: {
    date: string;
    invoiceNumber: string;
    products: string;
    orderProfit: number;
    partnerShare: number;
  }[];
};

function defaultRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export default function PartnerRelevePage() {
  const params = useParams<{ partnerId: string }>();
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReleveData | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(
      `/api/admin/partenaires/releve/${params.partnerId}?from=${from}&to=${to}`,
    );
    const j = (await res.json()) as ReleveData & { error?: string };
    setLoading(false);
    if (!res.ok) {
      toast.error(j.error || "Impossible de charger le relevé");
      return;
    }
    setData(j);
  }

  const monthlyData = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, number>();
    for (const b of data.breakdown) {
      const d = new Date(b.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, (m.get(key) || 0) + b.partnerShare);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));
  }, [data]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Relevé partenaire</h2>
        {data && (
          <p className="text-sm text-slate-600">
            {data.partner.name} — {data.partner.role}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            Du{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1"
            />
          </label>
          <label className="text-xs text-slate-500">
            Au{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={load}
            className="rounded bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
          >
            Générer
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(
                `/api/admin/partenaires/releve/${params.partnerId}/pdf?from=${from}&to=${to}`,
                "_blank",
              )
            }
            className="rounded bg-[#E67E22] px-3 py-2 text-sm font-semibold text-white"
          >
            Télécharger le relevé PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
        </div>
      )}

      {data && !loading && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              Bénéfice net total période: {formatFcfa(data.totalProfit)}
            </p>
            <p className="text-sm text-slate-600">
              Pourcentage: {data.partner.percentage.toFixed(2)}%
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">
              Votre part: {formatFcfa(data.totalShare)}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-600">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">N° Commande</th>
                  <th className="px-2 py-2">Produits</th>
                  <th className="px-2 py-2">Bénéfice commande</th>
                  <th className="px-2 py-2">Votre part</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((b, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      {new Date(b.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-2 py-2">{b.invoiceNumber}</td>
                    <td className="max-w-[360px] truncate px-2 py-2">{b.products}</td>
                    <td className="px-2 py-2">{formatFcfa(b.orderProfit)}</td>
                    <td className="px-2 py-2 font-semibold text-[#1A3C6E]">
                      {formatFcfa(b.partnerShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">
              Comparatif des 6 derniers mois
            </h3>
            <div className="mt-3">
              <RevenueChart
                type="bar"
                data={monthlyData.map((m) => ({ ...m, date: m.month }))}
                xKey="month"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

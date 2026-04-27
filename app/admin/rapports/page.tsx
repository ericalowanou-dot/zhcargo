"use client";

import { RevenueChart } from "@/components/admin/RevenueChart";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type ReportData = {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  ordersCount: { delivered: number; transit: number; cancelled: number };
  revenueByDate: { date: string; revenue: number; profit: number }[];
  revenueByCategory: { category: string; revenue: number; profit: number }[];
  productPerformance: {
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    purchaseCost: number;
    transportCost: number;
    totalCost: number;
    profit: number;
    marginPercent: number;
  }[];
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(key: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(today);
  endToday.setDate(today.getDate());
  switch (key) {
    case "today":
      return { from: isoDay(today), to: isoDay(today) };
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: isoDay(from), to: isoDay(today) };
    }
    case "thisMonth": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: isoDay(from), to: isoDay(today) };
    }
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: isoDay(from), to: isoDay(to) };
    }
    case "thisYear": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: isoDay(from), to: isoDay(today) };
    }
    default:
      return { from: isoDay(today), to: isoDay(today) };
  }
}

export default function AdminRapportsPage() {
  const [preset, setPreset] = useState("last7");
  const [from, setFrom] = useState(presetRange("last7").from);
  const [to, setTo] = useState(presetRange("last7").to);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<keyof ReportData["productPerformance"][number]>("profit");

  async function loadReport(customFrom = from, customTo = to) {
    setLoading(true);
    const res = await fetch(`/api/admin/rapports?from=${customFrom}&to=${customTo}`);
    const j = (await res.json()) as ReportData & { error?: string };
    setLoading(false);
    if (!res.ok) {
      toast.error(j.error || "Impossible de charger le rapport");
      return;
    }
    setData(j);
  }

  const sortedProducts = useMemo(() => {
    if (!data) return [];
    return [...data.productPerformance].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (typeof va === "number" && typeof vb === "number") return vb - va;
      return String(vb).localeCompare(String(va));
    });
  }, [data, sortBy]);

  const previousLabel = "vs période précédente";
  const marginColor = (m: number) =>
    m > 30 ? "text-emerald-600" : m >= 15 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-extrabold text-slate-900">Rapports Financiers</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          {[
            ["today", "Aujourd'hui"],
            ["last7", "7 derniers jours"],
            ["thisMonth", "Ce mois"],
            ["lastMonth", "Mois dernier"],
            ["thisYear", "Cette année"],
            ["custom", "Personnalisé"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setPreset(k);
                if (k !== "custom") {
                  const r = presetRange(k);
                  setFrom(r.from);
                  setTo(r.to);
                }
              }}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                preset === k
                  ? "border-[#1A3C6E] bg-[#1A3C6E] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}

          <label className="ml-2 text-xs text-slate-500">
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
            onClick={() => loadReport()}
            className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
          >
            Générer le rapport
          </button>
          <button
            type="button"
            onClick={() => window.open(`/api/admin/rapports/pdf?from=${from}&to=${to}`, "_blank")}
            className="rounded-lg bg-[#E67E22] px-3 py-2 text-sm font-semibold text-white"
          >
            Exporter PDF
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Chiffre d&apos;affaires</p>
              <p className="mt-1 text-2xl font-extrabold text-[#1A3C6E]">
                {formatFcfa(data.totalRevenue)}
              </p>
              <p className="text-xs text-slate-500">
                {data.ordersCount.delivered} commandes livrées
              </p>
              <p className="mt-1 text-xs text-emerald-600">↗ {previousLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Coûts totaux</p>
              <p className="mt-1 text-2xl font-extrabold text-[#E67E22]">
                {formatFcfa(data.totalCost)}
              </p>
              <p className="text-xs text-slate-500">Achat + Transport</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Bénéfice net</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                {formatFcfa(data.totalProfit)}
              </p>
              <p className="text-xs text-slate-500">
                Marge moyenne: {data.averageMargin.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">Commandes</p>
              <p className="mt-1 text-sm text-slate-700">
                {data.ordersCount.delivered} livrées | {data.ordersCount.transit} en transit |{" "}
                {data.ordersCount.cancelled} annulées
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">
                Évolution Revenus / Bénéfices
              </h3>
              <div className="mt-2">
                <RevenueChart
                  type="area"
                  data={data.revenueByDate.map((d) => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  }))}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Répartition par catégorie</h3>
              <div className="mt-2">
                <RevenueChart type="pie" data={data.revenueByCategory} xKey="category" />
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600">
                {data.revenueByCategory.map((c) => (
                  <p key={c.category}>
                    {c.category}: {formatFcfa(c.revenue)}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-slate-800">Performance produits</h3>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-600">
                <tr>
                  {[
                    ["name", "Produit"],
                    ["unitsSold", "Unités vendues"],
                    ["revenue", "Revenus"],
                    ["purchaseCost", "Coût achat"],
                    ["transportCost", "Transport"],
                    ["profit", "Bénéfice net"],
                    ["marginPercent", "Marge %"],
                  ].map(([k, label]) => (
                    <th key={k} className="px-2 py-2 font-medium">
                      <button type="button" onClick={() => setSortBy(k as never)}>
                        {label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => (
                  <tr key={p.productId} className="border-t border-slate-100">
                    <td className="px-2 py-2">{p.name}</td>
                    <td className="px-2 py-2">{p.unitsSold}</td>
                    <td className="px-2 py-2">{formatFcfa(p.revenue)}</td>
                    <td className="px-2 py-2">{formatFcfa(p.purchaseCost)}</td>
                    <td className="px-2 py-2">{formatFcfa(p.transportCost)}</td>
                    <td className="px-2 py-2 font-semibold text-[#1A3C6E]">
                      {formatFcfa(p.profit)}
                    </td>
                    <td className={`px-2 py-2 font-semibold ${marginColor(p.marginPercent)}`}>
                      {p.marginPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2">
                    {data.productPerformance.reduce((s, p) => s + p.unitsSold, 0)}
                  </td>
                  <td className="px-2 py-2">{formatFcfa(data.totalRevenue)}</td>
                  <td className="px-2 py-2">
                    {formatFcfa(data.productPerformance.reduce((s, p) => s + p.purchaseCost, 0))}
                  </td>
                  <td className="px-2 py-2">
                    {formatFcfa(data.productPerformance.reduce((s, p) => s + p.transportCost, 0))}
                  </td>
                  <td className="px-2 py-2">{formatFcfa(data.totalProfit)}</td>
                  <td className="px-2 py-2">{data.averageMargin.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

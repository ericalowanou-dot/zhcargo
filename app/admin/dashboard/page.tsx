"use client";

import { formatFcfa } from "@/lib/invoiceFormat";
import { RevenueChart7 } from "@/components/admin/RevenueChart7";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_BADGE: Record<
  OrderStatus,
  { className: string; label: string }
> = {
  PENDING: {
    className: "bg-slate-100 text-slate-700",
    label: "En attente de paiement",
  },
  PAID: { className: "bg-blue-100 text-blue-800", label: "Payée" },
  PROCESSING: {
    className: "bg-amber-100 text-amber-900",
    label: "En traitement",
  },
  TRANSIT: {
    className: "bg-violet-100 text-violet-800",
    label: "En transit",
  },
  DELIVERED: { className: "bg-emerald-100 text-emerald-800", label: "Livrée" },
  CANCELLED: { className: "bg-red-100 text-red-800", label: "Annulée" },
};

type Stats = {
  todayRevenue: number;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  monthlyProfit: number;
  lowStockCount: number;
  last10Orders: {
    id: string;
    orderNumber: string;
    clientName: string;
    totalFcfa: number;
    status: OrderStatus;
    createdAt: string;
  }[];
  top5Products: {
    rank: number;
    name: string;
    quantitySold: number;
    revenue: number;
  }[];
  last7DaysRevenue: { date: string; label: string; revenue: number; profit: number }[];
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_BADGE[status] ?? STATUS_BADGE.PENDING;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/dashboard/stats");
    if (!res.ok) {
      setErr("Impossible de charger les statistiques.");
      return;
    }
    const d = (await res.json()) as Stats;
    setStats(d);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date());

  if (!stats && !err) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  if (err || !stats) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {err || "Erreur"}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">{subDate}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Chiffre d&apos;affaires aujourd&apos;hui</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1A3C6E]">
            {formatFcfa(stats.todayRevenue)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {stats.todayOrdersCount} commande{stats.todayOrdersCount !== 1 ? "s" : ""} payée{stats.todayOrdersCount !== 1 ? "s" : ""} aujourd&apos;hui
          </p>
        </div>

        <Link
          href="/admin/commandes?status=PAID"
          className="block rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm transition hover:border-amber-300"
        >
          <p className="text-sm font-medium text-slate-500">Commandes en attente</p>
          <p className="mt-1 text-2xl font-extrabold text-[#E67E22]">
            {stats.pendingOrdersCount}
          </p>
          <p className="mt-2 text-xs text-amber-800/80">À traiter</p>
        </Link>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Bénéfice net du mois</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">
            {formatFcfa(stats.monthlyProfit)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Après déduction des coûts</p>
        </div>

        <Link
          href="/admin/produits?filtre=stock_faible"
          className="block rounded-2xl border border-red-200/80 bg-white p-5 shadow-sm transition hover:border-red-300"
        >
          <p className="text-sm font-medium text-slate-500">Alertes stock faible</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">
            {stats.lowStockCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">Produits avec stock &lt; 5</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-3">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">Dernières commandes</h3>
          </div>
          <div className="max-h-[400px] overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">N° Commande</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.last10Orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-3 py-2">{o.clientName}</td>
                    <td className="px-3 py-2 font-medium text-[#E67E22]">
                      {formatFcfa(o.totalFcfa)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(o.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/commandes/${o.id}`}
                        className="text-xs font-semibold text-[#1A3C6E] hover:underline"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-800">Produits les plus vendus</h3>
          <ul className="mt-3 space-y-2">
            {stats.top5Products.map((p) => (
              <li
                key={p.rank}
                className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0"
              >
                <span className="font-bold text-slate-400">#{p.rank}</span>
                <span className="min-w-0 flex-1 text-slate-800">{p.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {p.quantitySold} u. · {formatFcfa(p.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">Revenus des 7 derniers jours</h3>
        <div className="mt-4">
          <RevenueChart7 data={stats.last7DaysRevenue} />
        </div>
      </div>
    </div>
  );
}

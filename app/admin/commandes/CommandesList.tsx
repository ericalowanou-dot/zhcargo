"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatFcfa } from "@/lib/invoiceFormat";
import type { OrderStatus } from "@prisma/client";
import { Download, Eye, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TABS: { key: "ALL" | OrderStatus; label: string }[] = [
  { key: "ALL", label: "Toutes" },
  { key: "PENDING", label: "En attente" },
  { key: "PAID", label: "Payées" },
  { key: "PROCESSING", label: "En traitement" },
  { key: "TRANSIT", label: "En transit" },
  { key: "DELIVERED", label: "Livrées" },
  { key: "CANCELLED", label: "Annulées" },
];

type Row = {
  id: string;
  invoiceNumber: string;
  client: { id: string; name: string; phone: string };
  productsLabel: string;
  totalFcfa: number;
  operatorLabel: string;
  status: OrderStatus;
  createdAt: string;
};

type Counts = Record<"ALL" | OrderStatus, number>;

const ORDER_STATUS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

export function CommandesList() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Counts>({
    ALL: 0,
    PENDING: 0,
    PAID: 0,
    PROCESSING: 0,
    TRANSIT: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rowStatusDraft, setRowStatusDraft] = useState<Record<string, OrderStatus>>({});

  useEffect(() => {
    const st = params.get("status");
    if (st && (st === "ALL" || ORDER_STATUS.includes(st as OrderStatus))) {
      setStatus(st as "ALL" | OrderStatus);
    }
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (status !== "ALL") q.set("status", status);
    if (searchDebounced.trim()) q.set("search", searchDebounced.trim());
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return q.toString();
  }, [page, status, searchDebounced, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/commandes?${qs}`);
      if (!res.ok) {
        toast.error("Impossible de charger les commandes");
        return;
      }
      const data = (await res.json()) as {
        orders: Row[];
        counts: Counts;
        total: number;
        totalPages: number;
      };
      setRows(data.orders);
      setCounts(data.counts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setRowStatusDraft(
        Object.fromEntries(data.orders.map((o) => [o.id, o.status])) as Record<
          string,
          OrderStatus
        >,
      );
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string) => {
    const next = rowStatusDraft[id];
    if (!next) return;
    const res = await fetch(`/api/admin/commandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error || "Mise à jour impossible");
      return;
    }
    toast.success("Statut mis à jour");
    load();
  };

  const exportCsv = () => {
    window.open(`/api/admin/commandes/export?${qs}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Gestion des Commandes</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label className="block min-w-[320px]">
            <span className="text-xs text-slate-500">
              Rechercher par N° commande ou client...
            </span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              Du
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </label>
            <label className="text-xs text-slate-500">
              Au
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </label>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                status === t.key
                  ? "border-[#1A3C6E] bg-[#1A3C6E] text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 ${
                  status === t.key ? "bg-white/20" : "bg-slate-100"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
          </div>
        ) : (
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">N° Commande</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Téléphone</th>
                <th className="px-3 py-2 font-medium">Produits</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Opérateur</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/commandes/${o.id}`}
                      className="font-mono text-xs font-bold text-[#1A3C6E] hover:underline"
                    >
                      {o.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{o.client.name}</td>
                  <td className="px-3 py-2">{o.client.phone}</td>
                  <td className="max-w-[280px] px-3 py-2 text-slate-600">
                    <p className="truncate">{o.productsLabel}</p>
                  </td>
                  <td className="px-3 py-2 font-extrabold text-[#E67E22]">
                    {formatFcfa(o.totalFcfa)}
                  </td>
                  <td className="px-3 py-2">{o.operatorLabel}</td>
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
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/commandes/${o.id}`}
                        className="inline-flex items-center gap-1 text-[#1A3C6E] hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir
                      </Link>
                      <select
                        className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                        value={rowStatusDraft[o.id] || o.status}
                        onChange={(e) =>
                          setRowStatusDraft((p) => ({
                            ...p,
                            [o.id]: e.target.value as OrderStatus,
                          }))
                        }
                      >
                        {ORDER_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => updateStatus(o.id)}
                        className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                      >
                        Mettre à jour
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{total} commandes trouvées</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </button>
          <span className="px-2 text-sm text-slate-600">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

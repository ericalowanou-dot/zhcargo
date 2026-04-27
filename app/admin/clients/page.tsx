"use client";

import { ClientAvatar } from "@/components/admin/ClientAvatar";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Download, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Row = {
  id: string;
  name: string | null;
  phone: string;
  country: string;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  inProgressCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
};

const COUNTRIES = [
  { v: "ALL", label: "Tous" },
  { v: "TG", label: "Togo" },
  { v: "BJ", label: "Bénin" },
  { v: "CI", label: "Côte d'Ivoire" },
  { v: "GA", label: "Gabon" },
  { v: "BF", label: "Burkina Faso" },
  { v: "SN", label: "Sénégal" },
];

const SORTS = [
  { v: "recent", label: "Plus récents" },
  { v: "spent", label: "Plus dépensé" },
  { v: "orders", label: "Plus de commandes" },
];

function countryLabel(code: string) {
  return COUNTRIES.find((c) => c.v === code)?.label || code;
}

function relativeOrDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  const diffDays = Math.floor((Date.now() - +d) / 86400000);
  if (diffDays >= 0 && diffDays <= 7) {
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "il y a 1 jour";
    return `il y a ${diffDays} jours`;
  }
  return d.toLocaleDateString("fr-FR");
}

export default function AdminClientsPage() {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [country, setCountry] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRevenueGenerated, setTotalRevenueGenerated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("country", country);
    q.set("sort", sort);
    if (searchDebounced.trim()) q.set("search", searchDebounced.trim());
    return q.toString();
  }, [page, country, sort, searchDebounced]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients?${qs}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        clients: Row[];
        total: number;
        totalPages: number;
        totalRevenueGenerated: number;
      };
      setRows(data.clients);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setTotalRevenueGenerated(data.totalRevenueGenerated);
    } catch {
      toast.error("Impossible de charger les clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [qs]);

  const exportCsv = () => window.open(`/api/admin/clients/export?${qs}`, "_blank");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Gestion des Clients</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[280px] flex-1">
            <span className="text-xs text-slate-500">Recherche</span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher par nom ou téléphone..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </label>
          <label className="text-xs text-slate-500">
            Pays
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
              className="ml-1 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700"
            >
              {COUNTRIES.map((x) => (
                <option key={x.v} value={x.v}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Tri
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="ml-1 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700"
            >
              {SORTS.map((x) => (
                <option key={x.v} value={x.v}>
                  {x.label}
                </option>
              ))}
            </select>
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
          </div>
        ) : (
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Téléphone</th>
                <th className="px-3 py-2 font-medium">Pays</th>
                <th className="px-3 py-2 font-medium">Commandes</th>
                <th className="px-3 py-2 font-medium">Total dépensé</th>
                <th className="px-3 py-2 font-medium">Dernière commande</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, idx) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-500">
                    {(page - 1) * 30 + idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ClientAvatar phone={c.phone} name={c.name} />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {c.name || "Client anonyme"}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{c.phone}</td>
                  <td className="px-3 py-2">{countryLabel(c.country)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700"
                      title={`${c.deliveredCount} livrées, ${c.inProgressCount} en cours, ${c.cancelledCount} annulées`}
                    >
                      {c.ordersCount}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-extrabold text-[#E67E22]">
                    {formatFcfa(c.totalSpent)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {relativeOrDate(c.lastOrderDate)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3 text-sm">
                      <Link href={`/admin/clients/${c.id}`} className="text-[#1A3C6E] hover:underline">
                        Voir profil
                      </Link>
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {total} clients au total | {formatFcfa(totalRevenueGenerated)} générés
        </p>
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

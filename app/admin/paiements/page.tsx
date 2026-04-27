"use client";

import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { formatFcfa } from "@/lib/invoiceFormat";
import type { PaymentStatus } from "@prisma/client";
import { Loader2, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Row = {
  id: string;
  transactionId: string | null;
  operator: string;
  amountFcfa: number;
  status: PaymentStatus;
  createdAt: string;
  order: {
    id: string;
    client: { name: string | null; phone: string };
  };
};

const TABS: { id: string; label: string }[] = [
  { id: "ALL", label: "Tous" },
  { id: "SUCCESS", label: "Confirmés" },
  { id: "PENDING", label: "En attente" },
  { id: "FAILED", label: "Échoués" },
  { id: "EXPIRED", label: "Expirés" },
];

const OPS = ["ALL", "TMoney", "Flooz", "MTN", "Orange Money", "Wave"];

function shortRef(v: string | null) {
  if (!v) return "—";
  return v.length > 14 ? `${v.slice(0, 14)}...` : v;
}

function opLabel(op: string) {
  const x = op.toLowerCase();
  if (x.includes("tmoney")) return "TMoney";
  if (x.includes("flooz")) return "Flooz";
  if (x.includes("mtn")) return "MTN";
  if (x.includes("orange")) return "Orange Money";
  if (x.includes("wave")) return "Wave";
  return op || "—";
}

export default function AdminPaiementsPage() {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("ALL");
  const [operator, setOperator] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({ ALL: 0 });
  const [summary, setSummary] = useState({
    totalConfirmed: 0,
    totalPending: 0,
    totalFailedExpired: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("status", status);
    q.set("operator", operator);
    if (searchDebounced.trim()) q.set("search", searchDebounced.trim());
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return q.toString();
  }, [page, status, operator, searchDebounced, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/paiements?${qs}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        payments: Row[];
        total: number;
        totalPages: number;
        counts: Record<string, number>;
        summary: typeof summary;
      };
      setRows(data.payments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCounts(data.counts || { ALL: 0 });
      setSummary(data.summary);
    } catch {
      toast.error("Impossible de charger les paiements");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (id: string) => {
    const res = await fetch(`/api/admin/paiements/${id}/verifier`, { method: "POST" });
    if (!res.ok) {
      toast.error("Vérification impossible");
      return;
    }
    toast.success("Statut vérifié");
    load();
  };

  const refund = async (id: string) => {
    const reason = window.prompt("Motif du remboursement");
    if (!reason) return;
    const ok = window.confirm("Confirmer le remboursement de ce paiement ?");
    if (!ok) return;
    const res = await fetch(`/api/admin/paiements/${id}/rembourser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(json.error || "Remboursement impossible");
      return;
    }
    toast.success("Remboursement initié");
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Suivi des Paiements</h2>

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
                placeholder="Rechercher par référence ou téléphone..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
              />
            </div>
          </label>
          <label className="text-xs text-slate-500">
            Opérateur
            <select
              value={operator}
              onChange={(e) => {
                setOperator(e.target.value);
                setPage(1);
              }}
              className="ml-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            >
              {OPS.map((x) => (
                <option key={x} value={x}>
                  {x === "ALL" ? "Tous" : x}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Du
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-1 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-500">
            Au
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-1 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
          </label>
          <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                status === t.id ? "border-[#1A3C6E] bg-[#1A3C6E] text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <span>{t.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 ${status === t.id ? "bg-white/20" : "bg-slate-100"}`}>
                {counts[t.id] || 0}
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
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">N° Commande</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Téléphone</th>
                <th className="px-3 py-2">Opérateur</th>
                <th className="px-3 py-2">Montant</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{shortRef(p.transactionId)}</span>
                      {p.transactionId ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(p.transactionId || "");
                            toast.success("Référence copiée");
                          }}
                          className="text-[11px] text-[#1A3C6E] hover:underline"
                        >
                          Copier
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/commandes/${p.order.id}`} className="font-mono text-xs font-bold text-[#1A3C6E] hover:underline">
                      {p.order.id.slice(0, 12)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{p.order.client.name || "Client anonyme"}</td>
                  <td className="px-3 py-2">{p.order.client.phone}</td>
                  <td className="px-3 py-2">{opLabel(p.operator)}</td>
                  <td className="px-3 py-2 font-extrabold text-[#E67E22]">{formatFcfa(p.amountFcfa)}</td>
                  <td className="px-3 py-2"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(p.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Link href={`/admin/commandes/${p.order.id}`} className="text-[#1A3C6E] hover:underline">
                        Voir commande
                      </Link>
                      {p.status === "PENDING" ? (
                        <button onClick={() => verify(p.id)} className="text-amber-700 hover:underline">
                          Vérifier statut
                        </button>
                      ) : null}
                      {p.status === "SUCCESS" ? (
                        <button onClick={() => refund(p.id)} className="text-rose-700 hover:underline">
                          Rembourser
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <div className="flex flex-wrap justify-between gap-2">
          <span>Total confirmé: <b>{formatFcfa(summary.totalConfirmed)}</b></span>
          <span>En attente: <b>{formatFcfa(summary.totalPending)}</b></span>
          <span>Échoué/Expiré: <b>{formatFcfa(summary.totalFailedExpired)}</b></span>
          <span>Taux de succès: <b>{summary.successRate}%</b></span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{total} paiements trouvés</p>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </button>
          <span className="px-2 text-sm text-slate-600">{page}/{totalPages}</span>
          <button type="button" className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

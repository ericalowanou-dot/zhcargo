"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Data = {
  client: {
    id: string;
    name: string | null;
    phone: string;
    country: string;
    city: string | null;
    neighborhood: string | null;
    landmark: string | null;
    createdAt: string;
  };
  orders: Array<{
    id: string;
    totalFcfa: number;
    status: "PENDING" | "PAID" | "PROCESSING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
    createdAt: string;
    items: Array<{ quantity: number; product: { name: string } }>;
  }>;
  stats: {
    totalSpent: number;
    ordersCount: number;
    deliveredCount: number;
    cancelledCount: number;
    averageOrderValue: number;
    mostPurchasedCategory: string;
  };
};

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", neighborhood: "", landmark: "" });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as Data;
      setData(json);
      setForm({
        name: json.client.name || "",
        city: json.client.city || "",
        neighborhood: json.client.neighborhood || "",
        landmark: json.client.landmark || "",
      });
    } catch {
      toast.error("Impossible de charger le profil client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Profil Client</h2>
        <Link href="/admin/clients" className="text-sm font-semibold text-[#1A3C6E] hover:underline">
          ← Retour aux clients
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Historique des commandes</h3>
            {data.orders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Ce client n&apos;a pas encore commandé</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs text-slate-600">
                    <tr>
                      <th className="px-2 py-2">N°</th>
                      <th className="px-2 py-2">Produits</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Statut</th>
                      <th className="px-2 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100">
                        <td className="px-2 py-2 font-mono text-xs text-[#1A3C6E]">{o.id.slice(0, 10)}</td>
                        <td className="max-w-[260px] truncate px-2 py-2 text-slate-600">
                          {o.items.map((it) => `${it.quantity}x ${it.product.name}`).join(", ")}
                        </td>
                        <td className="px-2 py-2 font-extrabold text-[#E67E22]">{formatFcfa(o.totalFcfa)}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-2 py-2 text-slate-600">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="col-span-2 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Informations client</h3>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{data.client.phone}</p>
            <div className="mt-3 grid gap-2">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Ville" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Quartier" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.landmark} onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))} placeholder="Point de repère" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const res = await fetch(`/api/admin/clients/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });
                setSaving(false);
                if (!res.ok) {
                  toast.error("Mise à jour impossible");
                  return;
                }
                toast.success("Informations mises à jour");
                await load();
              }}
              className="mt-3 rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Mise à jour..." : "Modifier"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Résumé financier</h3>
            <p className="mt-2 text-sm text-slate-700">Total commandes: <b>{data.stats.ordersCount}</b></p>
            <p className="text-sm text-emerald-700">Commandes livrées: <b>{data.stats.deliveredCount}</b></p>
            <p className="text-sm text-rose-700">Commandes annulées: <b>{data.stats.cancelledCount}</b></p>
            <p className="mt-2 text-2xl font-extrabold text-[#E67E22]">{formatFcfa(data.stats.totalSpent)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

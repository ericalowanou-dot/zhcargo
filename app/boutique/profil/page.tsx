"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { Header } from "@/components/client/Header";
import { formatFcfa, generateInvoiceNumber } from "@/lib/invoiceFormat";
import { Bell, Gift, Loader2, LogOut, Package, Pencil, User } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const COUNTRIES = [
  { value: "TG", label: "Togo" },
  { value: "BJ", label: "Bénin" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "GA", label: "Gabon" },
  { value: "BF", label: "Burkina Faso" },
  { value: "SN", label: "Sénégal" },
];

type Data = {
  client: {
    id: string;
    phone: string;
    name: string | null;
    country: string;
    city: string | null;
    neighborhood: string | null;
    landmark: string | null;
    createdAt: string;
  };
  stats: { ordersCount: number; deliveredCount: number; totalSpent: number };
  recentOrders: Array<{ id: string; status: string; totalFcfa: number; createdAt: string; items: Array<{ quantity: number; product: { name: string } }> }>;
  settings: { smsNotifications: boolean; smsPromotions: boolean };
};

export default function ProfilPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", neighborhood: "", landmark: "", country: "TG" });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/boutique/profil");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const d = (await res.json()) as Data;
    setData(d);
    setForm({
      name: d.client.name || "",
      city: d.client.city || "",
      neighborhood: d.client.neighborhood || "",
      landmark: d.client.landmark || "",
      country: d.client.country || "TG",
    });
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status]);

  const countryLabel = useMemo(
    () => COUNTRIES.find((c) => c.value === data?.client.country)?.label || data?.client.country || "—",
    [data?.client.country],
  );

  if (status === "loading" || loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 pb-10">
      <Header />
      <h1 className="flex items-center gap-2 pt-4 text-lg font-extrabold text-[#1A3C6E]">
        <User className="h-5 w-5" />
        Mon Profil
      </h1>

      <section className="mt-4 rounded-3xl bg-gradient-to-b from-[#1F5FBF] to-[#1A3C6E] p-4 text-white shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-extrabold text-white">{data.client.name || "Client ZH Cargo"}</p>
            <p className="text-sm text-white/90">{data.client.phone}</p>
            <p className="text-xs text-white/80">{countryLabel}</p>
          </div>
          <button type="button" onClick={() => setShowModal(true)} className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-800">Mes statistiques</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="inline-flex items-center gap-1 text-lg font-extrabold text-[#1A3C6E]"><Package className="h-4 w-4" />{data.stats.ordersCount}</p>
            <p className="text-[11px] text-slate-500">Commandes</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-extrabold text-emerald-700">{data.stats.deliveredCount}</p>
            <p className="text-[11px] text-slate-500">Livrées</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-base font-extrabold text-[#E67E22]">{formatFcfa(data.stats.totalSpent)}</p>
            <p className="text-[11px] text-slate-500">Dépensés</p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-slate-800">Dernières commandes</h2>
        <div className="space-y-2">
          {data.recentOrders.map((o) => (
            <article key={o.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">#{generateInvoiceNumber(o.id)}</p>
                  <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <p className="text-sm font-extrabold text-[#E67E22]">{formatFcfa(o.totalFcfa)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-600">{o.status}</p>
            </article>
          ))}
        </div>
        <Link href="/boutique/commandes" className="mt-3 inline-block text-sm font-semibold text-[#1A3C6E]">
          Voir toutes mes commandes →
        </Link>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800">Paramètres</h2>
        <div className="mt-3 space-y-3">
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1"><Bell className="h-4 w-4" />Recevoir les SMS de suivi</span>
            <input type="checkbox" checked={data.settings.smsNotifications} onChange={() => {}} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1"><Gift className="h-4 w-4" />Recevoir les offres promotionnelles</span>
            <input type="checkbox" checked={data.settings.smsPromotions} onChange={() => {}} />
          </label>
          <button
            type="button"
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              await signOut({ callbackUrl: "/boutique" });
            }}
          >
            <span className="inline-flex items-center gap-1"><LogOut className="h-4 w-4" />Se déconnecter</span>
          </button>
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Modifier le profil</h3>
            <div className="mt-3 space-y-2">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Nom complet" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Quartier" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))} />
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Point de repère" value={form.landmark} onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))} />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                className="flex-1 rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  setSaving(true);
                  const res = await fetch("/api/boutique/profil/update", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });
                  setSaving(false);
                  if (!res.ok) {
                    toast.error("Mise à jour impossible");
                    return;
                  }
                  toast.success("Profil mis à jour");
                  setShowModal(false);
                  await load();
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BottomNav active="profil" />
    </main>
  );
}

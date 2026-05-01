"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { Header } from "@/components/client/Header";
import { formatDateOnly, formatFcfa, generateInvoiceNumber } from "@/lib/invoiceFormat";
import { COUNTRY_OPTIONS } from "@/lib/phone-regions";
import { Loader2, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type OrderLite = {
  id: string;
  status: string;
  totalFcfa: number;
  createdAt: string;
  items: Array<{ quantity: number; product: { name: string } }>;
};

type Payload = {
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
  recentOrders: OrderLite[];
  settings: { smsNotifications: boolean; smsPromotions: boolean };
};

export default function ProfilPage() {
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("TG");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [landmark, setLandmark] = useState("");
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [smsPromotions, setSmsPromotions] = useState(true);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/boutique/profil");
      const j = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setLoadError(j.error || "Erreur de chargement");
        setData(null);
        return;
      }
      setData(j);
      const c = j.client;
      setName(c.name ?? "");
      setCountry(c.country || "TG");
      setCity(c.city ?? "");
      setNeighborhood(c.neighborhood ?? "");
      setLandmark(c.landmark ?? "");
      setSmsNotifications(j.settings.smsNotifications);
      setSmsPromotions(j.settings.smsPromotions);
    } catch {
      setLoadError("Réseau indisponible");
      setData(null);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login?callbackUrl=/boutique/profil");
      return;
    }
    if (status !== "authenticated") return;
    load();
  }, [status, router, load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/boutique/profil/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country,
          city,
          neighborhood,
          landmark,
          smsNotifications,
          smsPromotions,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(j.error || "Enregistrement impossible");
        return;
      }
      toast.success("Profil mis à jour");
      await load();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !data && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Header />
      <div className="mx-auto max-w-lg px-4 pb-10 pt-6">
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-[#1A3C6E]">
          <UserRound className="h-5 w-5" />
          Mon profil
        </h1>

        {loadError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">{loadError}</p>
        ) : null}

        {data ? (
          <>
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compte</p>
              <p className="mt-2 text-sm text-slate-600">Téléphone</p>
              <p className="text-base font-bold text-slate-900">{data.client.phone}</p>
              <p className="mt-3 text-xs text-slate-500">
                Membre depuis le {formatDateOnly(new Date(data.client.createdAt))}
              </p>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Activité</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-[10px] uppercase text-slate-500">Commandes</dt>
                  <dd className="text-lg font-extrabold text-[#1A3C6E]">{data.stats.ordersCount}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-[10px] uppercase text-slate-500">Livrées</dt>
                  <dd className="text-lg font-extrabold text-emerald-700">{data.stats.deliveredCount}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-[10px] uppercase text-slate-500">Achats</dt>
                  <dd className="text-sm font-extrabold leading-tight text-[#E67E22]">
                    {formatFcfa(data.stats.totalSpent)}
                  </dd>
                </div>
              </dl>
            </section>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Coordonnées
                </p>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Nom affiché
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </label>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Pays
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.iso} value={c.iso}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Ville
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Quartier
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </label>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Repère
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Notifications SMS
                </p>
                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-700">Commandes et livraisons</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#1A3C6E]"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 pt-3">
                  <span className="text-sm text-slate-700">Promotions</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#1A3C6E]"
                    checked={smsPromotions}
                    onChange={(e) => setSmsPromotions(e.target.checked)}
                  />
                </label>
              </section>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </button>
            </form>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1A3C6E]">Dernières commandes</p>
                <Link href="/boutique/commandes" className="text-xs font-semibold text-[#E67E22]">
                  Voir tout
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
                  Aucune commande pour le moment
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          #{generateInvoiceNumber(o.id)}
                        </span>
                        <span className="font-bold text-[#E67E22]">{formatFcfa(o.totalFcfa)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatDateOnly(new Date(o.createdAt))}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                        {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">{o.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/boutique" })}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}

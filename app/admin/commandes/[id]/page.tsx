"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatFcfa } from "@/lib/invoiceFormat";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Detail = {
  order: {
    id: string;
    invoiceNumber: string;
    totalFcfa: number;
    status: OrderStatus;
    internalNotes: string | null;
    estimatedDelivery: string | null;
    deliveryFullName: string | null;
    deliveryCity: string | null;
    deliveryNeighborhood: string | null;
    deliveryLandmark: string | null;
    client: {
      id: string;
      name: string | null;
      phone: string;
      country: string;
    };
    items: {
      id: string;
      quantity: number;
      unitPriceFcfa: number;
      subtotalFcfa: number;
      product: { name: string; photos: string[] };
    }[];
    payment: {
      operator: string;
      amountFcfa: number;
      transactionId: string | null;
      status: PaymentStatus;
      createdAt: string;
    } | null;
  };
  clientStats: { totalOrders: number; totalSpent: number };
  timeline: {
    id: string;
    status: string;
    note?: string | null;
    createdAt: string;
    label: string;
  }[];
};

const ALL_STATUS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

function countryFlag(country: string) {
  const code = (country || "TG").slice(0, 2).toUpperCase();
  return code
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

function prettyDate(v: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
}

function opLabel(op?: string | null) {
  const x = (op || "").toLowerCase();
  if (!x) return "—";
  if (x.includes("tmoney") || x.startsWith("tg_")) return "TMoney";
  if (x.includes("flooz")) return "Flooz";
  if (x.includes("mtn")) return "MTN";
  if (x.includes("orange")) return "Orange Money";
  if (x.includes("wave")) return "Wave";
  return op || "—";
}

export default function AdminCommandeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("PENDING");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/commandes/${id}`);
    const j = (await res.json()) as Detail & { error?: string };
    if (!res.ok) {
      toast.error(j.error || "Commande introuvable");
      setLoading(false);
      return;
    }
    setData(j);
    setStatusDraft(j.order.status);
    setNoteDraft(j.order.internalNotes || "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const addressText = useMemo(() => {
    if (!data) return "";
    const o = data.order;
    return [
      o.deliveryFullName || o.client.name || "Client",
      o.client.phone,
      `Pays: ${o.client.country}`,
      `Adresse: ${o.deliveryCity || "—"}, ${o.deliveryNeighborhood || "—"}`,
      `Repère: ${o.deliveryLandmark || "—"}`,
    ].join("\n");
  }, [data]);

  async function savePatch(payload: { status?: OrderStatus; internalNotes?: string }) {
    setSaving(true);
    const res = await fetch(`/api/admin/commandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      toast.error(j.error || "Mise à jour impossible");
      return;
    }
    toast.success("Commande mise à jour");
    load();
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  const { order, clientStats, timeline } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const invoiceUrl = `${origin}/api/invoices/${order.id}`;
  const waText = encodeURIComponent(
    `Bonjour, voici votre facture ${order.invoiceNumber}: ${invoiceUrl}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Commande #{order.invoiceNumber}
          </h2>
          <Link href="/admin/commandes" className="text-sm font-medium text-[#1A3C6E]">
            ← Retour aux commandes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Détail de la commande</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-100 text-xs text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Produit</th>
                    <th className="px-2 py-2">Quantité</th>
                    <th className="px-2 py-2">Prix unitaire</th>
                    <th className="px-2 py-2">Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.product.photos[0] || "/placeholder.png"}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                          <span>{it.product.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">{it.quantity}</td>
                      <td className="px-2 py-2">{formatFcfa(it.unitPriceFcfa)}</td>
                      <td className="px-2 py-2">{formatFcfa(it.subtotalFcfa)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td className="px-2 py-2 font-semibold" colSpan={3}>
                      Total
                    </td>
                    <td className="px-2 py-2 text-lg font-extrabold text-[#E67E22]">
                      {formatFcfa(order.totalFcfa)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Adresse de livraison</h3>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(addressText);
                  toast.success("Adresse copiée");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                Copier l’adresse
              </button>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>{order.deliveryFullName || order.client.name || "Client"}</p>
              <p>{order.client.phone}</p>
              <p>
                {countryFlag(order.client.country)} {order.client.country} —{" "}
                {order.deliveryCity || "—"} / {order.deliveryNeighborhood || "—"}
              </p>
              <p>Point de repère: {order.deliveryLandmark || "—"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Notes internes</h3>
            <textarea
              className="mt-3 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => savePatch({ internalNotes: noteDraft })}
              className="mt-2 rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Sauvegarder la note
            </button>
            <div className="mt-3 space-y-1">
              {timeline
                .filter((t) => t.note)
                .slice(0, 6)
                .map((t) => (
                  <p key={t.id} className="text-xs text-slate-500">
                    [{prettyDate(t.createdAt)}] {t.note}
                  </p>
                ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Statut de la commande</h3>
            <div className="mt-3">
              <StatusBadge status={order.status} large />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as OrderStatus)}
              >
                {ALL_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  if (statusDraft === order.status) return;
                  if (!confirm(`Confirmer le passage au statut ${statusDraft} ?`)) return;
                  savePatch({ status: statusDraft });
                }}
              >
                Mettre à jour
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {timeline.slice(0, 8).map((t) => (
                <p key={t.id} className="text-xs text-slate-600">
                  {t.label}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Paiement</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p>Opérateur: {opLabel(order.payment?.operator)}</p>
              <p>Montant: {formatFcfa(order.payment?.amountFcfa || order.totalFcfa)}</p>
              <p>Référence: {order.payment?.transactionId || "—"}</p>
              <p>Statut paiement: {order.payment?.status || "—"}</p>
              <p>Date paiement: {order.payment?.createdAt ? prettyDate(order.payment.createdAt) : "—"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Client</h3>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                {order.client.name || "Client"} — {order.client.phone}
              </p>
              <p>
                {countryFlag(order.client.country)} {order.client.country}
              </p>
              <p>{clientStats.totalOrders} commandes passées</p>
              <p>{formatFcfa(clientStats.totalSpent)} dépensés</p>
            </div>
            <Link
              href={`/admin/clients/${order.client.id}`}
              className="mt-3 inline-block text-sm font-semibold text-[#1A3C6E] hover:underline"
            >
              Voir le profil client
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Facture</h3>
            <p className="mt-2 text-sm">Invoice number: {order.invoiceNumber}</p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={`/api/invoices/${order.id}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Télécharger la facture PDF
              </a>
              <a
                target="_blank"
                href={`https://wa.me/${order.client.phone.replace(/\D/g, "")}?text=${waText}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Envoyer par WhatsApp
              </a>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/invoices/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: order.id }),
                  });
                  if (!res.ok) {
                    toast.error("Échec de génération");
                    return;
                  }
                  toast.success("Facture régénérée");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Regénérer la facture
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

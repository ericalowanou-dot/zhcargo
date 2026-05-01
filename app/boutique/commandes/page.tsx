"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { Header } from "@/components/client/Header";
import { canDownloadInvoice, formatDateOnly, formatFcfa, generateInvoiceNumber } from "@/lib/invoiceFormat";
import { Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
type PaymentInfo = {
  status: string;
  expiresAt: string;
};

type OrderRow = {
  id: string;
  totalFcfa: number;
  status: OrderStatus;
  createdAt: string;
  items: Array<{ quantity: number; product: { name: string } }>;
  payment: PaymentInfo | null;
};

const STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: "En attente de paiement", className: "bg-amber-100 text-amber-700" },
  PAID: { label: "Payée", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "En traitement", className: "bg-violet-100 text-violet-700" },
  TRANSIT: { label: "En transit", className: "bg-indigo-100 text-indigo-700" },
  DELIVERED: { label: "Livrée", className: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Annulée", className: "bg-rose-100 text-rose-700" },
};

const itemsLine = (items: OrderRow["items"]) => items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");

function canContinuePayment(o: OrderRow): boolean {
  if (o.status !== "PENDING") return false;
  const p = o.payment;
  if (!p || p.status !== "PENDING") return false;
  return new Date(p.expiresAt) > new Date();
}

export default function CommandesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login?callbackUrl=/boutique/commandes");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      try {
        const res = await fetch("/api/boutique/commandes");
        if (!res.ok) {
          setOrders([]);
          return;
        }
        const data = (await res.json()) as { orders: OrderRow[] };
        setOrders(data.orders);
      } catch {
        setError("Impossible de charger vos commandes");
        setOrders([]);
      }
    })();
  }, [status, router]);

  if (status === "loading" || (status === "authenticated" && orders === null)) {
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
      <div className="px-4 pb-10 pt-6">
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-[#1A3C6E]">
          <Package className="h-5 w-5" />
          Mes Commandes
        </h1>
        {error ? <p className="mt-2 text-center text-sm text-red-600">{error}</p> : null}

        {orders && orders.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md text-center">
            <p className="text-slate-600">Vous n&apos;avez pas encore de commande</p>
            <Link href="/boutique" className="mt-6 inline-block w-full max-w-xs rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white">
              Découvrir nos produits
            </Link>
          </div>
        ) : null}

        {orders && orders.length > 0 ? (
          <ul className="mx-auto mt-4 flex max-w-lg flex-col gap-4">
            {orders.map((o) => {
              const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.PENDING;
              const invoiceOk = canDownloadInvoice(o.status);
              const payable = canContinuePayment(o);

              return (
                <li
                  key={o.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">Commande #{generateInvoiceNumber(o.id)}</p>
                      <p className="text-xs text-slate-500">{formatDateOnly(new Date(o.createdAt))}</p>
                    </div>
                    <p className="text-lg font-extrabold text-[#E67E22]">{formatFcfa(o.totalFcfa)}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{itemsLine(o.items)}</p>
                  <p className="mt-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {payable ? (
                      <Link
                        href={`/boutique/checkout?orderId=${encodeURIComponent(o.id)}`}
                        className="block w-full rounded-xl bg-[#00C853] py-2.5 text-center text-sm font-semibold text-white"
                      >
                        Continuer le paiement
                      </Link>
                    ) : null}
                    {!payable && o.status === "PENDING" ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                        {o.payment && new Date(o.payment.expiresAt) <= new Date()
                          ? "Le délai de paiement est dépassé. Vous pouvez passer une nouvelle commande depuis la boutique."
                          : "Le paiement en ligne n’est plus disponible pour cette commande. Contactez-nous si besoin."}
                      </p>
                    ) : null}
                    {invoiceOk ? (
                      <a
                        href={`/api/invoices/${o.id}`}
                        className="block w-full rounded-xl border-2 border-[#1A3C6E] py-2.5 text-center text-sm font-semibold text-[#1A3C6E]"
                      >
                        Télécharger la facture
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <BottomNav active="commandes" />
    </div>
  );
}

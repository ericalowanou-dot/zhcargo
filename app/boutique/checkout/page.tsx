"use client";

import { CountdownTimer } from "@/components/client/CountdownTimer";
import { useCart } from "@/lib/cartContext";
import { getOperatorsForCountry } from "@/lib/mobileMoneyOperators";
import { Clock3, CreditCard, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

function formatFcfa(v: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(v))} FCFA`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cartItems, cartTotal, clearCart } = useCart();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [landmark, setLandmark] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [mmPhone, setMmPhone] = useState(session?.user?.phone || "");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<"wait" | "ok" | "ko" | "time">("wait");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");

  const country = (session?.user?.country || "TG").toUpperCase();
  const operators = useMemo(() => getOperatorsForCountry(country), [country]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.replace("/auth/login?callbackUrl=/boutique/checkout");
    return null;
  }

  const createOrderAndPay = async () => {
    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
      toast.error("Complétez l'adresse de livraison");
      return;
    }
    if (!operatorId || !mmPhone.trim()) {
      toast.error("Choisissez un opérateur et un numéro");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Panier vide");
      return;
    }

    setLoading(true);
    try {
      const createRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          deliveryAddress: { fullName, city, neighborhood: quartier, landmark },
          paymentOperator: operatorId,
          clientPhone: mmPhone,
        }),
      });
      const cdata = (await createRes.json()) as { orderId?: string; expiresAt?: string; estimatedDelivery?: string; error?: string };
      if (!createRes.ok || !cdata.orderId || !cdata.expiresAt) {
        toast.error(cdata.error || "Impossible de créer la commande");
        return;
      }

      setOrderId(cdata.orderId);
      setExpiresAt(cdata.expiresAt);
      setEstimatedDelivery(cdata.estimatedDelivery || "");

      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: cdata.orderId, operator: operatorId, phone: mmPhone }),
      });
      const pdata = (await payRes.json()) as { error?: string };
      if (!payRes.ok) {
        toast.error(pdata.error || "Paiement indisponible");
        return;
      }

      setStep(3);
      setUiStatus("wait");
      toast.success("Paiement lancé, en attente de confirmation");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!orderId) return;
    const res = await fetch(`/api/payments/status/${orderId}`);
    const data = (await res.json()) as { status?: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING" };
    if (data.status === "SUCCESS") {
      setUiStatus("ok");
      clearCart();
    } else if (data.status === "FAILED") {
      setUiStatus("ko");
    } else if (data.status === "EXPIRED") {
      setUiStatus("time");
    } else {
      setUiStatus("wait");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 pb-10 pt-4">
      <h1 className="text-center text-sm font-extrabold text-[#1A3C6E]">Commande & paiement</h1>

      {step === 1 ? (
        <div className="mx-auto mt-6 max-w-md">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <MapPin className="h-5 w-5" />
            Adresse de livraison
          </h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)} />
            <textarea className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Point de repère" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>
          <button type="button" onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white">
            Continuer →
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            <Link href="/boutique/panier" className="text-[#E67E22]">
              ← Retour au panier
            </Link>
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mx-auto mt-6 max-w-md">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <CreditCard className="h-5 w-5" />
            Choisir votre opérateur
          </h2>
          <div className="mt-4 space-y-2">
            {operators.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setOperatorId(o.id)}
                className={`flex w-full items-center gap-2 rounded-2xl border-2 p-3 text-left text-sm ${operatorId === o.id ? "border-[#1A3C6E] bg-[#1A3C6E] text-white" : "border-slate-200 bg-white"}`}
              >
                <span className="font-medium">{o.name}</span>
              </button>
            ))}
          </div>
          <label className="mt-5 block text-xs font-medium text-slate-600">
            Numéro Mobile Money
            <input type="tel" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} />
          </label>
          <p className="mt-4 text-sm font-bold text-slate-800">
            Total à payer : <span className="text-[#E67E22]">{formatFcfa(cartTotal)}</span>
          </p>
          <button
            type="button"
            onClick={createOrderAndPay}
            disabled={loading || cartItems.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C853] py-3.5 text-center text-base font-semibold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Payer {formatFcfa(cartTotal)}
          </button>
          <button type="button" onClick={() => setStep(1)} className="mt-3 w-full text-center text-sm text-[#1A3C6E]">
            ← Adresse
          </button>
        </div>
      ) : null}

      {step === 3 && expiresAt && orderId ? (
        <div className="mx-auto mt-4 max-w-md text-center">
          {uiStatus === "wait" ? (
            <>
              <p className="text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  En attente de confirmation de paiement
                </span>
              </p>
              <div className="mt-2 flex justify-center">
                <CountdownTimer expiresAt={expiresAt} onExpire={() => setUiStatus("time")} />
              </div>
              <button type="button" onClick={checkStatus} className="mt-4 rounded-xl bg-[#1A3C6E] px-4 py-2 text-sm font-semibold text-white">
                Vérifier le statut
              </button>
            </>
          ) : null}

          {uiStatus === "ok" ? (
            <div className="rounded-2xl bg-emerald-50 p-5 text-slate-800">
              <p className="text-lg font-extrabold text-emerald-800">Paiement confirmé</p>
              <p className="mt-2 text-sm">Votre commande est confirmée. Livraison estimée: {estimatedDelivery || "-"}</p>
              <Link href="/boutique/commandes" className="mt-4 inline-block w-full rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white">
                Voir mes commandes
              </Link>
            </div>
          ) : null}

          {uiStatus === "ko" || uiStatus === "time" ? (
            <div className="rounded-2xl bg-red-50 p-5 text-slate-800">
              <p className="text-lg font-extrabold text-red-700">{uiStatus === "time" ? "Commande annulée" : "Paiement refusé"}</p>
              <Link href="/boutique/panier" className="mt-4 inline-block w-full rounded-xl border-2 border-[#E67E22] py-3 text-center font-semibold text-[#E67E22]">
                Recommencer
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

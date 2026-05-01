"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { CountdownTimer } from "@/components/client/CountdownTimer";
import { Header } from "@/components/client/Header";
import { QuantitySelector } from "@/components/client/QuantitySelector";
import { useCart, type CartItem } from "@/lib/cartContext";
import { getOperatorsForCountry } from "@/lib/mobileMoneyOperators";
import { CheckCircle2, Clock3, Loader2, Plane, Ship, ShoppingCart, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function formatPrice(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function Line({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const subtotal = item.salePrice * item.quantity;

  const onQty = (q: number) => {
    const v = Math.min(Math.max(q, item.moq), item.stock);
    updateQuantity(item.productId, v);
  };

  return (
    <li className="flex gap-3 border-b border-slate-200 py-4 last:border-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        <img src={item.photo} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold text-slate-900">{item.name}</p>
        <p className="mt-0.5 text-sm text-[#E67E22]">{formatPrice(item.salePrice)} FCFA / unité</p>
        <div className="mt-2 max-w-[200px]">
          <QuantitySelector quantity={item.quantity} min={item.moq} max={item.stock} onChange={onQty} />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-800">Sous-total : {formatPrice(subtotal)} FCFA</p>
      </div>
      <button type="button" onClick={() => removeItem(item.productId)} className="self-start p-1 text-red-600" aria-label="Retirer du panier">
        <Trash2 size={20} />
      </button>
    </li>
  );
}

export default function PanierPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const { data: session, status } = useSession();
  const hasItems = cartItems.length > 0;
  const [modalStep, setModalStep] = useState<"address" | "transport" | "payment" | "phone" | "confirmation" | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [landmark, setLandmark] = useState("");
  const [transportMode, setTransportMode] = useState<"AIR" | "SEA">("AIR");
  const [operatorId, setOperatorId] = useState("");
  const [mmPhone, setMmPhone] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<"wait" | "ok" | "ko" | "time">("wait");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");
  const DRAFT_KEY = "zhcargo_checkout_draft_v1";

  const country = (session?.user?.country || "TG").toUpperCase();
  const operators = useMemo(() => getOperatorsForCountry(country), [country]);

  const formatFcfa = (v: number) =>
    `${new Intl.NumberFormat("fr-FR").format(Math.round(v))} FCFA`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        modalStep?: "address" | "transport" | "payment" | "phone" | "confirmation" | null;
        fullName?: string;
        city?: string;
        quartier?: string;
        landmark?: string;
        transportMode?: "AIR" | "SEA";
        operatorId?: string;
        mmPhone?: string;
      };
      if (d.modalStep) setModalStep(d.modalStep);
      if (d.fullName) setFullName(d.fullName);
      if (d.city) setCity(d.city);
      if (d.quartier) setQuartier(d.quartier);
      if (d.landmark) setLandmark(d.landmark);
      if (d.transportMode === "AIR" || d.transportMode === "SEA") setTransportMode(d.transportMode);
      if (d.operatorId) setOperatorId(d.operatorId);
      if (d.mmPhone) setMmPhone(d.mmPhone);
    } catch {
      // Ignore draft malformed
    }
  }, []);

  useEffect(() => {
    try {
      const payload = {
        modalStep,
        fullName,
        city,
        quartier,
        landmark,
        transportMode,
        operatorId,
        mmPhone,
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [modalStep, fullName, city, quartier, landmark, transportMode, operatorId, mmPhone]);

  const createOrderAndPay = async () => {
    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
      toast.error("Complétez l'adresse de livraison");
      return;
    }
    if (!operatorId || !mmPhone.trim()) {
      toast.error("Choisissez un opérateur et un numéro");
      return;
    }
    if (!hasItems) {
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
          transportMode,
        }),
      });
      const cdata = (await createRes.json()) as {
        orderId?: string;
        expiresAt?: string;
        estimatedDelivery?: string;
        error?: string;
      };
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
      const pdata = (await payRes.json()) as {
        error?: string;
        simulated?: boolean;
        simulationOutcome?: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING";
        instructions?: string;
      };
      if (!payRes.ok) {
        toast.error(pdata.error || "Paiement indisponible");
        return;
      }

      setModalStep("confirmation");
      if (pdata.simulated) {
        const out = pdata.simulationOutcome ?? "SUCCESS";
        if (out === "SUCCESS") {
          setUiStatus("ok");
          clearCart();
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {
            // Ignore
          }
          toast.success(
            pdata.instructions || "Paiement validé (mode test). Facture disponible au téléchargement.",
          );
        } else if (out === "FAILED") {
          setUiStatus("ko");
          toast.error(pdata.instructions || "Paiement refusé (mode test).");
        } else if (out === "EXPIRED") {
          setUiStatus("time");
          toast.error(pdata.instructions || "Paiement expiré (mode test).");
        } else {
          setUiStatus("wait");
          toast.success(pdata.instructions || "Paiement en attente (mode test).");
        }
      } else {
        setUiStatus("wait");
        toast.success("Paiement lancé, en attente de confirmation");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!orderId) return;
    const res = await fetch(`/api/payments/status/${orderId}`);
    const data = (await res.json()) as {
      status?: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING";
    };
    if (data.status === "SUCCESS") {
      setUiStatus("ok");
      clearCart();
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore
      }
    } else if (data.status === "FAILED") {
      setUiStatus("ko");
    } else if (data.status === "EXPIRED") {
      setUiStatus("time");
    } else {
      setUiStatus("wait");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-48">
      <Header />
      <div className="px-4 pt-4">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-[#1A3C6E]">
          <ShoppingCart className="h-5 w-5" />
          Mon Panier
        </h1>

        {!hasItems ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200/80" aria-hidden>
              <ShoppingCart className="h-14 w-14 text-slate-400" />
            </div>
            <p className="mt-6 text-slate-600">Votre panier est vide</p>
            <Link href="/boutique" className="mt-6 inline-block w-full max-w-sm rounded-xl bg-[#E67E22] py-3 text-center font-semibold text-white">
              Découvrir nos produits
            </Link>
          </div>
        ) : (
          <ul className="mt-4">
            {cartItems.map((item) => (
              <Line key={item.productId} item={item} />
            ))}
          </ul>
        )}
      </div>

      {hasItems ? (
        <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-slate-600">
            Sous-total : <span className="font-medium text-slate-900">{formatPrice(cartTotal)} FCFA</span>
          </p>
          <p className="text-sm text-slate-500">Livraison : calculée à la commande</p>
          <p className="mt-1 text-base font-extrabold text-[#E67E22]">Total estimé : {formatPrice(cartTotal)} FCFA</p>
          <button
            type="button"
            onClick={() => {
              if (status === "unauthenticated") {
                router.push("/auth/login?callbackUrl=/boutique/panier");
                return;
              }
              setMmPhone(session?.user?.phone || "");
              setModalStep("address");
            }}
            disabled={!hasItems}
            className="mt-4 w-full rounded-xl bg-[#1A3C6E] py-3.5 text-center text-base font-semibold text-white disabled:opacity-50"
          >
            Passer la commande →
          </button>
        </div>
      ) : null}

      {modalStep ? (
        <div className="fixed inset-0 z-40 bg-black/35">
          <button type="button" className="absolute inset-0 h-full w-full" onClick={() => setModalStep(null)} />
          <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[#EEF2FA] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xl font-bold text-slate-900">
                {modalStep === "address"
                  ? "Adresse"
                  : modalStep === "transport"
                    ? "Transport"
                    : modalStep === "payment"
                      ? "Paiement"
                      : modalStep === "phone"
                        ? "Téléphone"
                        : "Confirmation"}
              </p>
              <button type="button" className="rounded-full bg-slate-200 p-2 text-slate-700" onClick={() => setModalStep(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 h-1 rounded-full bg-slate-300/80">
              <div
                className={`h-1 rounded-full bg-[#2D85E7] ${
                  modalStep === "address"
                    ? "w-1/5"
                    : modalStep === "transport"
                      ? "w-2/5"
                      : modalStep === "payment"
                        ? "w-3/5"
                        : modalStep === "phone"
                          ? "w-4/5"
                          : "w-full"
                }`}
              />
            </div>

            {modalStep === "address" ? (
              <>
                <div className="space-y-3">
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)} />
                  <textarea className="min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Point de repère" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
                      toast.error("Complétez l'adresse");
                      return;
                    }
                    setModalStep("transport");
                  }}
                  className="mt-4 w-full rounded-xl bg-[#1A3C6E] py-3 font-semibold text-white"
                >
                  Suivant →
                </button>
              </>
            ) : null}

            {modalStep === "transport" ? (
              <>
                <p className="mb-3 text-lg font-bold text-slate-900">Mode de livraison</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransportMode("AIR")}
                    className={`rounded-2xl border p-3 text-center ${transportMode === "AIR" ? "border-[#1A3C6E] bg-white" : "border-slate-200 bg-white/70"}`}
                  >
                    <Plane className="mx-auto h-7 w-7 text-[#1A3C6E]" />
                    <p className="mt-1 font-bold text-slate-900">Avion</p>
                    <p className="text-xs text-slate-500">5 jours ouvrés</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransportMode("SEA")}
                    className={`rounded-2xl border p-3 text-center ${transportMode === "SEA" ? "border-[#1A3C6E] bg-white" : "border-slate-200 bg-white/70"}`}
                  >
                    <Ship className="mx-auto h-7 w-7 text-[#1A3C6E]" />
                    <p className="mt-1 font-bold text-slate-900">Bateau</p>
                    <p className="text-xs text-slate-500">45 jours ouvrés</p>
                  </button>
                </div>
                <button type="button" onClick={() => setModalStep("payment")} className="mt-4 w-full rounded-xl bg-[#1A3C6E] py-3 font-semibold text-white">
                  Suivant →
                </button>
              </>
            ) : null}

            {modalStep === "payment" ? (
              <>
                <p className="mb-3 text-lg font-bold text-slate-900">Mode de paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  {operators.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setOperatorId(o.id)}
                      className={`rounded-2xl border p-4 text-center ${operatorId === o.id ? "border-[#1A3C6E] bg-white" : "border-slate-200 bg-white/70"}`}
                    >
                      <p className="font-bold text-slate-900">{o.name.replace(/\s*\(.+\)\s*/, "")}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!operatorId) {
                      toast.error("Choisissez un mode de paiement");
                      return;
                    }
                    setModalStep("phone");
                  }}
                  className="mt-4 w-full rounded-xl bg-[#1A3C6E] py-3 font-semibold text-white"
                >
                  Suivant →
                </button>
              </>
            ) : null}

            {modalStep === "phone" ? (
              <>
                <p className="mb-2 text-lg font-bold text-slate-900">Numéro Mobile Money</p>
                <div className="rounded-2xl bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-[#1A3C6E]">+228</span>
                    <input
                      type="tel"
                      className="flex-1 rounded-xl border-2 border-[#2D85E7] px-3 py-2 text-lg font-bold tracking-widest"
                      value={mmPhone}
                      onChange={(e) => setMmPhone(e.target.value)}
                      placeholder="99999999"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3">
                  <span className="text-sm font-semibold text-slate-600">Total à payer</span>
                  <span className="text-2xl font-extrabold text-[#E67E22]">{formatFcfa(cartTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={createOrderAndPay}
                  disabled={loading || cartItems.length === 0}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C853] py-3.5 text-center text-xl font-extrabold text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Payer {formatFcfa(cartTotal)}
                </button>
              </>
            ) : null}

            {modalStep === "confirmation" && expiresAt && orderId ? (
              <div className="text-center">
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
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                    <p className="mt-2 text-lg font-extrabold text-emerald-800">Paiement effectué !</p>
                    <p className="mt-2 text-sm">Commande confirmée. Délai estimé: {estimatedDelivery || (transportMode === "AIR" ? "5 jours ouvrés" : "45 jours ouvrés")}</p>
                    <a href={`/api/invoices/${orderId}`} className="mt-4 inline-block w-full rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white">
                      Télécharger la facture
                    </a>
                  </div>
                ) : null}

                {uiStatus === "ko" || uiStatus === "time" ? (
                  <div className="rounded-2xl bg-red-50 p-5 text-slate-800">
                    <p className="text-lg font-extrabold text-red-700">
                      {uiStatus === "time" ? "Commande annulée" : "Paiement refusé"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalStep("phone")}
                      className="mt-4 inline-block w-full rounded-xl border-2 border-[#E67E22] py-3 text-center font-semibold text-[#E67E22]"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <BottomNav active="panier" />
    </main>
  );
}

"use client";

import { CountdownTimer } from "@/components/client/CountdownTimer";
import { useCart } from "@/lib/cartContext";
import { getOperatorsForCountry } from "@/lib/mobileMoneyOperators";
import { Clock3, Loader2, MapPin, Plane, Ship, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function formatFcfa(v: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(v))} FCFA`;
}

type ResumePayload = {
  order: {
    id: string;
    totalFcfa: number;
    estimatedDelivery?: string | null;
    deliveryFullName: string;
    deliveryCity: string;
    deliveryNeighborhood: string;
    deliveryLandmark: string;
    paymentOperator: string;
    items: Array<{ quantity: number; product: { name: string } }>;
  };
  payment: { status: string; expiresAt: string } | null;
  canPay: boolean;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeQueryId = searchParams.get("orderId");
  const { data: session, status } = useSession();
  const { cartItems, cartTotal, clearCart } = useCart();

  const [modalStep, setModalStep] = useState<"transport" | "payment" | "phone" | "confirmation" | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [landmark, setLandmark] = useState("");
  const [transportMode, setTransportMode] = useState<"AIR" | "SEA">("AIR");
  const [transportDays, setTransportDays] = useState("5 jours ouvrés");
  const [operatorId, setOperatorId] = useState("");
  const [mmPhone, setMmPhone] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<"wait" | "ok" | "ko" | "time">("wait");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");

  const [resumeMode, setResumeMode] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(!!resumeQueryId);
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [resumeItems, setResumeItems] = useState<ResumePayload["order"]["items"]>([]);
  const [resumeTotal, setResumeTotal] = useState(0);

  const country = (session?.user?.country || "TG").toUpperCase();
  const operators = useMemo(() => getOperatorsForCountry(country), [country]);

  useEffect(() => {
    setMmPhone((prev) => (prev ? prev : session?.user?.phone || ""));
  }, [session?.user?.phone]);

  useEffect(() => {
    if (!resumeQueryId) {
      setResumeLoading(false);
      setResumeMode(false);
      setResumeOrderId(null);
      setResumeItems([]);
      setResumeTotal(0);
      return;
    }

    let alive = true;
    (async () => {
      setResumeLoading(true);
      try {
        const res = await fetch(`/api/boutique/commandes/${resumeQueryId}`);
        const data = (await res.json()) as ResumePayload & { error?: string };
        if (!alive) return;

        if (!res.ok || !data.order) {
          toast.error(data.error || "Impossible de charger cette commande");
          router.replace("/boutique/commandes");
          setResumeLoading(false);
          setResumeMode(false);
          return;
        }

        if (!data.canPay) {
          toast.error("Cette commande ne peut plus être payée en ligne.");
          router.replace("/boutique/commandes");
          setResumeLoading(false);
          setResumeMode(false);
          return;
        }

        const o = data.order;
        setResumeMode(true);
        setResumeOrderId(o.id);
        setResumeItems(o.items);
        setResumeTotal(o.totalFcfa);
        setOrderId(o.id);
        if (data.payment?.expiresAt) {
          setExpiresAt(data.payment.expiresAt);
        }
        setFullName(o.deliveryFullName || "");
        setCity(o.deliveryCity || "");
        setQuartier(o.deliveryNeighborhood || "");
        setLandmark(o.deliveryLandmark || "");
        if (o.paymentOperator) {
          setOperatorId(o.paymentOperator);
        }
        setEstimatedDelivery(o.estimatedDelivery || "");
      } catch {
        if (alive) {
          toast.error("Erreur réseau");
          router.replace("/boutique/commandes");
        }
      } finally {
        if (alive) setResumeLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [resumeQueryId, router]);

  const payableTotal = resumeMode ? resumeTotal : cartTotal;

  const processInitiateResponse = async (
    payRes: Response,
    pdata: {
      error?: string;
      simulated?: boolean;
      simulationOutcome?: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING";
      instructions?: string;
    },
    activeOrderId: string,
  ) => {
    if (!payRes.ok) {
      toast.error(pdata.error || "Paiement indisponible");
      return;
    }

    setOrderId(activeOrderId);
    setModalStep("confirmation");
    setUiStatus("wait");

    if (pdata.simulated) {
      const out = pdata.simulationOutcome ?? "SUCCESS";
      if (out === "SUCCESS") {
        setUiStatus("ok");
        if (!resumeMode) clearCart();
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
      toast.success(pdata.instructions || "Paiement lancé, en attente de confirmation");
    }
  };

  const createOrderAndPay = async () => {
    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
      toast.error("Complétez l’adresse de livraison");
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
      const pdata = (await payRes.json()) as Parameters<typeof processInitiateResponse>[1];

      await processInitiateResponse(payRes, pdata, cdata.orderId);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const resumePayOnly = async () => {
    if (!resumeOrderId) return;
    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
      toast.error("Complétez l’adresse de livraison");
      return;
    }
    if (!operatorId || !mmPhone.trim()) {
      toast.error("Choisissez un opérateur et un numéro");
      return;
    }

    setLoading(true);
    try {
      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: resumeOrderId, operator: operatorId, phone: mmPhone }),
      });
      const pdata = (await payRes.json()) as Parameters<typeof processInitiateResponse>[1];

      await processInitiateResponse(payRes, pdata, resumeOrderId);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    const oid = orderId || resumeOrderId;
    if (!oid) return;
    const res = await fetch(`/api/payments/status/${oid}`);
    const data = (await res.json()) as { status?: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING" };
    if (data.status === "SUCCESS") {
      setUiStatus("ok");
      if (!resumeMode) clearCart();
    } else if (data.status === "FAILED") {
      setUiStatus("ko");
    } else if (data.status === "EXPIRED") {
      setUiStatus("time");
    } else {
      setUiStatus("wait");
    }
  };

  if (status === "loading" || resumeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.replace(`/auth/login?callbackUrl=/boutique/checkout${resumeQueryId ? `?orderId=${encodeURIComponent(resumeQueryId)}` : ""}`);
    return null;
  }

  const openFlowFromAddress = () => {
    if (!fullName.trim() || !city.trim() || !quartier.trim()) {
      toast.error("Complétez l’adresse de livraison");
      return;
    }
    if (!resumeMode && cartItems.length === 0) {
      toast.error("Panier vide");
      return;
    }
    setUiStatus("wait");
    if (resumeMode) {
      setModalStep("payment");
      return;
    }
    setModalStep("transport");
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 pb-10 pt-4">
      <h1 className="text-center text-sm font-extrabold text-[#1A3C6E]">
        {resumeMode ? "Reprise de commande" : "Commande & paiement"}
      </h1>

      <div className="mx-auto mt-6 max-w-md">
        {resumeMode ? (
          <div className="mb-4 rounded-2xl border border-[#1A3C6E]/15 bg-white p-4 text-sm shadow-sm">
            <p className="font-bold text-[#1A3C6E]">Récapitulatif</p>
            <p className="mt-2 text-xs text-slate-600">
              {resumeItems.map((i) => `${i.quantity}× ${i.product.name}`).join(" · ")}
            </p>
            <p className="mt-2 text-lg font-extrabold text-[#E67E22]">{formatFcfa(resumeTotal)}</p>
            {expiresAt ? (
              <p className="mt-2 text-[11px] text-amber-800">
                À régler avant expiration du délai de paiement.
              </p>
            ) : null}
          </div>
        ) : null}

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
        <button
          type="button"
          onClick={openFlowFromAddress}
          className="mt-6 w-full rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white"
        >
          {resumeMode ? "Continuer vers le paiement →" : "Continuer →"}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          {resumeMode ? (
            <Link href="/boutique/commandes" className="text-[#E67E22]">
              ← Retour aux commandes
            </Link>
          ) : (
            <Link href="/boutique/panier" className="text-[#E67E22]">
              ← Retour au panier
            </Link>
          )}
        </p>
      </div>

      {modalStep ? (
        <div className="fixed inset-0 z-40 bg-black/35">
          <button type="button" className="absolute inset-0 h-full w-full" onClick={() => setModalStep(null)} />
          <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[#EEF2FA] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xl font-bold text-slate-900">
                {modalStep === "transport"
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
                  modalStep === "transport" ? "w-1/3" : modalStep === "payment" ? "w-2/3" : "w-full"
                }`}
              />
            </div>

            {modalStep === "transport" ? (
              <>
                <p className="mb-3 text-lg font-bold text-slate-900">Mode de livraison</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTransportMode("AIR");
                      setTransportDays("5 jours ouvrés");
                    }}
                    className={`rounded-2xl border p-3 text-center ${transportMode === "AIR" ? "border-[#1A3C6E] bg-white" : "border-slate-200 bg-white/70"}`}
                  >
                    <Plane className="mx-auto h-7 w-7 text-[#1A3C6E]" />
                    <p className="mt-1 font-bold text-slate-900">Avion</p>
                    <p className="text-xs text-slate-500">5 jours ouvrés</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransportMode("SEA");
                      setTransportDays("45 jours ouvrés");
                    }}
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
                <p className="mb-2 text-lg font-bold text-slate-900">Numéro {operatorId.includes("tmoney") ? "TMoney" : "Mobile Money"}</p>
                <div className="rounded-2xl bg-white p-3">
                  <p className="mb-2 text-center text-[11px] font-semibold uppercase text-slate-400">Entrez votre numéro</p>
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
                  <span className="text-2xl font-extrabold text-[#E67E22]">{formatFcfa(payableTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={resumeMode ? resumePayOnly : createOrderAndPay}
                  disabled={loading || (!resumeMode && cartItems.length === 0)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C853] py-3.5 text-center text-xl font-extrabold text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Payer {formatFcfa(payableTotal)}
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
                    <p className="text-lg font-extrabold text-emerald-800">Paiement effectué !</p>
                    <p className="mt-2 text-sm">Commande confirmée. Délai estimé : {estimatedDelivery || transportDays}</p>
                    <a href={`/api/invoices/${orderId}`} className="mt-4 inline-block w-full rounded-xl bg-[#1A3C6E] py-3 text-center font-semibold text-white">
                      Télécharger la facture
                    </a>
                  </div>
                ) : null}

                {uiStatus === "ko" || uiStatus === "time" ? (
                  <div className="rounded-2xl bg-red-50 p-5 text-slate-800">
                    <p className="text-lg font-extrabold text-red-700">{uiStatus === "time" ? "Commande annulée" : "Paiement refusé"}</p>
                    <Link
                      href={resumeMode ? "/boutique/commandes" : "/boutique/panier"}
                      className="mt-4 inline-block w-full rounded-xl border-2 border-[#E67E22] py-3 text-center font-semibold text-[#E67E22]"
                    >
                      Retour {resumeMode ? "aux commandes" : ""}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

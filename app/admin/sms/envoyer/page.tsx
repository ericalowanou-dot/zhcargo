"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const COUNTRIES = [
  { id: "TG", label: "Togo" },
  { id: "BJ", label: "Bénin" },
  { id: "CI", label: "Côte d'Ivoire" },
  { id: "GA", label: "Gabon" },
  { id: "BF", label: "Burkina Faso" },
  { id: "SN", label: "Sénégal" },
];

export default function AdminSmsSendPage() {
  const [targetMode, setTargetMode] = useState<"all" | "countries" | "days">("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const estimated =
    targetMode === "all"
      ? "tous les clients éligibles"
      : targetMode === "countries"
        ? `${countries.length} pays sélectionnés`
        : `clients ayant commandé sous ${days} jours`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Envoyer une promotion</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Cible</p>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="radio" checked={targetMode === "all"} onChange={() => setTargetMode("all")} />
            Tous les clients
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={targetMode === "countries"} onChange={() => setTargetMode("countries")} />
            Par pays
          </label>
          {targetMode === "countries" ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2">
              {COUNTRIES.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={countries.includes(c.id)}
                    onChange={(e) =>
                      setCountries((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2">
            <input type="radio" checked={targetMode === "days"} onChange={() => setTargetMode("days")} />
            Clients ayant commandé dans les X derniers jours
          </label>
          {targetMode === "days" ? (
            <input
              type="number"
              min={1}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value || 1))}
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-slate-800">Message promotionnel</label>
        <textarea
          className="mt-2 min-h-[130px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          maxLength={160}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: Promo week-end: -15% sur les accessoires !"
        />
        <p className="mt-1 text-xs text-slate-500">{message.length}/160 caractères</p>
        <p className="mt-2 text-sm text-slate-700">Ce message sera envoyé à: <b>{estimated}</b></p>
      </div>

      <button
        type="button"
        disabled={sending || !message.trim()}
        className="w-full rounded-xl bg-[#E67E22] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        onClick={async () => {
          if (!window.confirm("Vous allez envoyer ce SMS promotionnel. Confirmer ?")) return;
          setSending(true);
          const payload = {
            message,
            targets: targetMode === "all" ? { all: true } : targetMode === "countries" ? { countries } : { daysSinceOrder: days },
          };
          const res = await fetch("/api/admin/sms/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          setSending(false);
          const data = (await res.json()) as { sent?: number; failed?: number; error?: string };
          if (!res.ok) {
            toast.error(data.error || "Envoi impossible");
            return;
          }
          toast.success(`Envoi terminé: ${data.sent} envoyés, ${data.failed} échecs`);
        }}
      >
        Envoyer
      </button>
    </div>
  );
}

"use client";

import { PartnerCard } from "@/components/admin/PartnerCard";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Partner = {
  id: string;
  name: string;
  role: string;
  percentage: number;
  isActive: boolean;
};

function todayRange() {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  return { from, to };
}

export default function AdminPartenairesPage() {
  const [from, setFrom] = useState(todayRange().from);
  const [to, setTo] = useState(todayRange().to);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", percentage: 0, isActive: true });

  const totalPct = useMemo(
    () => partners.reduce((s, p) => s + Number(p.percentage || 0), 0),
    [partners],
  );

  async function loadPartners() {
    const res = await fetch("/api/admin/partenaires");
    const j = (await res.json()) as { partners: Partner[]; error?: string };
    if (!res.ok) {
      toast.error(j.error || "Impossible de charger les partenaires");
      return;
    }
    setPartners(j.partners);
  }

  async function calculate() {
    setLoading(true);
    const res = await fetch("/api/admin/partenaires/calculer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const j = (await res.json()) as { totalProfit?: number; error?: string };
    setLoading(false);
    if (!res.ok) {
      toast.error(j.error || "Échec du calcul");
      return;
    }
    setTotalProfit(j.totalProfit || 0);
    toast.success("Répartition calculée");
    loadPartners();
  }

  async function savePercentages() {
    for (const p of partners) {
      await fetch(`/api/admin/partenaires/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage: p.percentage }),
      });
    }
    toast.success("Pourcentages sauvegardés");
  }

  async function createPartner() {
    const res = await fetch("/api/admin/partenaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(j.error || "Création impossible");
      return;
    }
    toast.success("Partenaire ajouté");
    setShowAdd(false);
    setForm({ name: "", role: "", percentage: 0, isActive: true });
    loadPartners();
  }

  async function removePartner(id: string) {
    if (!confirm("Désactiver ce partenaire ?")) return;
    await fetch(`/api/admin/partenaires/${id}`, { method: "DELETE" });
    loadPartners();
  }

  async function generateStatements() {
    for (const p of partners) {
      window.open(
        `/api/admin/partenaires/releve/${p.id}/pdf?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        "_blank",
      );
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-extrabold text-slate-900">
        Répartition des Revenus Partenaires
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            Du{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1"
            />
          </label>
          <label className="text-xs text-slate-500">
            Au{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={calculate}
            className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
          >
            Calculer la répartition
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Bénéfice net total: <span className="font-bold">{formatFcfa(totalProfit)}</span>
        </p>
      </div>

      {totalPct !== 100 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Total des pourcentages: {totalPct.toFixed(2)}% — La somme doit être égale à 100%
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Répartition équilibrée (100%)
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-12 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500">
          <p className="col-span-4">Partenaire / Rôle</p>
          <p className="col-span-2">Pourcentage</p>
          <p className="col-span-4">Montant calculé</p>
          <p className="col-span-2 text-right">Actions</p>
        </div>

        {partners.map((p) => (
          <PartnerCard
            key={p.id}
            name={p.name}
            role={p.role}
            percentage={p.percentage}
            totalProfit={totalProfit}
            onPercentageChange={(n) =>
              setPartners((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, percentage: n } : x)),
              )
            }
            actions={
              <>
                <Link href={`/admin/partenaires/releve/${p.id}`} className="text-[#1A3C6E]">
                  Relevé
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const role = prompt("Nouveau rôle", p.role);
                    if (role == null) return;
                    const res = await fetch(`/api/admin/partenaires/${p.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role }),
                    });
                    if (!res.ok) {
                      toast.error("Modification impossible");
                      return;
                    }
                    toast.success("Partenaire modifié");
                    loadPartners();
                  }}
                  className="text-amber-700"
                >
                  Modifier
                </button>
                <button type="button" onClick={() => removePartner(p.id)} className="text-red-600">
                  Supprimer
                </button>
              </>
            }
          />
        ))}

        <div className="mt-2 rounded-lg border border-[#1A3C6E]/30 bg-[#1A3C6E]/5 px-3 py-2 text-sm">
          <span className="font-semibold">Fonds commun</span>:{" "}
          {formatFcfa((totalProfit * Math.max(0, 100 - totalPct)) / 100)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={savePercentages}
          className="rounded-lg bg-[#1A3C6E] px-3 py-2 text-sm font-semibold text-white"
        >
          Sauvegarder les pourcentages
        </button>
        <button
          type="button"
          onClick={generateStatements}
          className="rounded-lg bg-[#E67E22] px-3 py-2 text-sm font-semibold text-white"
        >
          Générer les relevés individuels
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-7 w-7 animate-spin text-[#1A3C6E]" />
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Ajouter un partenaire</h3>
            <div className="mt-3 space-y-2">
              <input
                placeholder="Nom complet"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                placeholder="Rôle (ex: Fondateur / Opérations)"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              />
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="Pourcentage"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={form.percentage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, percentage: Number(e.target.value || 0) }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Actif
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setShowAdd(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded bg-[#1A3C6E] px-3 py-1.5 text-sm font-semibold text-white"
                onClick={createPartner}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

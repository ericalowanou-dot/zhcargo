"use client";

import { PriceCalculator } from "@/components/admin/PriceCalculator";
import { PRODUCT_CATEGORIES } from "@/lib/productConstants";
import { ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export type ProductFormValues = {
  name: string;
  category: string;
  description: string;
  photos: string[];
  purchasePrice: number;
  transportCost: number;
  margin: number;
  moq: number;
  deliveryDays: string;
  stock: number;
  isActive: boolean;
};

const empty: ProductFormValues = {
  name: "",
  category: "Électronique",
  description: "",
  photos: [],
  purchasePrice: 0,
  transportCost: 0,
  margin: 0,
  moq: 1,
  deliveryDays: "",
  stock: 0,
  isActive: true,
};

type Props = {
  mode: "create" | "edit";
  productId?: string;
  initialProduct?: ProductFormValues;
};

export function ProductForm({
  mode,
  productId,
  initialProduct,
}: Props) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValues>(initialProduct || empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = useCallback(
    (patch: Partial<ProductFormValues>) => setV((p) => ({ ...p, ...patch })),
    [],
  );

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remain = 5 - v.photos.length;
    if (remain <= 0) {
      toast.error("Maximum 5 photos.");
      return;
    }
    setUploading(true);
    try {
      const toAdd: string[] = [];
      for (let i = 0; i < files.length && toAdd.length < remain; i++) {
        const f = files[i]!;
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          toast.error(data.error || "Échec de l’envoi");
          break;
        }
        if (data.url) toAdd.push(data.url);
      }
      if (toAdd.length) {
        setV((prev) => ({
          ...prev,
          photos: [...prev.photos, ...toAdd].slice(0, 5),
        }));
        toast.success("Image(s) ajoutée(s).");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    setV((p) => ({
      ...p,
      photos: p.photos.filter((_, i) => i !== idx),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) {
      toast.error("Indiquez le nom du produit.");
      return;
    }
    if (!v.description.trim()) {
      toast.error("Indiquez la description.");
      return;
    }
    if (v.moq < 1) {
      toast.error("MOQ invalide.");
      return;
    }
    if (v.stock < 0) {
      toast.error("Stock invalide.");
      return;
    }
    if (!v.deliveryDays.trim()) {
      toast.error("Indiquez le délai de livraison.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: v.name.trim(),
        category: v.category,
        description: v.description.trim(),
        photos: v.photos,
        purchasePrice: v.purchasePrice,
        transportCost: v.transportCost,
        margin: v.margin,
        moq: v.moq,
        deliveryDays: v.deliveryDays.trim(),
        stock: v.stock,
        isActive: v.isActive,
      };
      const url =
        mode === "create"
          ? "/api/admin/produits"
          : `/api/admin/produits/${productId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Enregistrement impossible");
        return;
      }
      toast.success("Produit enregistré");
      router.push("/admin/produits");
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#1A3C6E]">
            Informations publiques
          </h3>
          <p className="text-xs text-slate-500">
            Visibles par les clients sur la boutique.
          </p>
          <label className="block text-xs font-medium text-slate-600">
            Nom du produit <span className="text-red-500">*</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={v.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Catégorie <span className="text-red-500">*</span>
            <select
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={v.category}
              onChange={(e) => set({ category: e.target.value })}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Description <span className="text-red-500">*</span>
            <textarea
              required
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={v.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          <div>
            <p className="text-xs font-medium text-slate-600">Photos (max. 5)</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              className="mt-1 flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                id="ph-upload"
                onChange={(e) => onFiles(e.target.files)}
                disabled={uploading || v.photos.length >= 5}
              />
              <label
                htmlFor="ph-upload"
                className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-600"
              >
                <ImagePlus className="h-8 w-8 text-slate-400" />
                <span>
                  Glissez vos photos ici ou{" "}
                  <span className="text-[#1A3C6E] font-semibold">cliquez</span>
                </span>
                <span className="text-xs text-slate-400">
                  jpg, png, webp — 5 Mo max par fichier
                </span>
              </label>
              {uploading && (
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-[#1A3C6E]" />
              )}
            </div>
            {v.photos.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {v.photos.map((u, i) => (
                  <li key={u + i} className="relative h-20 w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="block text-xs font-medium text-slate-600">
            Quantité minimum (MOQ) <span className="text-red-500">*</span>
            <input
              type="number"
              min={1}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={v.moq}
              onChange={(e) => set({ moq: parseInt(e.target.value, 10) || 1 })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Délai de livraison <span className="text-red-500">*</span>
            <input
              required
              placeholder="Ex: 15 à 25 jours ouvrés"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={v.deliveryDays}
              onChange={(e) => set({ deliveryDays: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Stock disponible <span className="text-red-500">*</span>
            <input
              type="number"
              min={0}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={v.stock}
              onChange={(e) => set({ stock: parseInt(e.target.value, 10) || 0 })}
            />
          </label>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm text-slate-700">Produit actif</span>
            <button
              type="button"
              role="switch"
              aria-checked={v.isActive}
              onClick={() => set({ isActive: !v.isActive })}
              className={
                "relative h-7 w-12 rounded-full transition " +
                (v.isActive ? "bg-emerald-500" : "bg-slate-300")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition " +
                  (v.isActive ? "left-6" : "left-0.5")
                }
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">
            Données confidentielles — Non visibles par les clients
          </h3>
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
            Ces montants sont réservés à l’équipe interne. Ne les partagez pas
            publiquement.
          </div>
          <PriceCalculator
            purchasePrice={v.purchasePrice}
            transportCost={v.transportCost}
            margin={v.margin}
            onPurchaseChange={(n) => set({ purchasePrice: n })}
            onTransportChange={(n) => set({ transportCost: n })}
            onMarginChange={(n) => set({ margin: n })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <Link
          href="/admin/produits"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-5 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#1A3C6E] px-5 text-sm font-semibold text-white hover:bg-[#152f56] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enregistrer le produit
        </button>
      </div>
    </form>
  );
}

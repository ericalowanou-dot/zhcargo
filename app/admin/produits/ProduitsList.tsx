"use client";

import { formatFcfa } from "@/lib/invoiceFormat";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const CATS = [
  { value: "toutes", label: "Toutes catégories" },
  { value: "Électronique", label: "Électronique" },
  { value: "Chaussures", label: "Chaussures" },
  { value: "Modes", label: "Modes" },
  { value: "Véhicules", label: "Véhicules" },
  { value: "Maison", label: "Maison" },
  { value: "Autres", label: "Autres" },
] as const;

const STOCK_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "en_stock", label: "En stock" },
  { value: "rupture", label: "Rupture" },
  { value: "stock_faible", label: "Stock faible" },
] as const;

type Row = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  transportCost: number;
  margin: number;
  salePrice: number;
  stock: number;
  moq: number;
  isActive: boolean;
  photos: string[];
};

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Rupture
      </span>
    );
  }
  if (stock >= 1 && stock <= 10) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        {stock}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      {stock}
    </span>
  );
}

export function ProduitsList() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [category, setCategory] = useState("toutes");
  const [stock, setStock] = useState("tous");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    products: Row[];
    total: number;
    totalPages: number;
    pageSize: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get("filtre") === "stock_faible") {
      setStock("stock_faible");
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("page", String(page));
      if (searchDebounced.trim()) q.set("search", searchDebounced.trim());
      if (category && category !== "toutes") q.set("category", category);
      if (stock && stock !== "tous") q.set("stock", stock);
      const res = await fetch(`/api/admin/produits?${q.toString()}`);
      if (!res.ok) {
        toast.error("Chargement impossible");
        return;
      }
      const j = (await res.json()) as {
        products: Row[];
        total: number;
        totalPages: number;
        pageSize: number;
      };
      setData(j);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, category, stock]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggle = async (id: string) => {
    const res = await fetch(`/api/admin/produits/${id}/toggle`, {
      method: "PATCH",
    });
    if (!res.ok) {
      toast.error("Mise à jour impossible");
      return;
    }
    const j = (await res.json()) as { isActive: boolean };
    setData((d) =>
      d
        ? {
            ...d,
            products: d.products.map((p) =>
              p.id === id ? { ...p, isActive: j.isActive } : p,
            ),
          }
        : d,
    );
    toast.success(j.isActive ? "Produit activé" : "Produit désactivé");
  };

  const onDelete = async (id: string) => {
    if (
      !window.confirm(
        "Ce produit sera retiré du catalogue (désactivé). Continuer ?",
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/produits/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Produit retiré du catalogue");
    load();
  };

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = data?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const products = data?.products ?? [];

  const goPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages || 1)));
  };

  const pageRange = (() => {
    const m = totalPages;
    if (m <= 7) {
      return Array.from({ length: m }, (_, i) => i + 1);
    }
    let end = Math.min(m, page + 2);
    let start = Math.max(1, end - 4);
    if (start === 1) {
      end = Math.min(5, m);
    }
    if (end === m) {
      start = Math.max(1, m - 4);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">
        Gestion des Produits
      </h2>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="min-w-0 sm:col-span-2">
            <span className="text-xs text-slate-500">Recherche</span>
            <div className="relative mt-0.5">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm"
                placeholder="Rechercher un produit…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>
          <label>
            <span className="text-xs text-slate-500">Catégorie</span>
            <select
              className="mt-0.5 w-full rounded-lg border border-slate-200 py-1.5 text-sm"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {CATS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-slate-500">Stock</span>
            <select
              className="mt-0.5 w-full rounded-lg border border-slate-200 py-1.5 text-sm"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                setPage(1);
              }}
            >
              {STOCK_FILTERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Link
          href="/admin/produits/nouveau"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#1A3C6E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152f56]"
        >
          + Ajouter un produit
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
          </div>
        )}
        {!loading && (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">Photo</th>
                <th className="px-2 py-2 font-medium">Nom</th>
                <th className="px-2 py-2 font-medium">Catégorie</th>
                <th className="px-2 py-2 font-medium">Prix achat</th>
                <th className="px-2 py-2 font-medium">Transport</th>
                <th className="px-2 py-2 font-medium">Marge</th>
                <th className="px-2 py-2 font-medium">Prix vente</th>
                <th className="px-2 py-2 font-medium">Stock</th>
                <th className="px-2 py-2 font-medium">MOQ</th>
                <th className="px-2 py-2 font-medium">Statut</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const thumb = p.photos?.[0];
                return (
                  <tr
                    key={p.id}
                    className={
                      "border-t border-slate-100 " +
                      (!p.isActive ? "bg-slate-50 opacity-80" : "")
                    }
                  >
                    <td className="px-2 py-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-[50px] w-[50px] rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-[50px] w-[50px] items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-900 max-w-[180px] truncate">
                      {p.name}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{p.category}</td>
                    <td className="px-2 py-2 font-medium text-[#E67E22]">
                      {formatFcfa(p.purchasePrice)}
                    </td>
                    <td className="px-2 py-2 font-medium text-[#E67E22]">
                      {formatFcfa(p.transportCost)}
                    </td>
                    <td className="px-2 py-2 font-medium text-[#E67E22]">
                      {formatFcfa(p.margin)}
                    </td>
                    <td className="px-2 py-2 font-bold text-[#1A3C6E]">
                      {formatFcfa(p.salePrice)}
                    </td>
                    <td className="px-2 py-2">
                      <StockBadge stock={p.stock} />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{p.moq}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onToggle(p.id)}
                        className={
                          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition " +
                          (p.isActive ? "bg-emerald-500" : "bg-slate-300")
                        }
                        aria-pressed={p.isActive}
                      >
                        <span
                          className={
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow " +
                            (p.isActive ? "left-5" : "left-0.5")
                          }
                        />
                        <span className="sr-only">Basculer actif / inactif</span>
                      </button>
                      <span
                        className={
                          "ml-2 text-xs " +
                          (p.isActive ? "text-emerald-700" : "text-slate-500")
                        }
                      >
                        {p.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link
                        href={`/admin/produits/${p.id}/modifier`}
                        className="mr-2 inline-flex items-center text-[#1A3C6E] hover:underline"
                      >
                        <Pencil className="mr-0.5 h-3.5 w-3.5" />
                        Modifier
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="inline-flex items-center text-red-600 hover:underline"
                      >
                        <Trash2 className="mr-0.5 h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && products.length === 0 && (
          <p className="p-8 text-center text-slate-500">Aucun produit</p>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-slate-600">
            Affichage {from}–{to} sur {total} produit{total > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Précédent
            </button>
            {totalPages > 7 && pageRange[0]! > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goPage(1)}
                  className="min-w-[2.25rem] rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  1
                </button>
                <span className="px-0.5 text-slate-400">…</span>
              </>
            )}
            {pageRange.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => goPage(n)}
                className={
                  "min-w-[2.25rem] rounded px-2 py-1 text-sm " +
                  (n === page
                    ? "bg-[#1A3C6E] font-bold text-white"
                    : "border border-slate-200 hover:bg-slate-50")
                }
              >
                {n}
              </button>
            ))}
            {totalPages > 7 && pageRange[pageRange.length - 1]! < totalPages && (
              <>
                <span className="px-0.5 text-slate-400">…</span>
                <button
                  type="button"
                  onClick={() => goPage(totalPages)}
                  className="min-w-[2.25rem] rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

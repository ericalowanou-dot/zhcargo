"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { CategoryPills } from "@/components/client/CategoryPills";
import { Header } from "@/components/client/Header";
import { PromoCarousel } from "@/components/client/PromoCarousel";
import { ProductCard } from "@/components/client/ProductCard";
import { PRODUCT_SUBCATEGORIES } from "@/lib/productConstants";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  photos: string;
  salePrice: number;
  moq: number;
};

const CATEGORY_QUERY: Record<string, string> = {
  Tous: "",
  Électronique: "Électronique",
  Chaussures: "Chaussures",
  Modes: "Modes",
  Véhicules: "Véhicules",
  Maison: "Maison",
  Autres: "Autres",
};

export default function BoutiquePage() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [activeSubcategory, setActiveSubcategory] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = CATEGORY_QUERY[activeCategory] ?? "";
        const sq = activeSubcategory.trim();
        const params = new URLSearchParams();
        if (q) params.set("category", q);
        if (sq) params.set("subcategory", sq);
        const query = params.toString();
        const url = query ? `/api/boutique/products?${query}` : "/api/boutique/products";
        const res = await fetch(url);
        const data = (await res.json()) as Product[] | { error?: string };
        if (!res.ok) {
          const msg =
            !Array.isArray(data) && data?.error
              ? data.error
              : "Impossible de charger les produits.";
          toast.error(msg);
          setProducts([]);
          return;
        }
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Erreur réseau lors du chargement des produits.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, [activeCategory, activeSubcategory]);

  const visible = useMemo(() => products, [products]);
  const selectedCategoryLabel = activeCategory === "Tous" ? "Électronique" : activeCategory;
  const currentSubcats =
    PRODUCT_SUBCATEGORIES[selectedCategoryLabel as keyof typeof PRODUCT_SUBCATEGORIES] ?? [];

  const SUBCATEGORY_ICONS: Record<string, string> = {
    Smartphones: "📱",
    Ordinateurs: "💻",
    "Audio & Casques": "🎧",
    "Montres connectées": "⌚",
    Caméras: "📷",
    "Câbles & Chargeurs": "🔋",
    Baskets: "👟",
    "Chaussures ville": "👞",
    Sandales: "🩴",
    "Chaussures sport": "🥾",
    "Chaussures enfant": "🧒",
    "Accessoires chaussures": "🧴",
    "Sacs & Sacoches": "👜",
    "Vêtements femme": "👗",
    "Vêtements homme": "👔",
    "Montres & Bijoux": "💍",
    Beauté: "💄",
    "Accessoires mode": "🧣",
    "Pièces auto": "🚗",
    Moto: "🏍️",
    "Accessoires voiture": "🛞",
    "Éclairage auto": "💡",
    "Outils garage": "🧰",
    Sécurité: "🛡️",
    Électroménager: "🏠",
    Cuisine: "🍳",
    Décoration: "🪴",
    Rangement: "🧺",
    Luminaires: "🛋️",
    "Entretien maison": "🧼",
    Bureautique: "📁",
    "Jeux & Loisirs": "🎮",
    Bébé: "🍼",
    Santé: "🩺",
    Bricolage: "🔧",
    Divers: "📦",
  };

  const openCategory = (category: string) => {
    setActiveCategory(category);
    setActiveSubcategory("");
    if (category !== "Tous") {
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F6F8] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Header />
      <CategoryPills activeCategory={activeCategory} onChange={openCategory} />
      <PromoCarousel />

      {activeSubcategory ? (
        <section className="px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveSubcategory("")}
            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C6E]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#1A3C6E]"
          >
            Sous-catégorie: {activeSubcategory}
            <X className="h-3.5 w-3.5" />
          </button>
        </section>
      ) : null}

      <section className="px-4 py-3">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
          <span aria-hidden>🔥 </span>
          Produits populaires
        </h2>
        {loading ? (
          <div className="mt-6 flex justify-center text-sm text-slate-500">Chargement...</div>
        ) : visible.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
            Aucun article disponible pour cette catégorie
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {sheetOpen && currentSubcats.length > 0 ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[1px]"
            onClick={() => setSheetOpen(false)}
            aria-label="Fermer les sous-catégories"
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-[2rem] bg-[#EEF1F5] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800">
                📚 {selectedCategoryLabel}
              </h3>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full bg-white p-2 text-slate-500 shadow-sm"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {currentSubcats.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  onClick={() => {
                    setActiveSubcategory(subcategory);
                    setSheetOpen(false);
                  }}
                  className="flex flex-col items-center rounded-2xl bg-white p-2.5 text-center shadow-sm ring-1 ring-slate-100"
                >
                  <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {SUBCATEGORY_ICONS[subcategory] ?? "📦"}
                  </span>
                  <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-slate-700">
                    {subcategory}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <BottomNav active="accueil" />
    </main>
  );
}

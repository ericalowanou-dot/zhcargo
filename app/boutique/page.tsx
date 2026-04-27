"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { CategoryPills } from "@/components/client/CategoryPills";
import { Header } from "@/components/client/Header";
import { HeroBanner } from "@/components/client/HeroBanner";
import { ProductCard } from "@/components/client/ProductCard";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  photos: string;
  salePrice: number;
  moq: number;
};

const MAP: Record<string, string> = {
  Tous: "",
  Électronique: "ELECTRONICS",
  Chaussures: "SHOES",
  Modes: "FASHION",
  Véhicules: "VEHICLES",
  Maison: "HOME",
  Autres: "OTHER",
};

export default function BoutiquePage() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const q = MAP[activeCategory];
      const url = q ? `/api/boutique/products?category=${encodeURIComponent(q)}` : "/api/boutique/products";
      const res = await fetch(url);
      const data = (await res.json()) as Product[];
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    void fetchProducts();
  }, [activeCategory]);

  const visible = useMemo(() => products, [products]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      <CategoryPills activeCategory={activeCategory} onChange={setActiveCategory} />
      <HeroBanner />

      <section className="px-4 py-3">
        <h2 className="text-base font-extrabold text-[#1A3C6E]">Produits populaires</h2>
        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Chargement...</div>
        ) : visible.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-4 text-center text-sm text-slate-600">
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
      <BottomNav active="accueil" />
    </main>
  );
}

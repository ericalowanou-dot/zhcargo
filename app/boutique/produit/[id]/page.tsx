"use client";

import { QuantitySelector } from "@/components/client/QuantitySelector";
import { useCart } from "@/lib/cartContext";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  photos: string;
  salePrice: number;
  moq: number;
  stock: number;
  deliveryDays: string;
  description: string;
};

const placeholder = "https://placehold.co/800x800/F8F9FA/1A3C6E?text=ZH+CARGO";

function parsePhotos(photos: string) {
  try {
    const arr = JSON.parse(photos) as string[];
    return Array.isArray(arr) && arr.length > 0 ? arr : [placeholder];
  } catch {
    return [placeholder];
  }
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/boutique/products/${id}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Product;
      setProduct(data);
      setQuantity(Math.max(1, data.moq));
      setLoading(false);
    })();
  }, [id]);

  const images = useMemo(() => (product ? parsePhotos(product.photos) : [placeholder]), [product]);
  const inStock = (product?.stock ?? 0) > 0;
  const canOrder = inStock && (product?.stock ?? 0) >= (product?.moq ?? 1);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A3C6E]" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 text-center">
        <p className="text-slate-700">Produit introuvable.</p>
        <button type="button" onClick={() => router.push("/boutique")} className="mt-4 text-sm font-semibold text-[#E67E22]">
          Retour à la boutique
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-8">
      <div className="relative aspect-square w-full overflow-hidden bg-white">
        <img src={images[mainIndex] ?? placeholder} alt={product.name} className="h-full w-full object-cover" />
        <Link href="/boutique" className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-[#1A3C6E] shadow">
          ← Retour
        </Link>
      </div>

      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMainIndex(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === mainIndex ? "border-[#E67E22]" : "border-transparent"}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="px-4 pt-2">
        <h1 className="text-2xl font-extrabold text-slate-900">{product.name}</h1>
        <p className="mt-3 text-2xl font-extrabold text-[#E67E22]">
          {new Intl.NumberFormat("fr-FR").format(Math.round(product.salePrice))} FCFA / unité
        </p>
        <p className="mt-2 inline-block rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-700">
          Livraison en {product.deliveryDays}
        </p>
        <div className="mt-2">
          {inStock ? (
            <span className="text-sm font-medium text-emerald-700">En stock</span>
          ) : (
            <span className="text-sm font-medium text-red-600">Rupture de stock</span>
          )}
        </div>
        <hr className="my-4 border-slate-200" />

        <p className="text-sm font-medium text-slate-800">Quantité minimum : {product.moq} pièces</p>
        {canOrder ? (
          <div className="mt-3">
            <QuantitySelector quantity={quantity} min={product.moq} max={product.stock} onChange={setQuantity} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (!canOrder) return;
            addItem({
              productId: product.id,
              name: product.name,
              photo: images[0] ?? placeholder,
              salePrice: product.salePrice,
              moq: product.moq,
              stock: product.stock,
              quantity: Math.max(product.moq, quantity),
            });
            toast.success("Produit ajouté au panier");
          }}
          disabled={!canOrder}
          className="mt-5 w-full rounded-xl bg-[#E67E22] py-3.5 text-center text-base font-semibold text-white disabled:bg-slate-400"
        >
          Ajouter au panier
        </button>

        <hr className="my-6 border-slate-200" />
        <h2 className="text-base font-bold text-slate-900">Description du produit</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{product.description}</p>
      </div>
    </main>
  );
}

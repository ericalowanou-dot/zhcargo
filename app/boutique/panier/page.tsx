"use client";

import { BottomNav } from "@/components/client/BottomNav";
import { Header } from "@/components/client/Header";
import { QuantitySelector } from "@/components/client/QuantitySelector";
import { useCart, type CartItem } from "@/lib/cartContext";
import { ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const { cartItems, cartTotal } = useCart();
  const router = useRouter();
  const hasItems = cartItems.length > 0;

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
            onClick={() => router.push("/boutique/checkout")}
            disabled={!hasItems}
            className="mt-4 w-full rounded-xl bg-[#1A3C6E] py-3.5 text-center text-base font-semibold text-white disabled:opacity-50"
          >
            Passer la commande →
          </button>
        </div>
      ) : null}
      <BottomNav active="panier" />
    </main>
  );
}

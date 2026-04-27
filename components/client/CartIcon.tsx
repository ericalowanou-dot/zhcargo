"use client";

import { useCart } from "@/lib/cartContext";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export function CartIcon() {
  const { cartCount } = useCart();

  return (
    <Link
      href="/boutique/panier"
      className="relative rounded-full bg-white/10 p-2 text-white"
      aria-label="Panier"
    >
      <ShoppingCart size={20} />
      {cartCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-[#E67E22] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      ) : null}
    </Link>
  );
}

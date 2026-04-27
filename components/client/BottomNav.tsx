"use client";

import { useCart } from "@/lib/cartContext";
import { Home, Package, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  active?: "accueil" | "panier" | "commandes" | "profil";
};

export function BottomNav({ active = "accueil" }: BottomNavProps) {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const current: BottomNavProps["active"] =
    pathname.startsWith("/boutique/panier")
      ? "panier"
      : pathname.startsWith("/boutique/commandes")
        ? "commandes"
        : pathname.startsWith("/boutique/profil")
          ? "profil"
          : active;

  const itemClass = (key: BottomNavProps["active"]) =>
    current === key ? "text-[#1A3C6E]" : "text-slate-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        <li className={itemClass("accueil")}>
          <Link href="/boutique" className="flex flex-col items-center text-xs">
            <Home size={18} />
            <span>Accueil</span>
          </Link>
        </li>
        <li className={itemClass("panier")}>
          <Link href="/boutique/panier" className="relative flex flex-col items-center text-xs">
            <ShoppingCart size={18} />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
            <span>Panier</span>
          </Link>
        </li>
        <li className={itemClass("commandes")}>
          <Link href="/boutique/commandes" className="flex flex-col items-center text-xs">
            <Package size={18} />
            <span>Commandes</span>
          </Link>
        </li>
        <li className={itemClass("profil")}>
          <Link href="/boutique/profil" className="flex flex-col items-center text-xs">
            <User size={18} />
            <span>Profil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

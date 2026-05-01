"use client";

import { CartIcon } from "@/components/client/CartIcon";
import { phoneInitials } from "@/lib/phone-regions";
import { Search, User } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated" && session?.user?.clientId;
  const phone = session?.user?.phone;

  return (
    <header className="sticky top-0 z-20 bg-[#1A3C6E] px-4 pb-3 pt-3 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold tracking-wide text-white">ZH CARGO</p>
        <div className="flex shrink-0 items-center gap-1">
          <CartIcon />
          {loggedIn && phone ? (
            <Link
              href="/boutique/profil"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 bg-[#E67E22] text-xs font-bold text-white"
              aria-label="Mon compte"
            >
              {phoneInitials(phone)}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/50 bg-white/10 text-white"
              aria-label="Connexion"
            >
              <User className="h-5 w-5" strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 bg-white px-3 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input
          type="search"
          placeholder="Rechercher un produit..."
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />
      </label>
    </header>
  );
}

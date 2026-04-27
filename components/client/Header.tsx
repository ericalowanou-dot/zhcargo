"use client";

import { CartIcon } from "@/components/client/CartIcon";
import { phoneInitials } from "@/lib/phone-regions";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated" && session?.user?.clientId;
  const phone = session?.user?.phone;

  return (
    <header className="sticky top-0 z-20 bg-[#1A3C6E] px-4 pb-3 pt-3 shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-extrabold tracking-wide text-white">ZH CARGO</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {loggedIn && phone ? (
            <Link
              href="/boutique/profil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E67E22] text-xs font-bold text-white"
              aria-label="Mon compte"
            >
              {phoneInitials(phone)}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-white underline decoration-white/40"
            >
              Mon compte
            </Link>
          )}
          <CartIcon />
        </div>
      </div>
      <input
        type="search"
        placeholder="Rechercher un produit..."
        className="w-full rounded-xl border border-white/20 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-[#E67E22] focus:ring-2"
      />
    </header>
  );
}

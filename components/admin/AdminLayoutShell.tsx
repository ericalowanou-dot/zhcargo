"use client";

import {
  BarChart2,
  CreditCard,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  MessageSquare,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/admin/produits", icon: Package, label: "Produits" },
  { href: "/admin/commandes", icon: ShoppingCart, label: "Commandes" },
  { href: "/admin/clients", icon: Users, label: "Clients" },
  { href: "/admin/paiements", icon: CreditCard, label: "Paiements" },
  { href: "/admin/sms", icon: MessageSquare, label: "SMS" },
  { href: "/admin/rapports", icon: BarChart2, label: "Rapports" },
  { href: "/admin/partenaires", icon: Handshake, label: "Partenaires" },
];

const TITLES: Record<string, string> = {
  "/admin/dashboard": "Tableau de bord",
  "/admin/produits/nouveau": "Nouveau produit",
  "/admin/produits": "Produits",
  "/admin/commandes": "Commandes",
  "/admin/clients": "Clients",
  "/admin/paiements": "Paiements",
  "/admin/sms": "SMS",
  "/admin/rapports": "Rapports",
  "/admin/partenaires": "Partenaires",
};

function useClock() {
  const [s, setS] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setS(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return s;
}

function titleForPath(path: string) {
  if (path === "/admin/produits/nouveau") {
    return "Nouveau produit";
  }
  if (/\/admin\/produits\/[^/]+\/modifier$/.test(path)) {
    return "Modifier le produit";
  }
  const entries = Object.entries(TITLES).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [k, t] of entries) {
    if (path === k || path.startsWith(`${k}/`)) {
      return t;
    }
  }
  return "Administration";
}

function isActive(pathname: string, href: string) {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const clock = useClock();
  const timeStr = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "medium",
  }).format(clock);
  const pageTitle = titleForPath(pathname);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[260px] flex-col bg-[#1A3C6E] text-white">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-lg font-extrabold tracking-tight">ZH CARGO</p>
          <p className="text-xs text-blue-200/90">Administration</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-[#E67E22] text-white"
                    : "bg-transparent text-blue-200 hover:bg-white/5 hover:text-white")
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate pl-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-sm">
          <p className="truncate text-blue-100">
            {session?.user?.name || session?.user?.email || "—"}
          </p>
          <button
            type="button"
            onClick={() =>
              signOut({ callbackUrl: "/admin/login" })
            }
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-white/20 py-1.5 text-xs text-white hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="ml-[260px] min-h-screen min-w-0 flex-1 bg-surface-page">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-surface-page/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-lg font-bold text-slate-900">{pageTitle}</h1>
            <div className="text-right text-xs text-slate-500">
              <p className="text-[11px] leading-tight text-slate-500">{timeStr}</p>
              <p className="font-medium text-slate-700">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

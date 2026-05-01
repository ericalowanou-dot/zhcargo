"use client";

import { ChevronRight, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    id: "sacs",
    badge: "PROMO DU JOUR",
    title: "Sacs & Sacoches",
    subtitle: "à partir de 3 500 FCFA",
    body: "Qualité premium directe usine. Stock limité — commandez maintenant !",
    cta: { label: "Voir les sacs", href: "/boutique" },
    gradient: "from-[#6B4EFF] to-[#5236D6]",
  },
  {
    id: "chine",
    badge: "🔥 BEST-SELLER",
    title: "Direct depuis la Chine",
    subtitle: "Meilleurs prix en FCFA",
    body: "Mobile Money · Livraison rapide · Garantie qualité",
    cta: { label: "Voir la boutique", href: "/boutique" },
    gradient: "from-[#1A3C6E] to-[#2958A0]",
  },
  {
    id: "flash",
    badge: "⚡ FLASH SALE",
    title: "Smartphones & Électronique",
    subtitle: "Jusqu'à -40%",
    body: "Import direct · Livraison suivie",
    cta: { label: "Découvrir", href: "/boutique" },
    gradient: "from-[#7C3AED] to-[#5B21B6]",
  },
];

export function PromoCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, []);

  const s = slides[i]!;

  return (
    <section className="px-4 pt-2" aria-roledescription="carousel" aria-label="Offres">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 pb-8 text-white shadow-md ${s.gradient}`}
      >
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-950">
          <Sparkles className="h-3 w-3" aria-hidden />
          {s.badge}
        </div>
        <h2 className="text-lg font-extrabold leading-tight">{s.title}</h2>
        <p className="mt-1 text-sm font-bold text-white/95">{s.subtitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/85">{s.body}</p>
        <Link
          href={s.cta.href}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E67E22] px-3 py-2.5 text-sm font-bold text-white shadow-sm"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {s.cta.label}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>

        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={slides[idx]!.id}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-white" : "w-1.5 bg-white/35"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

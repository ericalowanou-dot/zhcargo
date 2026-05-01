"use client";

import { BottomNav } from "@/components/client/BottomNav";
import {
  WA_PRESET_TEXT,
  WHATSAPP_DISPLAY,
  whatsappHref,
} from "@/lib/whatsappContact";
import { MessageCircle, Package } from "lucide-react";
import Link from "next/link";

export default function DiscuterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-[#F3F6FA] to-[#EEF1F5] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="px-4 pb-8 pt-8">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#1A3C6E]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
            <MessageCircle className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          Discuter avec nous
        </h1>

        <section className="relative mt-6 overflow-hidden rounded-[1.35rem] bg-[#1B5936] px-5 py-6 text-white shadow-lg shadow-emerald-950/25">
          <div
            className="pointer-events-none absolute -right-6 -top-4 text-[8rem] font-black leading-none opacity-[0.08]"
            aria-hidden
          >
            💬
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/65">TG · ZH CARGO</p>
          <h2 className="relative mt-2 text-xl font-extrabold leading-snug">
            Notre équipe vous répond sur WhatsApp
          </h2>
          <p className="relative mt-2 text-sm text-white/95">
            Réponse rapide · Lun–Sam · 8h–20h
          </p>
          <p className="relative mt-4 text-lg font-bold tracking-wide">{WHATSAPP_DISPLAY}</p>
        </section>

        <section className="mt-5 rounded-[1.35rem] border border-white/80 bg-white p-5 shadow-md shadow-slate-200/80">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8EDF6]">
              <Package className="h-6 w-6 text-[#1A3C6E]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#1A3C6E]">Renseignement produit</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Demandez des infos sur un article, un prix, une disponibilité
              </p>
            </div>
          </div>
          <Link
            href={whatsappHref(WA_PRESET_TEXT.product)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] py-3.5 text-center text-sm font-extrabold text-white shadow-md shadow-emerald-800/25"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-white opacity-95" aria-hidden />
            Discuter à propos d’un produit
          </Link>
        </section>

        <section className="mt-5 rounded-[1.35rem] border border-white/80 bg-white p-5 shadow-md shadow-slate-200/80">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5EBE0] text-base font-black text-[#1A3C6E]">
              CN
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[#1A3C6E]">Expertise import Chine</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Conseils personnalisés, sourcing, transfert d’argent, groupage
              </p>
            </div>
          </div>
          <Link
            href={whatsappHref(WA_PRESET_TEXT.expertise)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E67E22] py-3.5 text-center text-sm font-extrabold text-white shadow-lg shadow-orange-800/25"
          >
            <span aria-hidden className="text-lg">
              🤝
            </span>
            Demander une expertise
          </Link>
        </section>

        <section className="mt-5 rounded-[1.35rem] border border-slate-100 bg-white px-5 py-5 shadow-md shadow-slate-200/60">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#1A3C6E]">
            <span aria-hidden className="mr-1">
              📅
            </span>
            Horaires de réponse
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
            <li>
              Lundi – Vendredi&nbsp;:{" "}
              <span className="font-bold text-slate-900">8h00 – 20h00</span>
            </li>
            <li>
              Samedi&nbsp;: <span className="font-bold text-slate-900">9h00 – 18h00</span>
            </li>
            <li>
              Dimanche&nbsp;:{" "}
              <span className="font-bold text-slate-900">sur urgence uniquement</span>
            </li>
          </ul>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}

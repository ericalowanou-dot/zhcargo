import { Rocket } from "lucide-react";

export function HeroBanner() {
  return (
    <section className="px-4 py-2">
      <div className="rounded-2xl bg-gradient-to-r from-[#1A3C6E] to-[#2958A0] p-4 text-white shadow-sm">
        <h1 className="text-xl font-extrabold">Direct depuis la Chine</h1>
        <p className="mt-2 text-sm text-white/90">
          Les meilleurs produits au meilleur prix, payables en FCFA via Mobile Money
        </p>
        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E67E22] px-3 py-2 text-sm font-semibold text-white"
        >
          <Rocket className="h-4 w-4" />
          Livraison rapide disponible
        </button>
      </div>
    </section>
  );
}

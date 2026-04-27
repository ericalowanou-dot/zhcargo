export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ZH Cargo</h1>
        <p className="text-sm text-slate-600">
          Marketplace mobile-first pour importer depuis la Chine et vendre au
          Togo, en FCFA et via Mobile Money.
        </p>
        <a
          href="/boutique"
          className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
        >
          Accéder à la boutique
        </a>
      </section>
    </main>
  );
}

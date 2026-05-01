type CategoryPillsProps = {
  activeCategory: string;
  onChange: (category: string) => void;
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: "Tous", label: "Tous" },
  { key: "Électronique", label: "📱 Électronique" },
  { key: "Chaussures", label: "👟 Chaussures" },
  { key: "Modes", label: "👗 Modes" },
  { key: "Véhicules", label: "🚗 Véhicules" },
  { key: "Maison", label: "🏡 Maison" },
  { key: "Autres", label: "📦 Autres" },
];

export function CategoryPills({ activeCategory, onChange }: CategoryPillsProps) {
  return (
    <div className="border-b border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <div
        className="flex gap-2 overflow-x-auto pb-0.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Catégories produits"
      >
        {CATEGORIES.map(({ key, label }) => {
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors ${
                isActive
                  ? "border-[#1A3C6E]/25 bg-[#EFF6FF] text-[#1A3C6E] ring-2 ring-[#1A3C6E]/15"
                  : "border-slate-100 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

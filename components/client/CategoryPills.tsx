const CATEGORIES = [
  "Tous",
  "Électronique",
  "Chaussures",
  "Modes",
  "Véhicules",
  "Maison",
  "Autres",
];

type CategoryPillsProps = {
  activeCategory: string;
  onChange: (category: string) => void;
};

export function CategoryPills({ activeCategory, onChange }: CategoryPillsProps) {
  return (
    <div className="border-b border-slate-200/70 bg-white px-4 py-2">
      <div
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Catégories produits"
      >
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                isActive
                  ? "border-[#1A3C6E]/30 bg-[#EFF6FF] text-[#1A3C6E]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

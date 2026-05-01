import Link from "next/link";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    photos: string;
    salePrice: number;
    moq: number;
  };
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function getMainPhoto(photos: string) {
  try {
    const parsed = JSON.parse(photos) as string[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed[0]
      : "https://placehold.co/400x300/F8F9FA/1A3C6E?text=ZH+CARGO";
  } catch {
    return "https://placehold.co/400x300/F8F9FA/1A3C6E?text=ZH+CARGO";
  }
}

function moqLabel(moq: number) {
  if (moq <= 1) return "Min. 1 pièce";
  return `Min. ${moq} pièces`;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/boutique/produit/${product.id}`}
      className="block overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm active:scale-[0.99]"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50">
        <img
          src={getMainPhoto(product.photos)}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-2.5 pt-2">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug text-slate-900">
          {product.name}
        </h3>
        <p className="mt-1.5 text-[15px] font-extrabold text-[#E67E22]">
          {formatPrice(product.salePrice)} FCFA
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">{moqLabel(product.moq)}</p>
      </div>
    </Link>
  );
}

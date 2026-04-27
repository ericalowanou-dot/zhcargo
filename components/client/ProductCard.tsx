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
  return new Intl.NumberFormat("fr-FR").format(value);
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

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/boutique/produit/${product.id}`}
      className="block rounded-2xl bg-white p-2 shadow-sm"
    >
      <img
        src={getMainPhoto(product.photos)}
        alt={product.name}
        className="h-28 w-full rounded-xl object-cover"
      />
      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{product.name}</h3>
        <p className="mt-1 text-sm font-extrabold text-[#E67E22]">
          {formatPrice(product.salePrice)} FCFA
        </p>
        <p className="mt-0.5 text-xs text-slate-500">Min. {product.moq} pièces</p>
      </div>
    </Link>
  );
}

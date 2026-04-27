import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminNouveauProduitPage() {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">Nouveau produit</h2>
      <div className="mt-6 max-w-6xl">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}

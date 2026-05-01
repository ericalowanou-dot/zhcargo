import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

function parsePhotos(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    if (Array.isArray(p)) {
      return p.filter((u) => typeof u === "string");
    }
  } catch {
    return [];
  }
  return [];
}

export default async function AdminModifierProduitPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    redirect("/admin/login");
  }
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });
  if (!product) {
    notFound();
  }
  const initial: ProductFormValues = {
    name: product.name,
    category: product.category,
    subcategory: product.subcategory ?? "",
    description: product.description,
    photos: parsePhotos(product.photos),
    purchasePrice: product.purchasePrice,
    transportCost: product.transportCost,
    margin: product.margin,
    moq: product.moq,
    deliveryDays: product.deliveryDays,
    stock: product.stock,
    isActive: product.isActive,
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">
        Modifier : {product.name}
      </h2>
      <div className="mt-6 max-w-6xl">
        <ProductForm
          mode="edit"
          productId={product.id}
          initialProduct={initial}
        />
      </div>
    </div>
  );
}

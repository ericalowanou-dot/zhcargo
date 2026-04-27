import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      photos: true,
      salePrice: true,
      moq: true,
      deliveryDays: true,
      stock: true,
      description: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
  }

  return NextResponse.json(product);
}

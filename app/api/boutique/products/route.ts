import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(subcategory ? { subcategory } : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        photos: true,
        salePrice: true,
        moq: true,
        deliveryDays: true,
        stock: true,
        description: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/boutique/products failed:", error);
    return NextResponse.json(
      { error: "Impossible de charger les produits pour le moment." },
      { status: 500 },
    );
  }
}

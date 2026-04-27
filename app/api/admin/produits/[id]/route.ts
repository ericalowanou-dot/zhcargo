import { requireAdmin } from "@/lib/adminAuth";
import { PRODUCT_CATEGORIES } from "@/lib/productConstants";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

function serializePhotos(urls: string[]) {
  return JSON.stringify(urls);
}

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const p = await prisma.product.findUnique({ where: { id: params.id } });
  if (!p) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    product: { ...p, photos: parsePhotos(p.photos) },
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
  const body = (await request.json()) as {
    name?: string;
    category?: string;
    description?: string;
    photos?: string[];
    purchasePrice?: number;
    transportCost?: number;
    margin?: number;
    moq?: number;
    deliveryDays?: string;
    stock?: number;
    isActive?: boolean;
  };
  const {
    name,
    category,
    description,
    photos,
    purchasePrice,
    transportCost,
    margin,
    moq,
    deliveryDays,
    stock,
    isActive,
  } = body;

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }
  if (category !== undefined && !PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (photos !== undefined) {
    if (!Array.isArray(photos) || photos.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 photos" },
        { status: 400 },
      );
    }
  }
  if (moq !== undefined && moq < 1) {
    return NextResponse.json({ error: "MOQ invalide" }, { status: 400 });
  }
  if (stock !== undefined && stock < 0) {
    return NextResponse.json({ error: "Stock invalide" }, { status: 400 });
  }

  const pIn = purchasePrice ?? existing.purchasePrice;
  const tIn = transportCost ?? existing.transportCost;
  const mIn = margin ?? existing.margin;
  const salePrice = pIn + tIn + mIn;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(photos !== undefined ? { photos: serializePhotos(photos) } : {}),
      ...(purchasePrice !== undefined ? { purchasePrice } : {}),
      ...(transportCost !== undefined ? { transportCost } : {}),
      ...(margin !== undefined ? { margin } : {}),
      salePrice,
      ...(moq !== undefined ? { moq: Math.floor(moq) } : {}),
      ...(deliveryDays !== undefined ? { deliveryDays: deliveryDays.trim() } : {}),
      ...(stock !== undefined ? { stock: Math.floor(stock) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json({
    product: { ...product, photos: parsePhotos(product.photos) },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
  await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}

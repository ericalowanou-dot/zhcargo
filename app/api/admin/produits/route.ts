import { requireAdmin } from "@/lib/adminAuth";
import { PRODUCT_CATEGORIES } from "@/lib/productConstants";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 20;

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

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const search = (searchParams.get("search") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const stock = (searchParams.get("stock") || "tous").trim();

  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category && category !== "toutes") {
    if (PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
      where.category = category;
    }
  }
  if (stock === "en_stock") {
    where.stock = { gt: 0 };
  } else if (stock === "rupture") {
    where.stock = 0;
  } else if (stock === "stock_faible") {
    where.AND = [{ stock: { gte: 1 } }, { stock: { lte: 10 } }];
  }

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const products = rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    photos: parsePhotos(p.photos),
    purchasePrice: p.purchasePrice,
    transportCost: p.transportCost,
    margin: p.margin,
    salePrice: p.salePrice,
    moq: p.moq,
    deliveryDays: p.deliveryDays,
    stock: p.stock,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({
    products,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

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
    photos = [],
    purchasePrice,
    transportCost,
    margin,
    moq,
    deliveryDays,
    stock,
    isActive = true,
  } = body;

  if (!name?.trim() || !category || !description?.trim()) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 },
    );
  }
  if (!PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (
    purchasePrice === undefined ||
    transportCost === undefined ||
    margin === undefined
  ) {
    return NextResponse.json(
      { error: "Montants financiers requis" },
      { status: 400 },
    );
  }
  if (moq === undefined || moq < 1) {
    return NextResponse.json({ error: "MOQ invalide" }, { status: 400 });
  }
  if (stock === undefined || stock < 0) {
    return NextResponse.json({ error: "Stock invalide" }, { status: 400 });
  }
  if (!deliveryDays?.trim()) {
    return NextResponse.json(
      { error: "Délai de livraison requis" },
      { status: 400 },
    );
  }
  if (!Array.isArray(photos) || photos.length > 5) {
    return NextResponse.json(
      { error: "Maximum 5 photos" },
      { status: 400 },
    );
  }

  const salePrice = purchasePrice + transportCost + margin;
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      category,
      description: description.trim(),
      photos: serializePhotos(photos),
      purchasePrice,
      transportCost,
      margin,
      salePrice,
      moq: Math.floor(moq),
      deliveryDays: deliveryDays.trim(),
      stock: Math.floor(stock),
      isActive,
    },
  });

  return NextResponse.json({
    product: {
      ...product,
      photos: parsePhotos(product.photos),
    },
  });
}

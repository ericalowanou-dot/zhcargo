import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function atDayStart(input: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function atDayEnd(input: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const from = atDayStart(request.nextUrl.searchParams.get("from"));
  const to = atDayEnd(request.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json(
      { error: "Période invalide (from/to requis)." },
      { status: 400 },
    );
  }

  const [deliveredOrders, transitCount, cancelledCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "DELIVERED",
        createdAt: { gte: from, lte: to },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.count({
      where: { status: "TRANSIT", createdAt: { gte: from, lte: to } },
    }),
    prisma.order.count({
      where: { status: "CANCELLED", createdAt: { gte: from, lte: to } },
    }),
  ]);

  const deliveredCount = deliveredOrders.length;
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.totalFcfa, 0);

  let totalCost = 0;
  const perCategory = new Map<string, { revenue: number; cost: number }>();
  const perProduct = new Map<
    string,
    {
      productId: string;
      name: string;
      unitsSold: number;
      revenue: number;
      purchaseCost: number;
      transportCost: number;
      totalCost: number;
      profit: number;
    }
  >();
  const perDay = new Map<string, { date: string; revenue: number; cost: number }>();

  for (const o of deliveredOrders) {
    const k = dayKey(o.createdAt);
    if (!perDay.has(k)) perDay.set(k, { date: k, revenue: 0, cost: 0 });
    const d = perDay.get(k)!;
    d.revenue += o.totalFcfa;

    for (const it of o.items) {
      const itemCost = (it.product.purchasePrice + it.product.transportCost) * it.quantity;
      totalCost += itemCost;
      d.cost += itemCost;

      const cat = it.product.category || "Autres";
      const catEntry = perCategory.get(cat) || { revenue: 0, cost: 0 };
      catEntry.revenue += it.subtotalFcfa;
      catEntry.cost += itemCost;
      perCategory.set(cat, catEntry);

      const current =
        perProduct.get(it.productId) ||
        {
          productId: it.productId,
          name: it.product.name,
          unitsSold: 0,
          revenue: 0,
          purchaseCost: 0,
          transportCost: 0,
          totalCost: 0,
          profit: 0,
        };
      current.unitsSold += it.quantity;
      current.revenue += it.subtotalFcfa;
      current.purchaseCost += it.product.purchasePrice * it.quantity;
      current.transportCost += it.product.transportCost * it.quantity;
      current.totalCost += itemCost;
      current.profit += it.subtotalFcfa - itemCost;
      perProduct.set(it.productId, current);
    }
  }

  const totalProfit = totalRevenue - totalCost;
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const revenueByDate = Array.from(perDay.values())
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map((x) => ({
      date: x.date,
      revenue: x.revenue,
      profit: x.revenue - x.cost,
    }));

  const revenueByCategory = Array.from(perCategory.entries()).map(([category, v]) => ({
    category,
    revenue: v.revenue,
    profit: v.revenue - v.cost,
  }));

  const productPerformance = Array.from(perProduct.values())
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
      purchaseCost: p.purchaseCost,
      transportCost: p.transportCost,
      totalCost: p.totalCost,
      profit: p.profit,
      marginPercent: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  return NextResponse.json({
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    totalRevenue,
    totalCost,
    totalProfit,
    averageMargin,
    ordersCount: {
      delivered: deliveredCount,
      transit: transitCount,
      cancelled: cancelledCount,
    },
    revenueByDate,
    revenueByCategory,
    productPerformance,
  });
}

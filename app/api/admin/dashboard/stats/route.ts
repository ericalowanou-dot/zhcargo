import { authOptions } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const PAID_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "TRANSIT",
  "DELIVERED",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const t0 = startOfDay(now);
  const t1 = endOfDay(now);
  const m0 = startOfMonth(now);
  const m1 = endOfMonth(now);
  const sevenAgo = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
  );
  const sevenEnd = endOfDay(now);

  const [todayList, todayCount, paidPending, lowStock, last10, groupTop, deliveredMonth, weekOrders] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          status: { in: PAID_STATUSES },
          createdAt: { gte: t0, lte: t1 },
        },
        select: { totalFcfa: true },
      }),
      prisma.order.count({
        where: {
          status: { in: PAID_STATUSES },
          createdAt: { gte: t0, lte: t1 },
        },
      }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.product.count({ where: { stock: { lt: 5 } } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, phone: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, subtotalFcfa: true },
        where: { order: { status: { not: "CANCELLED" } } },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          status: "DELIVERED",
          updatedAt: { gte: m0, lte: m1 },
        },
        include: {
          items: { include: { product: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          status: { in: PAID_STATUSES },
          createdAt: { gte: sevenAgo, lte: sevenEnd },
        },
        include: {
          items: { include: { product: true } },
        },
      }),
    ]);

  const todayRevenue = todayList.reduce(
    (s, o) => s + o.totalFcfa,
    0,
  );
  const pendingOrdersCount = paidPending;

  let monthlyProfit = 0;
  for (const o of deliveredMonth) {
    for (const it of o.items) {
      const p = it.product;
      monthlyProfit +=
        (it.unitPriceFcfa - p.purchasePrice - p.transportCost) *
        it.quantity;
    }
  }

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const bucket = new Map<
    string,
    { revenue: number; profit: number }
  >();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    bucket.set(dayKey(d), { revenue: 0, profit: 0 });
  }

  for (const o of weekOrders) {
    const k = dayKey(new Date(o.createdAt));
    if (!bucket.has(k)) {
      continue;
    }
    const b = bucket.get(k)!;
    b.revenue += o.totalFcfa;
    for (const it of o.items) {
      const p = it.product;
      b.profit +=
        (it.unitPriceFcfa - p.purchasePrice - p.transportCost) *
        it.quantity;
    }
  }

  const wFr = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  const dFr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  });
  const last7DaysRevenue: {
    date: string;
    label: string;
    revenue: number;
    profit: number;
  }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const k = dayKey(d);
    const b = bucket.get(k) || { revenue: 0, profit: 0 };
    last7DaysRevenue.push({
      date: k,
      label: `${wFr.format(d)}. ${dFr.format(d)}`,
      revenue: b.revenue,
      profit: b.profit,
    });
  }

  const productIds = groupTop.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const top5Products = groupTop.map((g, i) => ({
    rank: i + 1,
    productId: g.productId,
    name: nameById.get(g.productId) || "—",
    quantitySold: g._sum.quantity ?? 0,
    revenue: g._sum.subtotalFcfa ?? 0,
  }));

  const last10Orders = last10.map((o) => ({
    id: o.id,
    orderNumber: generateInvoiceNumber(o.id),
    clientName: o.client.name || o.client.phone,
    totalFcfa: o.totalFcfa,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return NextResponse.json({
    todayRevenue,
    todayOrdersCount: todayCount,
    pendingOrdersCount,
    monthlyProfit,
    lowStockCount: lowStock,
    last10Orders,
    top5Products,
    last7DaysRevenue,
  });
}

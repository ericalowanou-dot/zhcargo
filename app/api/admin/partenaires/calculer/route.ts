import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseDate(v?: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computeOrdersProfit(
  orders: {
    items: { quantity: number; unitPriceFcfa: number; product: { purchasePrice: number; transportCost: number } }[];
  }[],
) {
  return orders.reduce((sum, o) => {
    const p = o.items.reduce((s, it) => {
      const unitProfit = it.unitPriceFcfa - it.product.purchasePrice - it.product.transportCost;
      return s + unitProfit * it.quantity;
    }, 0);
    return sum + p;
  }, 0);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as { from?: string; to?: string };
  const from = parseDate(body.from);
  const to = parseDate(body.to);
  if (!from || !to) {
    return NextResponse.json({ error: "Période invalide" }, { status: 400 });
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const [partners, orders] = await Promise.all([
    prisma.partner.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      where: { status: "DELIVERED", createdAt: { gte: from, lte: to } },
      include: {
        items: { include: { product: true } },
      },
    }),
  ]);

  const totalProfit = computeOrdersProfit(orders);
  const splits = partners.map((p) => ({
    partnerId: p.id,
    name: p.name,
    percentage: p.percentage,
    amountFcfa: (totalProfit * p.percentage) / 100,
  }));

  const saved = await prisma.revenueSplit.create({
    data: {
      periodStart: from,
      periodEnd: to,
      totalProfitFcfa: totalProfit,
      splits: JSON.stringify(splits),
    },
  });

  return NextResponse.json({
    totalProfit,
    splits,
    savedAt: saved.createdAt,
  });
}

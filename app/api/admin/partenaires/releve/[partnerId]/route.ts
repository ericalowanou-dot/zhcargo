import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function parseDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function orderProfit(items: { quantity: number; unitPriceFcfa: number; product: { purchasePrice: number; transportCost: number } }[]) {
  return items.reduce((s, it) => {
    const unitProfit = it.unitPriceFcfa - it.product.purchasePrice - it.product.transportCost;
    return s + unitProfit * it.quantity;
  }, 0);
}

type Ctx = { params: { partnerId: string } };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const from = parseDate(request.nextUrl.searchParams.get("from"));
  const to = parseDate(request.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "Période invalide" }, { status: 400 });
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const partner = await prisma.partner.findUnique({ where: { id: params.partnerId } });
  if (!partner) {
    return NextResponse.json({ error: "Partenaire introuvable" }, { status: 404 });
  }

  const orders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      createdAt: { gte: from, lte: to },
    },
    include: {
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const breakdown = orders.map((o) => {
    const p = orderProfit(o.items);
    return {
      date: o.createdAt,
      orderId: o.id,
      invoiceNumber: `FACT-${o.id.slice(-6).toUpperCase().padStart(6, "0")}`,
      products: o.items.map((it) => `${it.quantity}x ${it.product.name}`).join(", "),
      orderProfit: p,
      partnerShare: (p * partner.percentage) / 100,
    };
  });

  const totalProfit = breakdown.reduce((s, b) => s + b.orderProfit, 0);
  const totalShare = breakdown.reduce((s, b) => s + b.partnerShare, 0);

  return NextResponse.json({
    partner,
    from,
    to,
    totalProfit,
    totalShare,
    breakdown,
  });
}

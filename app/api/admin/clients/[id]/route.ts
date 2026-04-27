import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const PAID_PLUS: OrderStatus[] = ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"];

type Ctx = { params: { id: string } };

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function previousSixMonths() {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, category: true } },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const ordersCount = client.orders.length;
  const deliveredCount = client.orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledCount = client.orders.filter((o) => o.status === "CANCELLED").length;
  const totalSpent = client.orders.reduce(
    (sum, o) => (PAID_PLUS.includes(o.status) ? sum + o.totalFcfa : sum),
    0,
  );
  const averageOrderValue = ordersCount ? totalSpent / ordersCount : 0;

  const categoryCount: Record<string, number> = {};
  for (const order of client.orders) {
    for (const item of order.items) {
      const key = item.product.category || "Autres";
      categoryCount[key] = (categoryCount[key] || 0) + item.quantity;
    }
  }
  const mostPurchasedCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const keys = previousSixMonths();
  const map = Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  for (const order of client.orders) {
    const key = monthKey(order.createdAt);
    if (map[key] !== undefined && PAID_PLUS.includes(order.status)) {
      map[key] += order.totalFcfa;
    }
  }
  const monthlySpending = keys.map((k) => {
    const [y, m] = k.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return {
      key: k,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      amount: map[k] || 0,
    };
  });

  const paymentHistory = client.orders
    .map((o) => ({
      orderId: o.id,
      createdAt: o.createdAt,
      amountFcfa: o.payment?.amountFcfa || o.totalFcfa,
      operator: o.payment?.operator || o.paymentOperator || null,
      status: o.payment?.status || "PENDING",
      transactionId: o.payment?.transactionId || o.paymentReference || null,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      country: client.country,
      city: client.city,
      neighborhood: client.neighborhood,
      landmark: client.landmark,
      createdAt: client.createdAt,
    },
    orders: client.orders,
    paymentHistory,
    stats: {
      totalSpent,
      ordersCount,
      deliveredCount,
      cancelledCount,
      averageOrderValue,
      mostPurchasedCategory,
      monthlySpending,
    },
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    city?: string;
    neighborhood?: string;
    landmark?: string;
  };

  const updated = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() || null } : {}),
      ...(body.city !== undefined ? { city: body.city.trim() || null } : {}),
      ...(body.neighborhood !== undefined
        ? { neighborhood: body.neighborhood.trim() || null }
        : {}),
      ...(body.landmark !== undefined
        ? { landmark: body.landmark.trim() || null }
        : {}),
    },
  });

  return NextResponse.json({ client: updated });
}


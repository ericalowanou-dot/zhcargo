import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const PAID_PLUS = ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    include: {
      settings: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const allOrders = await prisma.order.findMany({
    where: { clientId: client.id },
    select: { status: true, totalFcfa: true },
  });

  const ordersCount = allOrders.length;
  const deliveredCount = allOrders.filter((o) => o.status === "DELIVERED").length;
  const totalSpent = allOrders.reduce(
    (s, o) => (PAID_PLUS.includes(o.status as (typeof PAID_PLUS)[number]) ? s + o.totalFcfa : s),
    0,
  );

  const settings = client.settings
    ? {
        smsNotifications: client.settings.smsNotifications,
        smsPromotions: client.settings.smsPromotions,
      }
    : { smsNotifications: true, smsPromotions: true };

  return NextResponse.json({
    client: {
      id: client.id,
      phone: client.phone,
      name: client.name,
      country: client.country,
      city: client.city,
      neighborhood: client.neighborhood,
      landmark: client.landmark,
      createdAt: client.createdAt,
    },
    stats: { ordersCount, deliveredCount, totalSpent },
    recentOrders: client.orders,
    settings,
  });
}


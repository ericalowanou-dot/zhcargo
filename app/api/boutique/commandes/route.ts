import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const productPublic = {
  id: true,
  name: true,
  category: true,
  subcategory: true,
  description: true,
  photos: true,
  salePrice: true,
  moq: true,
  deliveryDays: true,
  stock: true,
  isActive: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: { select: productPublic },
        },
      },
      payment: true,
    },
  });

  return NextResponse.json({ orders });
}

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const itemProductSelect = { name: true } as const;

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, clientId: session.user.clientId },
    include: {
      items: {
        include: {
          product: { select: itemProductSelect },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const pay = order.payment;
  const now = new Date();
  const paymentPending = pay?.status === "PENDING";
  const notExpired = pay ? now <= pay.expiresAt : false;

  const canPay =
    order.status === "PENDING" &&
    !!pay &&
    paymentPending &&
    notExpired;

  return NextResponse.json({
    order: {
      id: order.id,
      totalFcfa: order.totalFcfa,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      deliveryFullName: order.deliveryFullName ?? "",
      deliveryCity: order.deliveryCity ?? "",
      deliveryNeighborhood: order.deliveryNeighborhood ?? "",
      deliveryLandmark: order.deliveryLandmark ?? "",
      paymentOperator: order.paymentOperator ?? pay?.operator ?? "",
      items: order.items.map((i) => ({
        quantity: i.quantity,
        product: { name: i.product.name },
      })),
    },
    payment: pay
      ? {
          status: pay.status,
          expiresAt: pay.expiresAt.toISOString(),
        }
      : null,
    canPay,
  });
}

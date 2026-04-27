import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const PAY_MIN = 30 * 60 * 1000;

type Body = {
  items: { productId: string; quantity: number }[];
  deliveryAddress: {
    fullName: string;
    city: string;
    neighborhood: string;
    landmark: string;
  };
  paymentOperator: string;
  clientPhone: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { items, deliveryAddress, paymentOperator, clientPhone } = body;
  if (
    !items?.length ||
    !deliveryAddress?.fullName ||
    !deliveryAddress?.city ||
    !paymentOperator
  ) {
    return NextResponse.json(
      { error: "Données de commande incomplètes" },
      { status: 400 },
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
  });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  if (clientPhone && client.phone.replace(/\D/g, "") !== clientPhone.replace(/\D/g, "")) {
    // pas bloquant, mais on garde le client authentifié
  }

  const expiresAt = new Date(Date.now() + PAY_MIN);
  let order: { id: string; totalFcfa: number; estimatedDelivery: string | null } | null =
    null;
  try {
    order = await prisma.$transaction(async (tx) => {
    const lines: {
      productId: string;
      quantity: number;
      unit: number;
      sub: number;
      deliveryDays: string;
    }[] = [];
    let total = 0;
    for (const line of items) {
      if (!line.productId || !line.quantity || line.quantity < 1) {
        throw new Error("Ligne de commande invalide");
      }
      const p = await tx.product.findFirst({
        where: { id: line.productId, isActive: true },
      });
      if (!p) {
        throw new Error(`Produit indisponible: ${line.productId}`);
      }
      if (line.quantity < p.moq) {
        throw new Error(`Quantité < minimum requis (MOQ) pour ${p.name}`);
      }
      if (p.stock < line.quantity) {
        throw new Error(`Stock insuffisant pour ${p.name}`);
      }
      const sub = p.salePrice * line.quantity;
      total += sub;
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unit: p.salePrice,
        sub,
        deliveryDays: p.deliveryDays,
      });
    }
    if (lines.length === 0) {
      throw new Error("Panier vide");
    }
    const firstDelivery = lines[0]?.deliveryDays ?? "—";
    const o = await tx.order.create({
      data: {
        clientId: client.id,
        status: "PENDING",
        totalFcfa: total,
        paymentOperator: paymentOperator,
        estimatedDelivery: firstDelivery,
        deliveryFullName: deliveryAddress.fullName,
        deliveryCity: deliveryAddress.city,
        deliveryNeighborhood: deliveryAddress.neighborhood,
        deliveryLandmark: deliveryAddress.landmark,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceFcfa: l.unit,
            subtotalFcfa: l.sub,
          })),
        },
        payment: {
          create: {
            operator: paymentOperator,
            amountFcfa: total,
            status: "PENDING",
            expiresAt,
          },
        },
      },
    });
    return { id: o.id, totalFcfa: o.totalFcfa, estimatedDelivery: o.estimatedDelivery };
  });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Commande refusée";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!order) {
    return NextResponse.json({ error: "Erreur commande" }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    totalFcfa: order.totalFcfa,
    expiresAt: expiresAt.toISOString(),
    estimatedDelivery: order.estimatedDelivery ?? "—",
  });
}

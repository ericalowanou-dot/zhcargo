import { requireAdmin } from "@/lib/adminAuth";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";
import {
  sendOrderCancelled,
  sendOrderDelivered,
  sendOrderInTransit,
  sendOrderProcessing,
} from "@/lib/sms";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

function parsePhotos(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    if (Array.isArray(p)) return p.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
  return [];
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function computeProfit(items: { quantity: number; product: { purchasePrice: number; transportCost: number }; unitPriceFcfa: number }[]) {
  return items.reduce((sum, it) => {
    const unitProfit = it.unitPriceFcfa - it.product.purchasePrice - it.product.transportCost;
    return sum + unitProfit * it.quantity;
  }, 0);
}

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      items: { include: { product: true } },
      payment: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const [clientOrdersCount, clientSpent] = await Promise.all([
    prisma.order.count({ where: { clientId: order.clientId } }),
    prisma.order.aggregate({
      _sum: { totalFcfa: true },
      where: {
        clientId: order.clientId,
        status: { in: ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"] },
      },
    }),
  ]);

  return NextResponse.json({
    order: {
      ...order,
      invoiceNumber: generateInvoiceNumber(order.id),
      items: order.items.map((it) => ({
        ...it,
        product: { ...it.product, photos: parsePhotos(it.product.photos) },
      })),
    },
    clientStats: {
      totalOrders: clientOrdersCount,
      totalSpent: clientSpent._sum.totalFcfa || 0,
    },
    timeline: [
      {
        id: "created",
        status: order.status,
        note: "Commande créée",
        createdAt: order.createdAt,
        label: `Commande créée — ${fmtDate(order.createdAt)}`,
      },
      ...order.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        note: h.note,
        createdAt: h.createdAt,
        label: `${h.status} — ${fmtDate(h.createdAt)}`,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    status?: OrderStatus;
    internalNotes?: string;
  };
  const current = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      items: { include: { product: true } },
    },
  });
  if (!current) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const nextStatus = body.status;
  if (
    nextStatus &&
    !(Object.values(OrderStatus) as string[]).includes(nextStatus)
  ) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const statusChanged = nextStatus && nextStatus !== current.status;
  const deliveredProfit =
    (statusChanged && nextStatus === "DELIVERED") || current.status === "DELIVERED"
      ? computeProfit(current.items)
      : current.profitFcfa;

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: params.id },
      data: {
        ...(typeof body.internalNotes === "string"
          ? { internalNotes: body.internalNotes.trim() || null }
          : {}),
        ...(statusChanged ? { status: nextStatus } : {}),
        ...(nextStatus === "DELIVERED" ? { profitFcfa: deliveredProfit } : {}),
      },
      include: {
        client: true,
        items: { include: { product: true } },
        payment: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    if (statusChanged) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status: String(nextStatus),
          note: `Statut mis à jour vers ${nextStatus}`,
        },
      });
    } else if (typeof body.internalNotes === "string") {
      await tx.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status: String(order.status),
          note: "Note interne mise à jour",
        },
      });
    }

    return order;
  });

  if (statusChanged && nextStatus) {
    try {
      const orderNumber = generateInvoiceNumber(current.id);
      if (nextStatus === "PROCESSING") {
        await sendOrderProcessing(current.client.phone, orderNumber);
      } else if (nextStatus === "TRANSIT") {
        await sendOrderInTransit(
          current.client.phone,
          orderNumber,
          updated.estimatedDelivery || "très bientôt",
        );
      } else if (nextStatus === "DELIVERED") {
        await sendOrderDelivered(current.client.phone, orderNumber);
      } else if (nextStatus === "CANCELLED") {
        await sendOrderCancelled(current.client.phone, orderNumber);
      }
    } catch (e) {
      console.error("SMS statut commande", e);
    }
  }

  return NextResponse.json({
    order: {
      ...updated,
      invoiceNumber: generateInvoiceNumber(updated.id),
      items: updated.items.map((it) => ({
        ...it,
        product: { ...it.product, photos: parsePhotos(it.product.photos) },
      })),
    },
  });
}

import { prisma } from "@/lib/prisma";
import { generateOrderInvoice } from "@/lib/invoiceService";
import { retrieveTransaction } from "@/lib/fedapayClient";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const APPROVED = new Set([
  "approved",
  "transferred",
  "transferred_partially_refunded",
  "approved_partially_refunded",
  "refunded",
]);

const DECLINED = new Set(["declined", "canceled", "cancelled", "canceled", "rejected", "refused"]);

type SyncResult = "SUCCESS" | "FAILED" | "PENDING" | "EXPIRED";

/**
 * Synchronise l’état d’une commande avec le retour FedaPay (ou expiration).
 * Retour de haut niveau pour l’API / le webhook.
 */
export async function syncOrderPayment(
  orderId: string,
  fedaIdOverride: string | null,
): Promise<{ status: SyncResult; orderId: string; transactionId: string | null }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, client: true, items: { include: { product: true } } },
  });
  if (!order || !order.payment) {
    return { status: "PENDING", orderId, transactionId: null };
  }
  if (order.clientId == null) {
    return { status: "PENDING", orderId, transactionId: null };
  }

  const fedaId = fedaIdOverride ?? order.payment.transactionId;
  if (!fedaId) {
    if (order.payment.status === "PENDING" && new Date() > order.payment.expiresAt) {
      await markExpired(order.id, order.payment.id);
      return { status: "EXPIRED", orderId, transactionId: null };
    }
    return { status: "PENDING", orderId, transactionId: null };
  }

  if (order.status === "PAID" && order.payment.status === "SUCCESS") {
    return { status: "SUCCESS", orderId, transactionId: fedaId };
  }
  if (order.status === "CANCELLED" && order.payment.status === "EXPIRED") {
    return { status: "EXPIRED", orderId, transactionId: fedaId };
  }
  if (order.payment.status === "FAILED") {
    return { status: "FAILED", orderId, transactionId: fedaId };
  }

  let fedaStatus = "pending";
  try {
    const tr = await retrieveTransaction(fedaId);
    fedaStatus = (tr.status || "pending").toLowerCase();
  } catch (e) {
    console.error("FedaPay retrieve", e);
    if (order.payment.status === "PENDING" && new Date() > order.payment.expiresAt) {
      await markExpired(order.id, order.payment.id);
      return { status: "EXPIRED", orderId, transactionId: fedaId };
    }
    return { status: "PENDING", orderId, transactionId: fedaId };
  }

  if (APPROVED.has(fedaStatus) || fedaStatus.includes("approved")) {
    await markPaidAndShip(order.id, fedaId);
    return { status: "SUCCESS", orderId, transactionId: fedaId };
  }
  if (DECLINED.has(fedaStatus) || fedaStatus === "refused") {
    await markDeclined(order.id, order.payment.id);
    return { status: "FAILED", orderId, transactionId: fedaId };
  }
  if (fedaStatus === "pending" || fedaStatus === "processing" || fedaStatus === "initialized") {
    if (order.payment.status === "PENDING" && new Date() > order.payment.expiresAt) {
      await markExpired(order.id, order.payment.id);
      return { status: "EXPIRED", orderId, transactionId: fedaId };
    }
    return { status: "PENDING", orderId, transactionId: fedaId };
  }
  if (order.payment.status === "PENDING" && new Date() > order.payment.expiresAt) {
    await markExpired(order.id, order.payment.id);
    return { status: "EXPIRED", orderId, transactionId: fedaId };
  }
  return { status: "PENDING", orderId, transactionId: fedaId };
}

async function markExpired(orderId: string, paymentId: string) {
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
    prisma.payment.update({ where: { id: paymentId }, data: { status: "EXPIRED" } }),
  ]);
}

async function markDeclined(orderId: string, paymentId: string) {
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
    prisma.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } }),
  ]);
}

export async function markPaidAndShip(orderId: string, referenceId: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, items: { include: { product: true } } },
  });
  if (!o || !o.payment) return;
  if (o.status === "PAID" && o.payment.status === "SUCCESS" && o.stockDecremented) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (!o.stockDecremented) {
      for (const line of o.items) {
        const up = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (up.count === 0) {
          throw new Error("Stock insuffisant pour un article de la commande");
        }
      }
    }
    await tx.order.update({
      where: { id: o.id },
      data: { status: "PAID" as OrderStatus, stockDecremented: true },
    });
    await tx.payment.update({
      where: { id: o.payment!.id },
      data: { status: "SUCCESS" as PaymentStatus, transactionId: referenceId },
    });
  });

  try {
    await generateOrderInvoice(o.id);
  } catch (e) {
    console.error("Génération facture", e);
  }
}

export async function handleWebhookFedaEvent(
  statusRaw: string,
  transactionId: string,
) {
  const payment = await prisma.payment.findFirst({
    where: { transactionId: String(transactionId) },
  });
  if (!payment) {
    return { found: false as const };
  }
  const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
  if (!order) {
    return { found: true as const, updated: false as const };
  }
  const f = (statusRaw || "pending").toLowerCase();
  if (APPROVED.has(f) || f.includes("approved")) {
    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { product: true } } },
    });
    if (full) {
      await markPaidAndShip(full.id, String(transactionId));
    }
    return { found: true as const, updated: true as const, status: "SUCCESS" as const };
  }
  if (DECLINED.has(f) || f === "refused") {
    await markDeclined(payment.orderId, payment.id);
    return { found: true as const, updated: true as const, status: "FAILED" as const };
  }
  return { found: true as const, updated: false as const, status: "PENDING" as const };
}

import { authOptions } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { syncOrderPayment } from "@/lib/paymentService";
import { prisma } from "@/lib/prisma";
import { sendOrderCancelled, sendOrderConfirmation } from "@/lib/sms";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { orderId } = params;
  const paymentSimulation = process.env.PAYMENT_SIMULATION === "true";
  const order = await prisma.order.findFirst({
    where: { id: orderId, clientId: session.user.clientId },
    include: { client: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  if (paymentSimulation) {
    const pay = await prisma.payment.findUnique({ where: { orderId } });
    if (!pay) {
      return NextResponse.json({ status: "PENDING" as const, orderId });
    }
    if (pay.status === "SUCCESS") {
      return NextResponse.json({ status: "SUCCESS" as const, orderId });
    }
    if (pay.status === "FAILED") {
      return NextResponse.json({ status: "FAILED" as const, orderId });
    }
    if (pay.status === "EXPIRED") {
      return NextResponse.json({ status: "EXPIRED" as const, orderId });
    }
    return NextResponse.json({ status: "PENDING" as const, orderId });
  }

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  const result = await syncOrderPayment(orderId, null);
  const after = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (before && after && before.status !== after.status) {
    const orderNumber = generateInvoiceNumber(orderId);
    if (after.status === "PAID") {
      await sendOrderConfirmation(
        order.client.phone,
        orderNumber,
        after.totalFcfa,
        after.estimatedDelivery || "15 à 25",
      );
    } else if (after.status === "CANCELLED") {
      await sendOrderCancelled(order.client.phone, orderNumber);
    }
  }
  if (result.status === "EXPIRED") {
    return NextResponse.json({ status: "EXPIRED" as const, orderId: result.orderId });
  }
  if (result.status === "FAILED") {
    return NextResponse.json({ status: "FAILED" as const, orderId: result.orderId });
  }
  if (result.status === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS" as const, orderId: result.orderId });
  }
  return NextResponse.json({ status: "PENDING" as const, orderId: result.orderId });
}

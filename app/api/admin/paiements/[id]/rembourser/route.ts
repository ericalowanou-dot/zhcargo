import { requireAdmin } from "@/lib/adminAuth";
import { initiateRefund } from "@/lib/fedapayClient";
import { prisma } from "@/lib/prisma";
import { sendRefundInitiated } from "@/lib/sms";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function POST(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as { reason?: string };
  const reason = (body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ error: "Motif de remboursement requis" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { order: { include: { client: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }
  if (payment.status !== "SUCCESS") {
    return NextResponse.json({ error: "Seuls les paiements confirmés peuvent être remboursés" }, { status: 400 });
  }
  if (!payment.transactionId) {
    return NextResponse.json({ error: "Référence de transaction manquante" }, { status: 400 });
  }

  let refundReference = `RF-${Date.now()}`;
  try {
    const refund = await initiateRefund({
      transactionId: payment.transactionId,
      reason,
      amount: payment.amountFcfa,
    });
    refundReference = refund.refundReference;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de remboursement";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundReference,
        refundReason: reason,
        refundedAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELLED" },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: "CANCELLED",
        note: `Commande annulée suite à remboursement (${refundReference})`,
      },
    }),
  ]);

  try {
    await sendRefundInitiated(
      payment.order.client.phone,
      payment.amountFcfa,
      payment.operator,
    );
  } catch (e) {
    console.error("SMS remboursement", e);
  }

  return NextResponse.json({ success: true, refundReference });
}


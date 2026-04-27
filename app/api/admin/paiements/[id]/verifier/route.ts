import { requireAdmin } from "@/lib/adminAuth";
import { syncOrderPayment } from "@/lib/paymentService";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { order: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  const result = await syncOrderPayment(payment.orderId, payment.transactionId || null);
  const updated = await prisma.payment.findUnique({ where: { id: params.id } });

  return NextResponse.json({
    status: result.status,
    updatedAt: updated?.updatedAt || new Date(),
  });
}


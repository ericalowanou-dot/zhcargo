import { authOptions } from "@/lib/auth";
import { persistOrderInvoice } from "@/lib/invoiceService";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = (await request.json()) as { orderId?: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId requis" }, { status: 400 });
  }
  const o = await prisma.order.findFirst({
    where: { id: body.orderId, clientId: session.user.clientId },
  });
  if (!o) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (o.status === "PENDING" || o.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Commande non éligible à la facture" },
      { status: 400 },
    );
  }
  const result = await persistOrderInvoice(o.id);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, success: false },
      { status: 500 },
    );
  }
  return NextResponse.json({
    success: true,
    invoicePath: result.invoicePath,
  });
}

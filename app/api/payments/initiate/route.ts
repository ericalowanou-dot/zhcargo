import { authOptions } from "@/lib/auth";
import { createTransactionAndSendNow } from "@/lib/fedapayClient";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { getOperatorById, getPaymentWaitHints } from "@/lib/mobileMoneyOperators";
import { isPaymentSimulation } from "@/lib/paymentMode";
import { markPaidAndShip } from "@/lib/paymentService";
import { prisma } from "@/lib/prisma";
import { sendOrderCancelled } from "@/lib/sms";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Body = {
  orderId: string;
  operator: string;
  phone: string;
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
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!body.orderId || !body.operator || !body.phone) {
    return NextResponse.json(
      { error: "orderId, operator et phone requis" },
      { status: 400 },
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
  });
  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, clientId: client.id },
    include: { payment: true },
  });
  if (!order || !order.payment) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Cette commande n’est plus en attente" },
      { status: 400 },
    );
  }
  if (order.payment.status !== "PENDING") {
    return NextResponse.json(
      { error: "Paiement déjà traité" },
      { status: 400 },
    );
  }
  if (new Date() > order.payment.expiresAt) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      }),
      prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: "EXPIRED" },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: "Commande annulée (paiement expiré)",
        },
      }),
    ]);
    await sendOrderCancelled(
      client.phone,
      generateInvoiceNumber(order.id),
      "Paiement non confirmé dans le délai imparti.",
    );
    return NextResponse.json(
      { error: "Cette commande a expiré et a été annulée." },
      { status: 410 },
    );
  }

  const op = getOperatorById(body.operator, client.country);
  if (!op) {
    return NextResponse.json({ error: "Opérateur invalide" }, { status: 400 });
  }

  const paymentSimulation = isPaymentSimulation();
  const simulationResult = (
    process.env.PAYMENT_SIMULATION_RESULT || "SUCCESS"
  ).toUpperCase();

  if (order.payment.transactionId) {
    return NextResponse.json({
      transactionId: order.payment.transactionId,
      instructions: getPaymentWaitHints(op.id, op.name),
    });
  }

  if (paymentSimulation) {
    const simulatedTx = `sim_${Date.now()}`;
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { transactionId: simulatedTx, operator: body.operator },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentOperator: body.operator },
    });

    if (simulationResult === "SUCCESS") {
      await markPaidAndShip(order.id, simulatedTx);
      return NextResponse.json({
        transactionId: simulatedTx,
        simulated: true,
        simulationOutcome: "SUCCESS" as const,
        instructions:
          "Mode test : paiement validé automatiquement. La facture PDF est générée (téléchargeable). En production, définissez PAYMENT_SIMULATION=false et configurez FedaPay.",
      });
    }

    if (simulationResult === "FAILED") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: "FAILED" },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            note: "Commande annulée (simulation paiement échoué)",
          },
        }),
      ]);
      await sendOrderCancelled(
        client.phone,
        generateInvoiceNumber(order.id),
        "Simulation: paiement échoué.",
      );
      return NextResponse.json({
        transactionId: simulatedTx,
        simulated: true,
        simulationOutcome: "FAILED" as const,
        instructions: "Mode test : paiement marqué comme échoué.",
      });
    }

    if (simulationResult === "EXPIRED") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: "EXPIRED" },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            note: "Commande annulée (simulation paiement expiré)",
          },
        }),
      ]);
      await sendOrderCancelled(
        client.phone,
        generateInvoiceNumber(order.id),
        "Simulation: paiement expiré.",
      );
      return NextResponse.json({
        transactionId: simulatedTx,
        simulated: true,
        simulationOutcome: "EXPIRED" as const,
        instructions: "Mode test : paiement expiré.",
      });
    }

    return NextResponse.json({
      transactionId: simulatedTx,
      simulated: true,
      simulationOutcome: "PENDING" as const,
      instructions: "Mode test : paiement en attente.",
    });
  }

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const name =
    order.deliveryFullName?.split(" ")[0] || client.name || "Client";
  const countryIso2 = (client.country || "TG").toUpperCase().slice(0, 2);

  try {
    const { transactionId, fedaMessage } = await createTransactionAndSendNow({
      description: `Commande ZH Cargo #${order.id}`,
      amount: order.totalFcfa,
      firstName: name,
      phone: body.phone,
      countryIso2,
      fedapayMode: op.fedapayMode,
      callbackUrl: `${base.replace(/\/$/, "")}/api/webhooks/fedapay`,
    });

    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { transactionId, operator: body.operator },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentOperator: body.operator },
    });

    return NextResponse.json({
      transactionId,
      instructions: fedaMessage || getPaymentWaitHints(op.id, op.name),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Paiement Mobile Money indisponible pour le moment. Vérifiez FedaPay (clé, opérateur) ou réessayez.",
      },
      { status: 502 },
    );
  }
}

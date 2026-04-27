import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { generateInvoicePDF, type OrderInvoiceData } from "@/lib/pdf";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";

const PUBLIC_INVOICES = join("public", "invoices");

function diskPathForInvoice(webPath: string) {
  const rel = webPath.replace(/^\//, "");
  return join(process.cwd(), "public", rel);
}

type PersistResult = { success: true; invoicePath: string } | { success: false; error: string };

/**
 * Génère le PDF, l’enregistre dans public/invoices/ et met à jour order.invoicePath.
 * Idempotent : si la facture existe déjà, renvoie le chemin existant.
 */
export async function persistOrderInvoice(orderId: string): Promise<PersistResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
      payment: true,
    },
  });

  if (!order) {
    return { success: false, error: "Commande introuvable" };
  }

  if (order.invoicePath) {
    const p = diskPathForInvoice(order.invoicePath);
    if (existsSync(p)) {
      return { success: true, invoicePath: order.invoicePath };
    }
  }

  const data: OrderInvoiceData = {
    id: order.id,
    createdAt: order.createdAt,
    totalFcfa: order.totalFcfa,
    status: order.status,
    deliveryFullName: order.deliveryFullName,
    deliveryCity: order.deliveryCity,
    deliveryNeighborhood: order.deliveryNeighborhood,
    deliveryLandmark: order.deliveryLandmark,
    paymentOperator: order.paymentOperator,
    paymentReference: order.paymentReference,
    estimatedDelivery: order.estimatedDelivery,
    client: order.client,
    items: order.items,
    payment: order.payment
      ? {
          operator: order.payment.operator,
          status: order.payment.status,
          transactionId: order.payment.transactionId,
        }
      : null,
  };

  const buf = await generateInvoicePDF(data);
  const fact = generateInvoiceNumber(orderId);
  const fileName = `${fact.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;
  const dir = join(process.cwd(), PUBLIC_INVOICES);
  await mkdir(dir, { recursive: true });
  const fullPath = join(dir, fileName);
  await writeFile(fullPath, buf);

  const webPath = `/invoices/${fileName}`;
  await prisma.order.update({
    where: { id: orderId },
    data: { invoicePath: webPath },
  });

  return { success: true, invoicePath: webPath };
}

/** Compat : utilisé par le webhook paiement — retourne true si le PDF a été généré ou existait. */
export async function generateOrderInvoice(orderId: string): Promise<boolean> {
  const r = await persistOrderInvoice(orderId);
  return r.success;
}

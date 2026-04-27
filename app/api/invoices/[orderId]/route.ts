import { authOptions } from "@/lib/auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: { orderId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { orderId } = context.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.clientId !== session.user.clientId) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  if (!order.invoicePath) {
    return NextResponse.json({ error: "Facture indisponible" }, { status: 404 });
  }

  const rel = order.invoicePath.replace(/^\//, "");
  const abs = join(process.cwd(), "public", rel);
  let buf: Buffer;
  try {
    buf = await readFile(abs);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const name = `${generateInvoiceNumber(order.id)}.pdf`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}

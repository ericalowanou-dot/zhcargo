import { requireAdmin } from "@/lib/adminAuth";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function parseDateStart(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function parseDateEnd(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}
function esc(v: string | number | null | undefined) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildWhere(params: URLSearchParams): Prisma.OrderWhereInput {
  const statusParam = params.get("status");
  const search = (params.get("search") || "").trim();
  const from = parseDateStart(params.get("from"));
  const to = parseDateEnd(params.get("to"));
  const where: Prisma.OrderWhereInput = {};

  if (statusParam && statusParam !== "ALL") {
    if ((Object.values(OrderStatus) as string[]).includes(statusParam)) {
      where.status = statusParam as OrderStatus;
    }
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { client: { name: { contains: search } } },
      { client: { phone: { contains: search } } },
    ];
  }
  return where;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim();
  const invoiceSearch = /^fact-/i.test(search) ? search.toUpperCase() : null;
  const where = buildWhere(params);
  const rows = await prisma.order.findMany({
    where,
    include: {
      client: true,
      items: { include: { product: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const filtered = invoiceSearch
    ? rows.filter((o) =>
        generateInvoiceNumber(o.id).toUpperCase().includes(invoiceSearch),
      )
    : rows;

  const header = [
    "N°Commande",
    "Client",
    "Téléphone",
    "Pays",
    "Produits",
    "Total FCFA",
    "Coût achat FCFA",
    "Bénéfice FCFA",
    "Opérateur",
    "Statut",
    "Date création",
    "Date livraison",
  ];

  const lines = [header.join(",")];
  for (const o of filtered) {
    const products = o.items
      .map((it) => `${it.quantity}x ${it.product.name}`)
      .join(" | ");
    const purchaseCost = o.items.reduce(
      (s, it) => s + (it.product.purchasePrice + it.product.transportCost) * it.quantity,
      0,
    );
    const profit =
      o.profitFcfa ??
      o.items.reduce(
        (s, it) =>
          s +
          (it.unitPriceFcfa - it.product.purchasePrice - it.product.transportCost) *
            it.quantity,
        0,
      );
    const deliveredAt =
      o.status === "DELIVERED" ? o.updatedAt.toISOString() : "";
    lines.push(
      [
        generateInvoiceNumber(o.id),
        o.client.name || "Client",
        o.client.phone,
        o.client.country,
        products,
        Math.round(o.totalFcfa),
        Math.round(purchaseCost),
        Math.round(profit),
        o.payment?.operator || o.paymentOperator || "",
        o.status,
        o.createdAt.toISOString(),
        deliveredAt,
      ]
        .map(esc)
        .join(","),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${today}.csv"`,
    },
  });
}

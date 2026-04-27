import { requireAdmin } from "@/lib/adminAuth";
import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 25;

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

function opLabel(operator: string | null | undefined) {
  const x = (operator || "").toLowerCase();
  if (!x) return "—";
  if (x.includes("tmoney") || x.startsWith("tg_")) return "TMoney";
  if (x.includes("flooz")) return "Flooz";
  if (x.includes("mtn")) return "MTN";
  if (x.includes("orange")) return "Orange Money";
  if (x.includes("wave")) return "Wave";
  return operator || "—";
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
  if (search && !/^fact-/i.test(search)) {
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
  const page = Math.max(1, Number(params.get("page") || 1));
  const search = (params.get("search") || "").trim();
  const invoiceSearch = /^fact-/i.test(search) ? search.toUpperCase() : null;
  const where = buildWhere(params);
  const [baseRows, grouped] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        client: true,
        items: { include: { product: { select: { name: true } } } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: {
        ...buildWhere(
          new URLSearchParams([
            ["search", params.get("search") || ""],
            ["from", params.get("from") || ""],
            ["to", params.get("to") || ""],
          ]),
        ),
      },
    }),
  ]);

  const counts = {
    ALL: grouped.reduce((s, g) => s + g._count._all, 0),
    PENDING: 0,
    PAID: 0,
    PROCESSING: 0,
    TRANSIT: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
  }

  const filteredRows = invoiceSearch
    ? baseRows.filter((o) =>
        generateInvoiceNumber(o.id).toUpperCase().includes(invoiceSearch),
      )
    : baseRows;
  const total = filteredRows.length;
  const rows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const orders = rows.map((o) => ({
    id: o.id,
    invoiceNumber: generateInvoiceNumber(o.id),
    client: {
      id: o.client.id,
      name: o.client.name || "Client",
      phone: o.client.phone,
      country: o.client.country,
    },
    productsLabel: o.items
      .slice(0, 3)
      .map((it) => `${it.quantity}x ${it.product.name}`)
      .join(", "),
    totalFcfa: o.totalFcfa,
    operatorLabel: opLabel(o.payment?.operator || o.paymentOperator),
    status: o.status,
    createdAt: o.createdAt,
    itemCount: o.items.length,
  }));

  return NextResponse.json({
    orders,
    counts,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

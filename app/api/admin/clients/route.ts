import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { OrderStatus, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 30;
const PAID_PLUS: OrderStatus[] = ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"];

function toPage(v: string | null) {
  return Math.max(1, Number(v || 1));
}

function buildWhere(params: URLSearchParams): Prisma.ClientWhereInput {
  const search = (params.get("search") || "").trim();
  const country = (params.get("country") || "ALL").trim();
  const where: Prisma.ClientWhereInput = {};
  if (search) {
    where.OR = [{ name: { contains: search } }, { phone: { contains: search } }];
  }
  if (country && country !== "ALL") {
    where.country = country;
  }
  return where;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const page = toPage(params.get("page"));
  const sort = params.get("sort") || "recent";
  const where = buildWhere(params);

  const clients = await prisma.client.findMany({
    where,
    include: {
      orders: {
        select: {
          id: true,
          status: true,
          totalFcfa: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = clients.map((c) => {
    const ordersCount = c.orders.length;
    const deliveredCount = c.orders.filter((o) => o.status === "DELIVERED").length;
    const cancelledCount = c.orders.filter((o) => o.status === "CANCELLED").length;
    const inProgressCount = c.orders.filter(
      (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
    ).length;
    const totalSpent = c.orders.reduce(
      (sum, o) => (PAID_PLUS.includes(o.status as OrderStatus) ? sum + o.totalFcfa : sum),
      0,
    );
    const lastOrderDate = c.orders.reduce<Date | null>(
      (last, o) => (!last || o.createdAt > last ? o.createdAt : last),
      null,
    );
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      country: c.country,
      createdAt: c.createdAt,
      ordersCount,
      deliveredCount,
      cancelledCount,
      inProgressCount,
      totalSpent,
      lastOrderDate,
    };
  });

  mapped.sort((a, b) => {
    if (sort === "spent") return b.totalSpent - a.totalSpent;
    if (sort === "orders") return b.ordersCount - a.ordersCount;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const total = mapped.length;
  const totalRevenueGenerated = mapped.reduce((s, c) => s + c.totalSpent, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = mapped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({
    clients: rows,
    total,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    totalRevenueGenerated,
  });
}


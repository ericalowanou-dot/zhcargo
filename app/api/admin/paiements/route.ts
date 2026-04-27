import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 25;

function parseStart(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function parseEnd(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildWhere(params: URLSearchParams, includeStatus = true): Prisma.PaymentWhereInput {
  const status = params.get("status");
  const operator = (params.get("operator") || "").trim();
  const search = (params.get("search") || "").trim();
  const from = parseStart(params.get("from"));
  const to = parseEnd(params.get("to"));
  const where: Prisma.PaymentWhereInput = {};

  if (includeStatus && status && status !== "ALL") {
    if ((Object.values(PaymentStatus) as string[]).includes(status)) {
      where.status = status as PaymentStatus;
    }
  }
  if (operator && operator !== "ALL") {
    where.operator = { contains: operator };
  }
  if (from || to) {
    where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  if (search) {
    where.OR = [
      { transactionId: { contains: search } },
      { orderId: { contains: search } },
      { order: { client: { phone: { contains: search } } } },
      { order: { client: { name: { contains: search } } } },
    ];
  }
  return where;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") || 1));
  const where = buildWhere(params, true);
  const whereForCounts = buildWhere(params, false);

  const [rows, total, grouped, sums] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: { include: { client: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: whereForCounts,
    }),
    prisma.payment.groupBy({
      by: ["status"],
      _sum: { amountFcfa: true },
      where,
    }),
  ]);

  const counts: Record<string, number> = { ALL: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  }

  const totalConfirmed =
    sums.find((x) => x.status === "SUCCESS")?._sum.amountFcfa || 0;
  const totalPending = sums.find((x) => x.status === "PENDING")?._sum.amountFcfa || 0;
  const totalFailedExpired =
    (sums.find((x) => x.status === "FAILED")?._sum.amountFcfa || 0) +
    (sums.find((x) => x.status === "EXPIRED")?._sum.amountFcfa || 0);
  const baseCount = sums.reduce((s, x) => s + (x._sum.amountFcfa ? 1 : 0), 0);
  const successRate = baseCount ? Math.round((totalConfirmed / (totalConfirmed + totalPending + totalFailedExpired || 1)) * 100) : 0;

  return NextResponse.json({
    payments: rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
    counts,
    summary: {
      totalConfirmed,
      totalPending,
      totalFailedExpired,
      successRate,
    },
  });
}


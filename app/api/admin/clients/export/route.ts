import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { OrderStatus, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const PAID_PLUS: OrderStatus[] = ["PAID", "PROCESSING", "TRANSIT", "DELIVERED"];

function esc(v: string | number | null | undefined) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildWhere(params: URLSearchParams): Prisma.ClientWhereInput {
  const search = (params.get("search") || "").trim();
  const country = (params.get("country") || "ALL").trim();
  const where: Prisma.ClientWhereInput = {};
  if (search) {
    where.OR = [{ name: { contains: search } }, { phone: { contains: search } }];
  }
  if (country && country !== "ALL") where.country = country;
  return where;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const where = buildWhere(request.nextUrl.searchParams);
  const clients = await prisma.client.findMany({
    where,
    include: {
      orders: { select: { status: true, totalFcfa: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines = [
    [
      "ID",
      "Téléphone",
      "Nom",
      "Pays",
      "Ville",
      "Nb Commandes",
      "Total Dépensé",
      "Membre depuis",
    ].join(","),
  ];

  for (const c of clients) {
    const totalSpent = c.orders.reduce(
      (sum, o) => (PAID_PLUS.includes(o.status) ? sum + o.totalFcfa : sum),
      0,
    );
    lines.push(
      [
        esc(c.id),
        esc(c.phone),
        esc(c.name || "Client anonyme"),
        esc(c.country),
        esc(c.city || ""),
        esc(c.orders.length),
        esc(Math.round(totalSpent)),
        esc(new Intl.DateTimeFormat("fr-FR").format(c.createdAt)),
      ].join(","),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const csv = `${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${today}.csv"`,
    },
  });
}


import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const type = (request.nextUrl.searchParams.get("type") || "ALL").trim();
  const where = type === "ALL" ? {} : { type };

  const [rows, monthStats] = await Promise.all([
    prisma.smsSent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.smsSent.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      select: { status: true },
    }),
  ]);

  const sent = monthStats.filter((x) => x.status === "SENT").length;
  const failed = monthStats.filter((x) => x.status === "FAILED").length;
  const successRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;

  return NextResponse.json({
    sms: rows,
    summary: { monthSent: sent, successRate },
  });
}


import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sendPromotion } from "@/lib/sms";
import { NextResponse } from "next/server";

type Body = {
  message: string;
  targets?: {
    all?: boolean;
    countries?: string[];
    daysSinceOrder?: number;
  };
};

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as Body;
  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }
  if (message.length > 160) {
    return NextResponse.json({ error: "Message limité à 160 caractères" }, { status: 400 });
  }

  const countries = body.targets?.countries?.map((x) => x.trim().toUpperCase()).filter(Boolean) || [];
  const days = body.targets?.daysSinceOrder;
  const cutoff =
    typeof days === "number" && days > 0 ? new Date(Date.now() - days * 86400000) : null;

  const clients = await prisma.client.findMany({
    where: {
      ...(countries.length > 0 ? { country: { in: countries } } : {}),
      ...(cutoff
        ? {
            orders: {
              some: { createdAt: { gte: cutoff } },
            },
          }
        : {}),
      settings: {
        is: { smsPromotions: true },
      },
    },
    select: { phone: true },
  });

  let sent = 0;
  let failed = 0;
  for (const c of clients) {
    const res = await sendPromotion(c.phone, message);
    if (res.success) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ sent, failed });
}


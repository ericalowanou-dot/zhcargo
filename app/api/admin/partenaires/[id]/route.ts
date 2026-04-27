import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const partner = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!partner) {
    return NextResponse.json({ error: "Partenaire introuvable" }, { status: 404 });
  }
  const splits = await prisma.revenueSplit.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  const history = splits
    .map((s) => {
      try {
        const arr = JSON.parse(s.splits) as {
          partnerId: string;
          amountFcfa: number;
          percentage: number;
          name: string;
        }[];
        const me = arr.find((x) => x.partnerId === params.id);
        if (!me) return null;
        return {
          id: s.id,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          totalProfitFcfa: s.totalProfitFcfa,
          amountFcfa: me.amountFcfa,
          percentage: me.percentage,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return NextResponse.json({ partner, history });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    role?: string;
    percentage?: number;
    isActive?: boolean;
  };
  if (body.percentage !== undefined) {
    const p = Number(body.percentage);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      return NextResponse.json({ error: "Pourcentage invalide" }, { status: 400 });
    }
  }
  const partner = await prisma.partner.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.role !== undefined ? { role: body.role.trim() } : {}),
      ...(body.percentage !== undefined ? { percentage: Number(body.percentage) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    },
  });
  return NextResponse.json({ partner });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  await prisma.partner.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}

import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "asc" }],
  });
  return NextResponse.json({ partners });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    role?: string;
    percentage?: number;
    isActive?: boolean;
  };
  const name = (body.name || "").trim();
  const role = (body.role || "").trim();
  const percentage = Number(body.percentage ?? 0);
  if (!name || !role) {
    return NextResponse.json({ error: "Nom et rôle requis" }, { status: 400 });
  }
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return NextResponse.json({ error: "Pourcentage invalide" }, { status: 400 });
  }

  const partner = await prisma.partner.create({
    data: {
      name,
      role,
      percentage,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json({ partner });
}

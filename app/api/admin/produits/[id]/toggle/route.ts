import { requireAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function PATCH(_req: Request, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const p = await prisma.product.findUnique({ where: { id: params.id } });
  if (!p) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: !p.isActive },
  });
  return NextResponse.json({ isActive: updated.isActive });
}

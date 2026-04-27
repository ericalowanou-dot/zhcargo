import { createAdminHandoffToken } from "@/lib/admin-handoff-jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail et mot de passe requis" },
        { status: 400 },
      );
    }
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }
    const handoff = await createAdminHandoffToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
    });
    return NextResponse.json({ success: true, handoff });
  } catch (e) {
    console.error("admin login", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}

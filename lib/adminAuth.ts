import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return { session: null, error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  return { session, error: null as null };
}

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Body = {
  name?: string;
  city?: string;
  neighborhood?: string;
  landmark?: string;
  country?: string;
  smsNotifications?: boolean;
  smsPromotions?: boolean;
};

const ALLOWED_COUNTRIES = new Set(["TG", "BJ", "CI", "GA", "BF", "SN"]);

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clientId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const country = body.country?.toUpperCase().trim();
  if (country && !ALLOWED_COUNTRIES.has(country)) {
    return NextResponse.json({ error: "Pays invalide" }, { status: 400 });
  }

  const client = await prisma.client.update({
    where: { id: session.user.clientId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() || null } : {}),
      ...(body.city !== undefined ? { city: body.city.trim() || null } : {}),
      ...(body.neighborhood !== undefined
        ? { neighborhood: body.neighborhood.trim() || null }
        : {}),
      ...(body.landmark !== undefined ? { landmark: body.landmark.trim() || null } : {}),
      ...(country ? { country } : {}),
    },
  });

  if (body.smsNotifications !== undefined || body.smsPromotions !== undefined) {
    await prisma.clientSettings.upsert({
      where: { clientId: session.user.clientId },
      create: {
        clientId: session.user.clientId,
        smsNotifications: body.smsNotifications ?? true,
        smsPromotions: body.smsPromotions ?? true,
      },
      update: {
        ...(body.smsNotifications !== undefined
          ? { smsNotifications: body.smsNotifications }
          : {}),
        ...(body.smsPromotions !== undefined ? { smsPromotions: body.smsPromotions } : {}),
      },
    });
  }

  return NextResponse.json({ client });
}


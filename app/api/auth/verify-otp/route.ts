import { prisma } from "@/lib/prisma";
import { e164ToIsoCountry } from "@/lib/phone-regions";
import { createHandoffToken } from "@/lib/handoff-jwt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { phone?: string; code?: string };
  try {
    body = (await request.json()) as { phone?: string; code?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  const phone = body.phone?.trim();
  const code = body.code?.replace(/\D/g, "").trim();
  const otpOptional = process.env.AUTH_OTP_OPTIONAL === "true";

  if (!phone || (!code && !otpOptional)) {
    return NextResponse.json(
      { success: false, error: "Téléphone et code requis." },
      { status: 400 },
    );
  }

  const e164 = phone.startsWith("+") ? phone : `+${phone.replace(/^\+?/, "")}`;

  if (!otpOptional && code && code.length !== 6) {
    return NextResponse.json(
      { success: false, error: "Code incorrect ou expiré" },
      { status: 400 },
    );
  }

  const now = new Date();

  if (!otpOptional) {
    const activeOtp = await prisma.otpCode.findFirst({
      where: { phone: e164, used: false, expiresAt: { gte: now } },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp) {
      const last = await prisma.otpCode.findFirst({
        where: { phone: e164 },
        orderBy: { createdAt: "desc" },
      });
      if (last && last.expiresAt < now) {
        return NextResponse.json(
          { success: false, error: "Code expiré, demandez un nouveau code" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, error: "Code incorrect ou expiré" },
        { status: 400 },
      );
    }

    if (activeOtp.code !== code) {
      return NextResponse.json(
        { success: false, error: "Code incorrect, réessayez" },
        { status: 400 },
      );
    }

    await prisma.otpCode.update({
      where: { id: activeOtp.id },
      data: { used: true },
    });
  }

  const country = e164ToIsoCountry(e164);
  const client = await prisma.client.upsert({
    where: { phone: e164 },
    create: { phone: e164, country },
    update: { country },
  });

  await prisma.clientSettings.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, smsNotifications: true, smsPromotions: true },
    update: {},
  });

  const handoff = await createHandoffToken(client.id, client.phone);

  return NextResponse.json({
    success: true,
    clientId: client.id,
    handoff,
  });
}

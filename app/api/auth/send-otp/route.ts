import { prisma } from "@/lib/prisma";
import { sendOTP } from "@/lib/sms";
import { validateE164 } from "@/lib/phone-regions";
import { NextResponse } from "next/server";

function randomSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = body.phone?.trim();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Numéro de téléphone requis." },
        { status: 400 },
      );
    }

    const e164 = phone.startsWith("+") ? phone : `+${phone.replace(/^\+?/, "")}`;
    const v = validateE164(e164);
    if (!v.ok) {
      return NextResponse.json({ success: false, error: v.error }, { status: 400 });
    }

    const code = randomSixDigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.updateMany({
      where: { phone: e164, used: false },
      data: { used: true },
    });

    await prisma.otpCode.create({
      data: {
        phone: e164,
        code,
        expiresAt,
        used: false,
      },
    });

    const sms = await sendOTP(e164, code);
    if (!sms.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service SMS indisponible. Vérifiez la configuration Twilio (compte, jeton, numéro d’émission).",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, message: "Code envoyé" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible d’envoyer le SMS pour le moment. Vérifiez le numéro et réessayez plus tard.",
      },
      { status: 500 },
    );
  }
}

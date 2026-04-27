import { generateInvoiceNumber } from "@/lib/invoiceFormat";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

type SmsResult = { success: boolean; sid?: string };

type SmsKind =
  | "OTP"
  | "CONFIRMATION"
  | "PROCESSING"
  | "TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUND"
  | "PROMOTION";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

async function shouldSend(phone: string, type: SmsKind) {
  const client = await prisma.client.findUnique({
    where: { phone },
    include: { settings: true },
  });
  if (!client) return true;
  if (!client.settings) return true;
  if (type === "PROMOTION") return client.settings.smsPromotions;
  return client.settings.smsNotifications;
}

async function logSms(input: {
  phone: string;
  type: SmsKind;
  message: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  twilioSid?: string;
  error?: string;
}) {
  try {
    await prisma.smsSent.create({
      data: {
        phone: input.phone,
        type: input.type,
        message: input.message,
        status: input.status,
        twilioSid: input.twilioSid || null,
        error: input.error || null,
      },
    });
  } catch (e) {
    console.error("SMS log", e);
  }
}

async function send(phone: string, type: SmsKind, message: string): Promise<SmsResult> {
  const canSend = await shouldSend(phone, type);
  if (!canSend) {
    await logSms({ phone, type, message, status: "SKIPPED" });
    return { success: false };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    await logSms({
      phone,
      type,
      message,
      status: "FAILED",
      error: "Configuration Twilio manquante",
    });
    return { success: false };
  }

  try {
    const client = twilio(accountSid, authToken);
    const res = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phone.startsWith("+") ? phone : `+${digits(phone)}`,
    });
    await logSms({ phone, type, message, status: "SENT", twilioSid: res.sid });
    return { success: true, sid: res.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Twilio";
    await logSms({ phone, type, message, status: "FAILED", error: msg });
    console.error("SMS send", e);
    return { success: false };
  }
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export async function sendOTP(phone: string, code: string) {
  return send(
    phone,
    "OTP",
    `Votre code ZH Cargo est: ${code}. Valide 10 minutes. Ne le partagez pas.`,
  );
}

export async function sendOrderConfirmation(
  phone: string,
  orderNumber: string,
  totalFcfa: number,
  deliveryDays: string,
) {
  return send(
    phone,
    "CONFIRMATION",
    `Commande ${orderNumber} confirmée. Total: ${formatAmount(totalFcfa)} FCFA. Livraison estimée: ${deliveryDays} jours. Suivez votre commande sur ZH Cargo.`,
  );
}

export async function sendOrderProcessing(phone: string, orderNumber: string) {
  return send(
    phone,
    "PROCESSING",
    `Votre commande ${orderNumber} est en cours de traitement. Nous préparons votre envoi depuis la Chine.`,
  );
}

export async function sendOrderInTransit(
  phone: string,
  orderNumber: string,
  estimatedDate: string,
) {
  return send(
    phone,
    "TRANSIT",
    `Votre commande ${orderNumber} est en route. Livraison estimée: ${estimatedDate}. Nous vous contacterons à l'arrivée.`,
  );
}

export async function sendOrderDelivered(phone: string, orderNumber: string) {
  return send(
    phone,
    "DELIVERED",
    `Votre commande ${orderNumber} a été livrée. Merci pour votre confiance. Revenez nous voir sur ZH Cargo.`,
  );
}

export async function sendOrderCancelled(
  phone: string,
  orderNumber: string,
  reason?: string,
) {
  const r = reason || "Paiement non confirmé dans le délai imparti.";
  return send(
    phone,
    "CANCELLED",
    `Votre commande ${orderNumber} a été annulée. ${r} Contactez-nous pour plus d'infos.`,
  );
}

export async function sendRefundInitiated(
  phone: string,
  amount: number,
  operator: string,
) {
  return send(
    phone,
    "REFUND",
    `Remboursement de ${formatAmount(amount)} FCFA initié sur votre ${operator}. Délai: 24 à 48h. ZH Cargo.`,
  );
}

export async function sendPromotion(phone: string, message: string) {
  return send(phone, "PROMOTION", `${message} - ZH Cargo`);
}

export function orderNumberFromId(orderId: string) {
  return generateInvoiceNumber(orderId);
}


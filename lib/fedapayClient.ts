import { FedaPay, Transaction } from "fedapay";

export function configureFedaPay() {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) {
    throw new Error("FEDAPAY_SECRET_KEY manquante");
  }
  FedaPay.setApiKey(key);
  const env = process.env.FEDAPAY_ENV;
  FedaPay.setEnvironment(env === "live" ? "live" : "sandbox");
}

function digitsToLocal(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length > 8) {
    return d.slice(-8);
  }
  return d;
}

export type CreateAndSendParams = {
  description: string;
  amount: number;
  firstName: string;
  phone: string;
  countryIso2: string;
  fedapayMode: string;
  callbackUrl: string;
};

/**
 * Crée la transaction côté FedaPay et lance l’appel Mobile Money (sendNow).
 * Retourne l’id FedaPay (transaction côté Feda Pay) et le message éventuel.
 */
export async function createTransactionAndSendNow(params: CreateAndSendParams) {
  configureFedaPay();
  const number = digitsToLocal(params.phone);
  const transaction = (await Transaction.create({
    description: params.description,
    amount: Math.round(params.amount),
    currency: { iso: "XOF" },
    callback_url: params.callbackUrl,
    customer: {
      firstname: params.firstName,
      lastname: "Client",
      phone_number: { number, country: params.countryIso2 },
    },
  } as object)) as { id?: string | number; sendNow: (m: string, p: object) => Promise<unknown> };

  const createdId = (transaction as { id?: string | number }).id;
  if (createdId == null) {
    throw new Error("Réponse FedaPay sans identifiant de transaction");
  }
  const res = (await (transaction as { sendNow: (m: string, p: object) => Promise<unknown> })
    .sendNow(params.fedapayMode, {})) as { message?: string };
  return {
    transactionId: String(createdId),
    fedaMessage: (res as { message?: string })?.message,
  };
}

export async function retrieveTransaction(
  fedaId: string,
): Promise<{ status: string; id: string }> {
  configureFedaPay();
  const tr = (await Transaction.retrieve(
    fedaId,
  )) as InstanceType<typeof Transaction> & { status: string; id: string | number };
  return {
    status: String((tr as { status: string }).status || "pending").toLowerCase(),
    id: String((tr as { id: number | string }).id),
  };
}

export async function initiateRefund(params: {
  transactionId: string;
  reason: string;
  amount?: number;
}) {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) {
    throw new Error("FEDAPAY_SECRET_KEY manquante");
  }
  const env = process.env.FEDAPAY_ENV === "live" ? "live" : "sandbox";
  const base = env === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";

  const res = await fetch(`${base}/transactions/${encodeURIComponent(params.transactionId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: params.reason,
      ...(params.amount ? { amount: Math.round(params.amount) } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Remboursement FedaPay impossible (${res.status})${text ? `: ${text}` : ""}`,
    );
  }
  const data = (await res.json()) as { id?: string | number; reference?: string };
  return {
    refundReference: String(data.reference || data.id || `rf-${Date.now()}`),
  };
}

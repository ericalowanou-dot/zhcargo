import { handleWebhookFedaEvent } from "@/lib/paymentService";
import { Webhook } from "fedapay";
import { NextResponse } from "next/server";

function extractIdAndStatus(payload: unknown): { id: string; status: string } | null {
  if (payload && typeof payload === "object" && "object" in payload) {
    const o = (payload as { object?: { id?: string | number; status?: string } })
      .object;
    if (o?.id != null && o?.status) {
      return { id: String(o.id), status: String(o.status) };
    }
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const d = (payload as { data?: { id?: string | number; status?: string } })
      .data;
    if (d?.id != null && d?.status) {
      return { id: String(d.id), status: String(d.status) };
    }
  }
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const k of Object.keys(p)) {
      if (k.startsWith("v1/") && p[k] && typeof p[k] === "object") {
        const v = p[k] as { id?: string | number; status?: string };
        if (v.id != null && v.status) {
          return { id: String(v.id), status: String(v.status) };
        }
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  const head =
    request.headers.get("Feda-Signature") ||
    request.headers.get("Feda-signature") ||
    request.headers.get("feda-signature") ||
    request.headers.get("X-Fedapay-Signature") ||
    request.headers.get("x-fedapay-signature");
  const secret =
    process.env.FEDAPAY_WEBHOOK_SECRET || process.env.FEDAPAY_SECRET_KEY;

  let payload: unknown;
  try {
    if (head && secret) {
      const evt = Webhook.constructEvent(raw, head, secret);
      payload = evt;
    } else {
      payload = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Webhook FedaPay parse", e);
    return new NextResponse("Invalid payload", { status: 400 });
  }

  const t = extractIdAndStatus(payload);
  if (t) {
    await handleWebhookFedaEvent(t.status, t.id);
  } else {
    const parsed = (typeof payload === "object" && payload && (payload as { type?: string }).type) || "";
    if (
      String(parsed).includes("transaction") ||
      String(parsed).includes("transaction.")
    ) {
      try {
        const b = JSON.parse(raw);
        const t2 = extractIdAndStatus(b);
        if (t2) {
          await handleWebhookFedaEvent(t2.status, t2.id);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return new NextResponse("OK", { status: 200 });
}

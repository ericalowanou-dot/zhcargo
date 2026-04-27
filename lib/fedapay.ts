import axios from "axios";

const FEDAPAY_API = "https://api.fedapay.com/v1";

export type MobileMoneyPayload = {
  amount: number;
  customerPhone: string;
  description: string;
};

export async function createMobileMoneyCharge(payload: MobileMoneyPayload) {
  const secretKey = process.env.FEDAPAY_SECRET_KEY;

  if (!secretKey) {
    throw new Error("FEDAPAY_SECRET_KEY is not configured.");
  }

  const response = await axios.post(
    `${FEDAPAY_API}/transactions`,
    {
      amount: payload.amount,
      description: payload.description,
      currency: { iso: "XOF" },
      customer: { phone_number: payload.customerPhone },
    },
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

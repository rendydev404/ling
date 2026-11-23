import crypto from "crypto";
import type { PaymentStatus } from "@/types/database";

export function isMidtransConfigured(): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  return Boolean(serverKey && !serverKey.includes("xxxxxxxx"));
}

export function getMidtransSnapBaseUrl(): string {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export function getMidtransSnapScriptUrl(): string {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export interface MidtransTransactionPayload {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  finishRedirectUrl?: string;
}

export async function createMidtransSnapTransaction(
  payload: MidtransTransactionPayload
): Promise<{ token: string; redirect_url: string; isSimulated: boolean }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey || serverKey.includes("xxxxxxxx")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return {
      token: `sandbox-demo-token-${payload.orderId}`,
      redirect_url: `${appUrl}/orders/${payload.orderId}?demo=1`,
      isSimulated: true,
    };
  }

  const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
  const body = {
    transaction_details: {
      order_id: payload.orderId,
      gross_amount: Math.round(payload.grossAmount),
    },
    customer_details: {
      first_name: payload.customerName.slice(0, 50),
      email: payload.customerEmail,
      phone: payload.customerPhone,
    },
    item_details: payload.items.map((item) => ({
      id: item.id.slice(0, 50),
      price: Math.round(item.price),
      quantity: item.quantity,
      name: item.name.slice(0, 50),
    })),
    callbacks: payload.finishRedirectUrl
      ? { finish: payload.finishRedirectUrl }
      : undefined,
  };

  const response = await fetch(getMidtransSnapBaseUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Midtrans Snap API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { token: string; redirect_url: string };
  return {
    token: data.token,
    redirect_url: data.redirect_url,
    isSimulated: false,
  };
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey?: string;
}): boolean {
  const key = params.serverKey ?? process.env.MIDTRANS_SERVER_KEY;
  if (!key) return false;

  const expected = crypto
    .createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${key}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(params.signatureKey || "", "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): PaymentStatus {
  if (transactionStatus === "capture") {
    return fraudStatus === "challenge" ? "pending" : "paid";
  }
  if (transactionStatus === "settlement") {
    return "paid";
  }
  if (transactionStatus === "pending") {
    return "pending";
  }
  if (transactionStatus === "expire") {
    return "expired";
  }
  if (transactionStatus === "cancel" || transactionStatus === "deny") {
    return "cancelled";
  }
  if (transactionStatus === "refund" || transactionStatus === "partial_refund") {
    return "refunded";
  }
  return "pending";
}

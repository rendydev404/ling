import crypto from "crypto";
import type { PaymentStatus } from "@/types/database";

function isPlaceholder(val?: string | null): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return !trimmed || trimmed.includes("xxxxxxxx");
}

export function isMidtransConfigured(): boolean {
  return !isPlaceholder(process.env.MIDTRANS_SERVER_KEY);
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

export function getMidtransMerchantId(): string | null {
  const merchantId = process.env.MIDTRANS_MERCHANT_ID?.trim();
  return isPlaceholder(merchantId) ? null : merchantId!;
}

export function getMidtransSnapBaseUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export function getMidtransSnapScriptUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function getMidtransCoreApiBaseUrl(): string {
  return isMidtransProduction()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function maskSecret(val?: string | null): string | null {
  if (isPlaceholder(val)) return null;
  const s = val!.trim();
  if (s.length <= 14) return `${s.slice(0, 4)}••••`;
  return `${s.slice(0, 11)}••••••••${s.slice(-4)}`;
}

export interface MidtransConfigSummary {
  isConfigured: boolean;
  isProduction: boolean;
  merchantId: string | null;
  clientKeyMasked: string | null;
  serverKeyMasked: string | null;
  signatureKeyMasked: string | null;
  webhookUrl: string;
}

export function getMidtransConfigSummary(): MidtransConfigSummary {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return {
    isConfigured: isMidtransConfigured(),
    isProduction: isMidtransProduction(),
    merchantId: getMidtransMerchantId(),
    clientKeyMasked: maskSecret(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY),
    serverKeyMasked: maskSecret(process.env.MIDTRANS_SERVER_KEY),
    signatureKeyMasked: maskSecret(process.env.MIDTRANS_SIGNATURE_KEY),
    webhookUrl: `${appUrl}/api/webhooks/midtrans`,
  };
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

function resolvePublicNotificationUrl(): string | null {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (!appUrl.startsWith("https://")) return null;
  try {
    const parsed = new URL(appUrl);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".local")
    ) {
      return null;
    }
    return `${appUrl}/api/webhooks/midtrans`;
  } catch {
    return null;
  }
}

export async function createMidtransSnapTransaction(
  payload: MidtransTransactionPayload
): Promise<{ token: string; redirect_url: string; isSimulated: boolean }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (isPlaceholder(serverKey)) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    return {
      token: `sandbox-demo-token-${payload.orderId}`,
      redirect_url: `${appUrl}/orders/${payload.orderId}?demo=1`,
      isSimulated: true,
    };
  }

  const normalizedItems = payload.items.map((item) => ({
    id: item.id.slice(0, 50),
    price: Math.round(item.price),
    quantity: Math.max(1, Math.round(item.quantity)),
    name: item.name.slice(0, 50),
  }));

  const itemsTotal = normalizedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const grossAmount =
    normalizedItems.length > 0 ? itemsTotal : Math.round(payload.grossAmount);

  const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
  const body = {
    transaction_details: {
      order_id: payload.orderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: payload.customerName.slice(0, 50),
      email: payload.customerEmail,
      phone: payload.customerPhone,
    },
    item_details: normalizedItems.length > 0 ? normalizedItems : undefined,
    callbacks: payload.finishRedirectUrl
      ? {
          finish: payload.finishRedirectUrl,
          unfinish: payload.finishRedirectUrl,
          error: payload.finishRedirectUrl,
        }
      : undefined,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${authHeader}`,
  };

  const notificationUrl = resolvePublicNotificationUrl();
  if (notificationUrl) {
    headers["X-Append-Notification"] = notificationUrl;
  }

  const response = await fetch(getMidtransSnapBaseUrl(), {
    method: "POST",
    headers,
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

export interface MidtransStatusResult {
  orderId: string;
  statusCode: string;
  transactionStatus: string;
  fraudStatus?: string;
  paymentType?: string;
  grossAmount?: string;
  merchantId?: string;
  raw: Record<string, unknown>;
}

export async function getMidtransTransactionStatus(
  orderId: string
): Promise<MidtransStatusResult | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (isPlaceholder(serverKey) || !orderId) {
    return null;
  }

  const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
  try {
    const response = await fetch(
      `${getMidtransCoreApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const statusCode = String(data.status_code ?? "");
    // Midtrans returns HTTP 200 with status_code "404" before customer selects a payment method on Snap
    if (statusCode === "404" || !data.transaction_status) {
      return null;
    }

    const configuredMerchantId = getMidtransMerchantId();
    if (
      configuredMerchantId &&
      typeof data.merchant_id === "string" &&
      data.merchant_id &&
      data.merchant_id !== configuredMerchantId
    ) {
      return null;
    }

    return {
      orderId: String(data.order_id ?? orderId),
      statusCode,
      transactionStatus: String(data.transaction_status),
      fraudStatus: typeof data.fraud_status === "string" ? data.fraud_status : undefined,
      paymentType: typeof data.payment_type === "string" ? data.payment_type : undefined,
      grossAmount: typeof data.gross_amount === "string" ? data.gross_amount : undefined,
      merchantId: typeof data.merchant_id === "string" ? data.merchant_id : undefined,
      raw: data,
    };
  } catch {
    return null;
  }
}

function matchesSha512Signature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  secretKey: string;
}): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.secretKey}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from((params.signatureKey || "").trim().toLowerCase(), "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  merchantId?: string;
  signatureSecretKey?: string;
  serverKey?: string;
}): boolean {
  const configuredMerchantId = getMidtransMerchantId();
  if (
    configuredMerchantId &&
    params.merchantId &&
    params.merchantId.trim() !== configuredMerchantId
  ) {
    return false;
  }

  // Explicit key override (used in unit tests or custom verification)
  const explicitKey = params.signatureSecretKey ?? params.serverKey;
  if (explicitKey !== undefined) {
    if (!explicitKey) return false;
    return explicitKey
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .some((secretKey) =>
        matchesSha512Signature({
          orderId: params.orderId,
          statusCode: params.statusCode,
          grossAmount: params.grossAmount,
          signatureKey: params.signatureKey,
          secretKey,
        })
      );
  }

  // Midtrans Access Keys v2 (Oct 2026+): Signature Secret Key is primary; Server Key is legacy fallback
  const candidateKeys = [
    ...(process.env.MIDTRANS_SIGNATURE_KEY ?? "").split(","),
    process.env.MIDTRANS_SERVER_KEY ?? "",
  ]
    .map((k) => k.trim())
    .filter((k) => !isPlaceholder(k));

  if (candidateKeys.length === 0) return false;

  return candidateKeys.some((secretKey) =>
    matchesSha512Signature({
      orderId: params.orderId,
      statusCode: params.statusCode,
      grossAmount: params.grossAmount,
      signatureKey: params.signatureKey,
      secretKey,
    })
  );
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

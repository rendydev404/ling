import crypto from "crypto";
import type { PaymentStatus } from "@/types/database";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_CODES,
  isPaymentMethodCode,
  type PaymentInstructions,
  type PaymentMethodCode,
} from "@/lib/payment-methods";

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
  paymentMethod: PaymentMethodCode;
  /** Where e-wallet apps send the buyer back after paying */
  callbackUrl?: string;
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

/**
 * Methods enabled for this merchant. Set MIDTRANS_ENABLED_METHODS (comma separated codes,
 * e.g. "qris,bca_va,bni_va") to hide channels not yet activated in the Midtrans dashboard.
 */
export function getEnabledPaymentMethods(): PaymentMethodCode[] {
  const raw = process.env.MIDTRANS_ENABLED_METHODS?.trim();
  if (!raw) return [...PAYMENT_METHOD_CODES];
  const picked = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(isPaymentMethodCode);
  return picked.length > 0 ? picked : [...PAYMENT_METHOD_CODES];
}

/** Builds the method-specific part of a Core API /v2/charge request body. */
export function buildCoreChargeMethodParams(
  method: PaymentMethodCode,
  callbackUrl?: string
): Record<string, unknown> {
  switch (method) {
    case "qris":
      return { payment_type: "qris", qris: { acquirer: "gopay" } };
    case "gopay":
      return {
        payment_type: "gopay",
        gopay: callbackUrl ? { enable_callback: true, callback_url: callbackUrl } : {},
      };
    case "shopeepay":
      return {
        payment_type: "shopeepay",
        shopeepay: callbackUrl ? { callback_url: callbackUrl } : {},
      };
    case "mandiri_bill":
      return {
        payment_type: "echannel",
        echannel: { bill_info1: "Pembayaran", bill_info2: "Pesanan Ling" },
      };
    case "permata_va":
      return { payment_type: "bank_transfer", bank_transfer: { bank: "permata" } };
    case "bca_va":
    case "bni_va":
    case "bri_va":
    case "cimb_va":
      return {
        payment_type: "bank_transfer",
        bank_transfer: { bank: method.replace("_va", "") },
      };
  }
}

/** Midtrans returns expiry_time as "YYYY-MM-DD HH:mm:ss" in WIB (UTC+7). */
export function parseMidtransTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const iso = `${value.trim().replace(" ", "T")}+07:00`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

type MidtransAction = { name?: string; method?: string; url?: string };

/** Normalizes a Core API charge response into the instructions our payment UI renders. */
export function extractPaymentInstructions(
  method: PaymentMethodCode,
  data: Record<string, unknown>
): PaymentInstructions {
  const actions = Array.isArray(data.actions) ? (data.actions as MidtransAction[]) : [];
  const actionUrl = (name: string) => actions.find((a) => a.name === name)?.url;
  const vaNumbers = Array.isArray(data.va_numbers)
    ? (data.va_numbers as Array<{ bank?: string; va_number?: string }>)
    : [];

  const base: PaymentInstructions = {
    method,
    group: PAYMENT_METHODS[method].group,
    transactionId: typeof data.transaction_id === "string" ? data.transaction_id : null,
    expiresAt: parseMidtransTime(data.expiry_time),
  };

  switch (method) {
    case "qris":
      return {
        ...base,
        qrString: typeof data.qr_string === "string" ? data.qr_string : undefined,
        qrImageUrl: actionUrl("generate-qr-code"),
      };
    case "gopay":
    case "shopeepay":
      return {
        ...base,
        qrImageUrl: actionUrl("generate-qr-code"),
        deeplinkUrl: actionUrl("deeplink-redirect"),
      };
    case "mandiri_bill":
      return {
        ...base,
        bank: "mandiri",
        billerCode: typeof data.biller_code === "string" ? data.biller_code : undefined,
        billKey: typeof data.bill_key === "string" ? data.bill_key : undefined,
      };
    case "permata_va":
      return {
        ...base,
        bank: "permata",
        vaNumber: typeof data.permata_va_number === "string" ? data.permata_va_number : undefined,
      };
    default: {
      const bank = method.replace("_va", "");
      return {
        ...base,
        bank,
        vaNumber: (vaNumbers.find((v) => v.bank === bank) ?? vaNumbers[0])?.va_number,
      };
    }
  }
}

function buildSimulatedInstructions(
  method: PaymentMethodCode,
  orderId: string
): PaymentInstructions {
  const digits = orderId.replace(/\D/g, "").padEnd(10, "7").slice(0, 10);
  const expiresAt = new Date(
    Date.now() + (PAYMENT_METHODS[method].group === "va" ? 24 * 60 : 15) * 60_000
  ).toISOString();
  const base: PaymentInstructions = {
    method,
    group: PAYMENT_METHODS[method].group,
    transactionId: `sim-${orderId}`,
    expiresAt,
    isSimulated: true,
  };
  switch (method) {
    case "qris":
      return { ...base, qrString: `SIMULASI-LING-QRIS-${orderId}` };
    case "gopay":
    case "shopeepay":
      return { ...base };
    case "mandiri_bill":
      return { ...base, bank: "mandiri", billerCode: "70012", billKey: `9${digits}1` };
    default:
      return { ...base, bank: method.replace("_va", ""), vaNumber: `8808${digits}` };
  }
}

export interface MidtransChargeResult {
  instructions: PaymentInstructions;
  isSimulated: boolean;
  raw: Record<string, unknown> | null;
}

export async function createMidtransCoreCharge(
  payload: MidtransTransactionPayload
): Promise<MidtransChargeResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (isPlaceholder(serverKey)) {
    return {
      instructions: buildSimulatedInstructions(payload.paymentMethod, payload.orderId),
      isSimulated: true,
      raw: null,
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
    ...buildCoreChargeMethodParams(payload.paymentMethod, payload.callbackUrl),
  };

  const res = await midtransCoreRequest("POST", "/v2/charge", body, {
    appendNotification: true,
  });
  if (!res.ok) {
    throw new MidtransChargeError(res.statusCode, res.statusMessage);
  }

  return {
    instructions: extractPaymentInstructions(payload.paymentMethod, res.data),
    isSimulated: false,
    raw: res.data,
  };
}

export class MidtransChargeError extends Error {
  constructor(
    public readonly statusCode: string,
    public readonly statusMessage: string
  ) {
    super(`Midtrans Core API error (${statusCode}): ${statusMessage}`);
    this.name = "MidtransChargeError";
  }

  /** True when Midtrans says this payment channel is not activated for the merchant */
  get isChannelUnavailable(): boolean {
    return isChannelUnavailableError(this.statusCode, this.statusMessage);
  }
}

export function isChannelUnavailableError(statusCode: string, message: string): boolean {
  return (
    statusCode === "402" ||
    /not (been )?activ|not (yet )?(available|enabled|allowed|supported)|inactive|deactivated|disabled/i.test(
      message
    )
  );
}

interface CoreResponse {
  ok: boolean;
  statusCode: string;
  statusMessage: string;
  data: Record<string, unknown>;
}

/** Low-level Core API call. Treats status_code in the body as the real result (Midtrans may answer HTTP 200 on errors). */
export async function midtransCoreRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  opts: { appendNotification?: boolean; timeoutMs?: number } = {}
): Promise<CoreResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
  };
  if (opts.appendNotification) {
    const notificationUrl = resolvePublicNotificationUrl();
    if (notificationUrl) headers["X-Append-Notification"] = notificationUrl;
  }

  try {
    const response = await fetch(`${getMidtransCoreApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON body
    }
    const statusCode = String(data.status_code ?? response.status);
    const statusMessage =
      typeof data.status_message === "string" ? data.status_message : text.slice(0, 300);
    return {
      ok: response.ok && ["200", "201"].includes(statusCode),
      statusCode,
      statusMessage,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: "network",
      statusMessage: err instanceof Error ? err.message : "Network error",
      data: {},
    };
  }
}

export type ChannelProbeResult = { active: boolean | null; reason?: string };

/**
 * Midtrans has no public "list active channels" API, so we probe: a tiny Rp10.000 charge per
 * method with a PROBE- order id, cancelled immediately. active=null means "could not tell".
 */
export async function probeMidtransChannel(method: PaymentMethodCode): Promise<ChannelProbeResult> {
  const orderId = `PROBE-${Date.now().toString(36)}-${method}`.slice(0, 50);
  const res = await midtransCoreRequest("POST", "/v2/charge", {
    transaction_details: { order_id: orderId, gross_amount: 10000 },
    item_details: [{ id: "PROBE", price: 10000, quantity: 1, name: "Cek channel (dibatalkan)" }],
    customer_details: { first_name: "Probe", email: "probe@example.com" },
    ...buildCoreChargeMethodParams(method),
  });

  if (res.ok) {
    await midtransCoreRequest("POST", `/v2/${encodeURIComponent(orderId)}/cancel`);
    return { active: true };
  }
  if (isChannelUnavailableError(res.statusCode, res.statusMessage)) {
    return { active: false, reason: res.statusMessage.slice(0, 160) };
  }
  // Auth errors, outages, validation quirks: don't hide a channel on uncertain evidence
  return { active: null, reason: `${res.statusCode}: ${res.statusMessage.slice(0, 140)}` };
}

export function isProbeOrderId(orderId: string | undefined | null): boolean {
  return typeof orderId === "string" && orderId.startsWith("PROBE-");
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
    // Midtrans returns HTTP 200 with status_code "404" when no charge exists for this order_id
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

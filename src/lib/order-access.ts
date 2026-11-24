import crypto from "crypto";

/**
 * Stateless, unguessable access links for paid orders: "<orderNumber>.<hmac>".
 * Signed with ORDER_ACCESS_SECRET (falls back to the service-role key, which is already secret).
 */
function getSecret(): string | null {
  const secret =
    process.env.ORDER_ACCESS_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function sign(orderNumber: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`order-access:${orderNumber}`)
    .digest("base64url")
    .slice(0, 32);
}

export function createAccessToken(orderNumber: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return `${orderNumber}.${sign(orderNumber, secret)}`;
}

/** Returns the order number when the token is authentic, else null. */
export function verifyAccessToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  const decoded = decodeURIComponent(token);
  const dot = decoded.lastIndexOf(".");
  if (dot <= 0) return null;
  const orderNumber = decoded.slice(0, dot);
  const given = Buffer.from(decoded.slice(dot + 1));
  const expected = Buffer.from(sign(orderNumber, secret));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return orderNumber;
}

export function accessCookieName(orderNumber: string): string {
  return `ling_acc_${orderNumber.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function buildAccessUrl(orderNumber: string): string | null {
  const token = createAccessToken(orderNumber);
  return token ? `${getAppUrl()}/access/${encodeURIComponent(token)}` : null;
}

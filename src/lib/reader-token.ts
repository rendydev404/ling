import crypto from "crypto";

/**
 * Short-lived, per-member reading pass: "<userId>.<expSeconds>.<hmac>" bound to one ebook.
 * Kept in an HttpOnly cookie scoped to /api/reader/<ebookId>, so the many Range requests the
 * PDF viewer makes are authorized with one HMAC check instead of an auth + DB round-trip each.
 */
export const READER_TOKEN_TTL_SECONDS = 2 * 60 * 60;

function getSecret(): string | null {
  const secret =
    process.env.READER_TOKEN_SECRET?.trim() ||
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function sign(ebookId: string, userId: string, exp: number, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`ebook-reader:${ebookId}:${userId}:${exp}`)
    .digest("base64url");
}

export function readerCookieName(ebookId: string): string {
  return `ling_rd_${ebookId.replace(/[^a-f0-9]/gi, "").slice(0, 32)}`;
}

export function readerCookiePath(ebookId: string): string {
  return `/api/reader/${ebookId}`;
}

export function createReaderToken(
  ebookId: string,
  userId: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = nowSeconds + READER_TOKEN_TTL_SECONDS;
  return `${userId}.${exp}.${sign(ebookId, userId, exp, secret)}`;
}

/** Returns the user id when the pass is authentic, unexpired and for this ebook. */
export function verifyReaderToken(
  ebookId: string,
  token: string | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000)
): string | null {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, given] = parts;
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp < nowSeconds) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(sign(ebookId, userId, exp, secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

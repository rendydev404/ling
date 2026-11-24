import type { Transporter } from "nodemailer";

/**
 * Transactional email. Two transports, picked by env:
 * - SMTP (e.g. Gmail): SMTP_USER + SMTP_PASS (+ optional SMTP_HOST/SMTP_PORT, default Gmail).
 *   For Gmail use an App Password (Google Account → Security → 2-Step Verification → App passwords).
 * - Resend HTTP API: RESEND_API_KEY + EMAIL_FROM on a domain verified in Resend.
 * SMTP wins when both are set.
 */

function isPlaceholder(v?: string | null) {
  return !v || !v.trim() || v.includes("xxxx");
}

function isSmtpConfigured(): boolean {
  return !isPlaceholder(process.env.SMTP_USER) && !isPlaceholder(process.env.SMTP_PASS);
}

function isResendConfigured(): boolean {
  return !isPlaceholder(process.env.RESEND_API_KEY) && !isPlaceholder(process.env.EMAIL_FROM);
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured();
}

/** Gmail rewrites any other From address to the account, so default From to SMTP_USER. */
export function resolveFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (isSmtpConfigured()) {
    const user = process.env.SMTP_USER!.trim();
    if (!from) return user;
    // Allow "Nama Toko" alone, or "Nama Toko <addr>"; keep the display name, force the SMTP account
    const name = from.includes("<") ? from.slice(0, from.indexOf("<")).trim().replace(/^"|"$/g, "") : from.includes("@") ? "" : from;
    return name ? `"${name.replace(/"/g, "")}" <${user}>` : user;
  }
  return from ?? "";
}

let smtpTransport: Transporter | null = null;

async function getSmtpTransport(): Promise<Transporter> {
  if (smtpTransport) return smtpTransport;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      // Google shows App Passwords with spaces ("abcd efgh ..."); they work either way
      pass: process.env.SMTP_PASS!.replace(/\s+/g, ""),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return smtpTransport;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = params.replyTo || process.env.EMAIL_REPLY_TO?.trim() || undefined;

  if (isSmtpConfigured()) {
    try {
      const transport = await getSmtpTransport();
      await transport.sendMail({
        from: resolveFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo,
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMTP error";
      console.error("[email] SMTP gagal:", message);
      return { ok: false, error: message };
    }
  }

  if (!isResendConfigured()) {
    console.warn("[email] Pengirim email belum diatur (SMTP_* atau RESEND_API_KEY), email dilewati:", params.subject);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveFromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: replyTo,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error("[email] Resend gagal:", res.status, body);
      return { ok: false, error: `${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[email] Resend error:", message);
    return { ok: false, error: message };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

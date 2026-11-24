/**
 * Transactional email via Resend's HTTP API (no SDK, one fetch).
 * Needs RESEND_API_KEY and EMAIL_FROM (e.g. "Ling Studio <halo@domainkamu.com>", domain verified in Resend).
 */
export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  return Boolean(key && !key.includes("xxxx") && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM belum diatur, email tidak dikirim:", params.subject);
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
        from: process.env.EMAIL_FROM!.trim(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || process.env.EMAIL_REPLY_TO?.trim() || undefined,
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

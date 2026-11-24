import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildAccessUrl, getAppUrl } from "@/lib/order-access";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatIDR } from "@/lib/utils";

const TYPE_HINT: Record<string, string> = {
  digital: "File / link unduhan siap diakses",
  course: "Kelas online siap dipelajari",
  appointment: "Jadwal sesi 1-on-1 terkonfirmasi",
  event: "E-tiket kamu sudah terbit",
  membership: "Membership aktif",
  physical: "Pesanan sedang dikemas",
  donation: "Terima kasih atas dukunganmu",
};

/**
 * Sends the "payment received + access link" email exactly once per order.
 * The row is claimed first (access_email_sent_at), so a webhook and a status poll racing
 * each other can't both send. A failed send releases the claim for a later retry.
 */
export async function sendOrderAccessEmail(orderId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;

  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await supabase
    .from("orders")
    .update({ access_email_sent_at: claimedAt })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .is("access_email_sent_at", null)
    .select("order_number, buyer_name, buyer_email, total_amount, payment_method")
    .maybeSingle();

  if (claimErr || !claimed) return;

  const [itemsRes, settingsRes] = await Promise.all([
    supabase
      .from("order_items")
      .select("product_title, product_type, total_price, quantity")
      .eq("order_id", orderId)
      .limit(20),
    supabase
      .from("store_settings")
      .select("brand_name")
      .eq("singleton_key", "primary")
      .maybeSingle(),
  ]);

  const brand = (settingsRes.data?.brand_name as string | undefined) || "Ling";
  const items = itemsRes.data ?? [];
  const accessUrl = buildAccessUrl(claimed.order_number) ?? `${getAppUrl()}/portal`;
  const email = renderAccessEmail({
    brand,
    orderNumber: claimed.order_number,
    buyerName: String(claimed.buyer_name || ""),
    totalAmount: Number(claimed.total_amount),
    accessUrl,
    items,
  });

  const result = await sendEmail({
    to: claimed.buyer_email,
    ...email,
  });

  if (!result.ok) {
    // Release the claim so a later webhook/poll (or admin) can retry
    await supabase
      .from("orders")
      .update({ access_email_sent_at: null })
      .eq("id", orderId)
      .eq("access_email_sent_at", claimedAt);
  }
}

export interface AccessEmailInput {
  brand: string;
  orderNumber: string;
  buyerName: string;
  totalAmount: number;
  accessUrl: string;
  items: Array<{ product_title: string; product_type: string; total_price: number | string }>;
}

/** Pure template (no I/O) so it can be previewed and test-sent on its own. */
export function renderAccessEmail(input: AccessEmailInput): { subject: string; html: string; text: string } {
  const firstName = String(input.buyerName || "").split(" ")[0] || "Kak";

  const itemRows = input.items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:800;color:#0f172a;font-size:14px;">${escapeHtml(i.product_title)}</div>
            <div style="color:#475569;font-size:12px;margin-top:2px;">${escapeHtml(TYPE_HINT[i.product_type] ?? "Siap diakses")}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;color:#0f172a;font-size:14px;white-space:nowrap;">
            ${escapeHtml(formatIDR(Number(i.total_price)))}
          </td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="id"><body style="margin:0;background:#f4f8fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fb;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:2px solid #0f172a;border-radius:16px;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:13px;font-weight:800;color:#0e7490;letter-spacing:.04em;text-transform:uppercase;">${escapeHtml(input.brand)}</div>
          <h1 style="margin:10px 0 6px;font-size:22px;color:#0f172a;">Pembayaran berhasil, ${escapeHtml(firstName)}!</h1>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
            Terima kasih. Pembayaran untuk pesanan <b style="font-family:monospace;">${escapeHtml(input.orderNumber)}</b> sudah kami terima. Akses produkmu ada di tombol di bawah.
          </p>
        </td></tr>
        <tr><td style="padding:20px 28px 4px;" align="center">
          <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#22d3ee;color:#0f172a;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border:2px solid #0f172a;border-radius:12px;">
            Buka Akses Produk
          </a>
          <div style="margin-top:10px;font-size:11px;color:#64748b;">Simpan email ini. Link ini khusus untukmu, jangan dibagikan.</div>
        </td></tr>
        <tr><td style="padding:20px 28px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
            <tr>
              <td style="padding:12px 0 0;font-weight:800;color:#0f172a;font-size:14px;">Total dibayar</td>
              <td style="padding:12px 0 0;text-align:right;font-weight:800;color:#0e7490;font-size:16px;">${escapeHtml(formatIDR(input.totalAmount))}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;color:#64748b;font-size:12px;line-height:1.6;">
          Tombol tidak bisa diklik? Salin link ini ke browser:<br>
          <span style="word-break:break-all;color:#0f172a;">${escapeHtml(input.accessUrl)}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Pembayaran berhasil, ${firstName}!`,
    `Pesanan: ${input.orderNumber}`,
    ...input.items.map((i) => `- ${i.product_title} (${formatIDR(Number(i.total_price))})`),
    `Total: ${formatIDR(input.totalAmount)}`,
    "",
    `Buka akses produk: ${input.accessUrl}`,
    "Link ini khusus untukmu, jangan dibagikan.",
  ].join("\n");


  return { subject: `Akses produkmu sudah siap — ${input.orderNumber}`, html, text };
}

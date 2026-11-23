import crypto from "crypto";
import { createServiceRoleClient } from "./supabase/server";

export function signWebhookPayload(payloadString: string, secretKey: string): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(payloadString)
    .digest("hex");
}

export async function dispatchOutboundWebhooks(
  eventName: string,
  payloadData: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;

  const { data: webhooks } = await supabase
    .from("outbound_webhooks")
    .select("id, target_url, secret_key, events")
    .eq("is_active", true)
    .contains("events", [eventName])
    .limit(20);

  if (!webhooks || webhooks.length === 0) return;

  const bodyString = JSON.stringify({
    event: eventName,
    timestamp: new Date().toISOString(),
    data: payloadData,
  });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const signature = signWebhookPayload(bodyString, wh.secret_key);
      let status = 0;
      let responseBody = "";
      let success = false;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(wh.target_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Ling-Event": eventName,
            "X-Ling-Signature": signature,
          },
          body: bodyString,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        status = res.status;
        responseBody = (await res.text()).slice(0, 500);
        success = res.ok;
      } catch (err) {
        responseBody = err instanceof Error ? err.message : "Network error";
      }

      await supabase.from("webhook_logs").insert({
        webhook_id: wh.id,
        event_name: eventName,
        response_status: status || null,
        response_body: responseBody,
        success,
      });
    })
  );
}

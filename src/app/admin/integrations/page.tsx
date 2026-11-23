import { getStorefrontBundle } from "@/lib/storefront-data";
import { getMidtransConfigSummary } from "@/lib/midtrans";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { OutboundWebhook } from "@/types/database";
import { IntegrationsClient } from "@/components/admin/integrations-client";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const { settings, isDemoMode } = await getStorefrontBundle();
  const midtransConfig = getMidtransConfigSummary();
  let webhooks: OutboundWebhook[] = [];

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("outbound_webhooks")
      .select("id, name, target_url, secret_key, events, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    webhooks = (data as OutboundWebhook[] | null) ?? [];
  } else {
    webhooks = [
      {
        id: "wh-demo-1",
        name: "WhatsApp Auto-Followup (StarSender / n8n)",
        target_url: "https://example.com/webhooks/ling-order-paid",
        secret_key: "whsec_demo_12345",
        events: ["order.paid"],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
  }

  return (
    <IntegrationsClient
      initialSettings={settings}
      initialWebhooks={webhooks}
      isDemoMode={isDemoMode}
      midtransConfig={midtransConfig}
    />
  );
}

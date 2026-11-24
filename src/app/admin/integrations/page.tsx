import { getStorefrontBundle } from "@/lib/storefront-data";
import { getEnabledPaymentMethods, getMidtransConfigSummary } from "@/lib/midtrans";
import { getPaymentChannelMap } from "@/lib/payment-channels";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { OutboundWebhook } from "@/types/database";
import { IntegrationsClient } from "@/components/admin/integrations-client";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const [{ settings, isDemoMode }, channelMap] = await Promise.all([
    getStorefrontBundle(),
    getPaymentChannelMap(),
  ]);
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
  }

  return (
    <IntegrationsClient
      initialSettings={settings}
      initialWebhooks={webhooks}
      isDemoMode={isDemoMode}
      midtransConfig={midtransConfig}
      configuredMethods={getEnabledPaymentMethods()}
      initialChannels={channelMap?.channels ?? {}}
      initialDetectedAt={channelMap?.detectedAt ?? null}
    />
  );
}

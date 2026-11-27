import { getStoreSettings } from "@/lib/storefront-data";
import { getEnabledPaymentMethods, getMidtransConfigSummary } from "@/lib/midtrans";
import { getPaymentChannelMap } from "@/lib/payment-channels";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/auth";
import type { OutboundWebhook } from "@/types/database";
import { IntegrationsClient } from "@/components/admin/integrations-client";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const configured = isSupabaseServerConfigured();
  const [{ settings, isDemoMode }, channelMap, webhooksRes] = await Promise.all([
    getStoreSettings(),
    getPaymentChannelMap(),
    configured
      ? getAdminSupabaseClient().then((supabase) =>
          supabase
            .from("outbound_webhooks")
            .select("id, name, target_url, secret_key, events, is_active, created_at")
            .order("created_at", { ascending: false })
            .limit(50)
        )
      : Promise.resolve({ data: null }),
  ]);
  const midtransConfig = getMidtransConfigSummary();
  const webhooks = (webhooksRes.data as OutboundWebhook[] | null) ?? [];

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

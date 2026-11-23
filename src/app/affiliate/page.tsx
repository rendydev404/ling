import { redirect } from "next/navigation";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getStorefrontBundle } from "@/lib/storefront-data";
import { AffiliateDashboardClient } from "@/components/affiliate/affiliate-dashboard-client";
import type { Affiliate } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const { products, isDemoMode } = await getStorefrontBundle();

  if (!isSupabaseServerConfigured()) {
    const demoAffiliate: Affiliate = {
      id: "aff-demo-1",
      user_id: "user-demo-1",
      referral_code: "LINGPARTNER",
      status: "active",
      commission_rate_override: null,
      total_clicks: 318,
      total_conversions: 19,
      total_earned: 1425000,
      total_paid_out: 500000,
      created_at: new Date().toISOString(),
    };
    return (
      <AffiliateDashboardClient
        affiliate={demoAffiliate}
        products={products}
        isDemoMode={isDemoMode}
      />
    );
  }

  const { user } = await requireAuth("/login?next=/affiliate");
  const supabase = await createServerSupabaseClient();
  const { data: aff } = await supabase
    .from("affiliates")
    .select(
      "id, user_id, referral_code, status, commission_rate_override, total_clicks, total_conversions, total_earned, total_paid_out, created_at"
    )
    .eq("user_id", user.id)
    .single();

  if (!aff) {
    redirect("/affiliate/join");
  }

  return (
    <AffiliateDashboardClient
      affiliate={aff as Affiliate}
      products={products}
      isDemoMode={false}
    />
  );
}

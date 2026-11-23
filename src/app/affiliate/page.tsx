import { redirect } from "next/navigation";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getStorefrontBundle } from "@/lib/storefront-data";
import { AffiliateDashboardClient } from "@/components/affiliate/affiliate-dashboard-client";
import type { Affiliate } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  if (!isSupabaseServerConfigured()) {
    redirect("/login?next=/affiliate");
  }

  const { products } = await getStorefrontBundle();
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

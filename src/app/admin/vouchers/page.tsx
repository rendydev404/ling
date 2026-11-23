import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Voucher } from "@/types/database";
import { VouchersManager } from "@/components/admin/vouchers-manager";

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  let vouchers: Voucher[] = [];
  const isDemoMode = !isSupabaseServerConfigured();

  if (!isDemoMode) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("vouchers")
      .select(
        "id, code, discount_type, discount_value, max_discount_amount, min_order_amount, max_uses, used_count, applicable_product_id, starts_at, expires_at, is_active, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    vouchers = (data as Voucher[] | null) ?? [];
  }

  return <VouchersManager initialVouchers={vouchers} isDemoMode={isDemoMode} />;
}

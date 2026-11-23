import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Voucher } from "@/types/database";
import { VouchersManager } from "@/components/admin/vouchers-manager";

export const dynamic = "force-dynamic";

const DEMO_VOUCHERS: Voucher[] = [
  {
    id: "vch-demo-1",
    code: "LING20",
    discount_type: "percentage",
    discount_value: 20,
    max_discount_amount: 100000,
    min_order_amount: 50000,
    max_uses: 200,
    used_count: 14,
    applicable_product_id: null,
    starts_at: null,
    expires_at: "2026-12-31T23:59:59+07:00",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "vch-demo-2",
    code: "POTONG25K",
    discount_type: "fixed",
    discount_value: 25000,
    max_discount_amount: null,
    min_order_amount: 100000,
    max_uses: 50,
    used_count: 8,
    applicable_product_id: null,
    starts_at: null,
    expires_at: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export default async function AdminVouchersPage() {
  let vouchers = DEMO_VOUCHERS;
  let isDemoMode = true;

  if (isSupabaseServerConfigured()) {
    isDemoMode = false;
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

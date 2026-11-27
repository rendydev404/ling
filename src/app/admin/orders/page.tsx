import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/auth";
import type { Order } from "@/types/database";
import { OrdersManager } from "@/components/admin/orders-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  let orders: Order[] = [];
  const isDemoMode = !isSupabaseServerConfigured();

  if (!isDemoMode) {
    const supabase = await getAdminSupabaseClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_number, midtrans_order_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, voucher_id, voucher_code, affiliate_id, subtotal, discount_amount, shipping_cost, total_amount, payment_status, payment_method, midtrans_snap_token, midtrans_redirect_url, shipping_address, shipping_courier, shipping_tracking_number, shipping_status, buyer_note, paid_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    orders = (data as Order[] | null) ?? [];
  }

  return <OrdersManager initialOrders={orders} isDemoMode={isDemoMode} />;
}

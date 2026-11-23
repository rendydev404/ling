import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Order } from "@/types/database";
import { OrdersManager } from "@/components/admin/orders-manager";

export const dynamic = "force-dynamic";

const DEMO_ORDERS: Order[] = [
  {
    id: "ord-demo-1",
    order_number: "LNG-261123-8X2KA",
    midtrans_order_id: "LNG-261123-8X2KA",
    buyer_user_id: null,
    buyer_name: "Andi Wijaya",
    buyer_email: "andi@example.com",
    buyer_phone: "6281234567890",
    voucher_id: null,
    voucher_code: "LING20",
    affiliate_id: null,
    subtotal: 299000,
    discount_amount: 59800,
    shipping_cost: 0,
    total_amount: 239200,
    payment_status: "paid",
    payment_method: "qris",
    midtrans_snap_token: null,
    midtrans_redirect_url: null,
    shipping_address: null,
    shipping_courier: null,
    shipping_tracking_number: null,
    shipping_status: "not_applicable",
    buyer_note: null,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "ord-demo-2",
    order_number: "LNG-261123-7P1LM",
    midtrans_order_id: "LNG-261123-7P1LM",
    buyer_user_id: null,
    buyer_name: "Nadia Putri",
    buyer_email: "nadia@example.com",
    buyer_phone: "6285611223344",
    voucher_id: null,
    voucher_code: null,
    affiliate_id: null,
    subtotal: 165000,
    discount_amount: 0,
    shipping_cost: 18000,
    total_amount: 183000,
    payment_status: "paid",
    payment_method: "bca_va",
    midtrans_snap_token: null,
    midtrans_redirect_url: null,
    shipping_address: { city: "Jakarta Selatan", address: "Jl. Kemang Raya No. 12" },
    shipping_courier: "JNE Reguler",
    shipping_tracking_number: "JNE884729102",
    shipping_status: "shipped",
    buyer_note: null,
    paid_at: new Date(Date.now() - 86400_000).toISOString(),
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  },
];

export default async function AdminOrdersPage() {
  let orders = DEMO_ORDERS;
  let isDemoMode = true;

  if (isSupabaseServerConfigured()) {
    isDemoMode = false;
    const supabase = await createServerSupabaseClient();
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

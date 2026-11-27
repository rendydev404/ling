import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  Eye,
  Layers,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/auth";
import { formatDateTimeID, formatIDR } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let totalRevenue = 0;
  let paidOrdersCount = 0;
  let totalProducts = 0;
  let pageViews = 0;
  let recentOrders: Array<{
    id: string;
    order_number: string;
    buyer_name: string;
    buyer_email: string;
    total_amount: number;
    payment_status: string;
    created_at: string;
  }> = [];

  if (isSupabaseServerConfigured()) {
    const supabase = await getAdminSupabaseClient();
    const [paidOrdersRes, productsCountRes, viewsCountRes, recentOrdersRes] = await Promise.all([
      supabase
        .from("orders")
        .select("total_amount")
        .eq("payment_status", "paid")
        .limit(500),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view"),
      supabase
        .from("orders")
        .select("id, order_number, buyer_name, buyer_email, total_amount, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const paidRows = paidOrdersRes.data ?? [];
    totalRevenue = paidRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    paidOrdersCount = paidRows.length;
    totalProducts = productsCountRes.count ?? 0;
    pageViews = viewsCountRes.count ?? 0;
    recentOrders = recentOrdersRes.data ?? [];
  }

  const stats = [
    {
      label: "Pendapatan Lunas",
      value: formatIDR(totalRevenue),
      icon: Banknote,
      accent: "bg-[#22d3ee] text-[#0f172a]",
    },
    {
      label: "Order Sukses",
      value: `${paidOrdersCount} Order`,
      icon: ShoppingCart,
      accent: "bg-[#d8b4fe] text-[#0f172a]",
    },
    {
      label: "Produk Aktif",
      value: `${totalProducts} Item`,
      icon: Package,
      accent: "bg-[#67e8f9] text-[#0f172a]",
    },
    {
      label: "Kunjungan Toko",
      value: pageViews.toLocaleString("id-ID"),
      icon: Eye,
      accent: "bg-[#fde047] text-[#0f172a]",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a]">
            Ringkasan Toko
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-[#475569]">
            Pantau performa penjualan, katalog produk, dan operasional storefront Anda.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
          <Link
            href="/admin/builder"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#0f172a] bg-white px-3.5 text-xs sm:text-sm font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#f3e8ff] hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>Page Builder</span>
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-3.5 text-xs sm:text-sm font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#06b6d4] hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Tambah Produk</span>
          </Link>
        </div>
      </div>

      {/* Responsive 2x2 Mobile / 4-Col Desktop KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3.5 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#334155] leading-snug">
                  {s.label}
                </p>
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] shadow-[2px_2px_0px_#0f172a] ${s.accent}`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <p className="mt-2.5 sm:mt-3 text-base sm:text-2xl font-black text-[#0f172a] truncate">
                {s.value}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Link
          href="/admin/products"
          className="group flex items-center justify-between rounded-2xl border-2 border-[#0f172a] bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ecfeff]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0f172a]">Kelola 7 Tipe Produk</p>
              <p className="text-xs font-medium text-[#475569]">
                Digital, Course, 1-on-1, Event, Fisik, Member
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-[#0f172a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        <Link
          href="/admin/vouchers"
          className="group flex items-center justify-between rounded-2xl border-2 border-[#0f172a] bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#f3e8ff]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#a855f7] text-white shadow-[2px_2px_0px_#0f172a]">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0f172a]">Buat Kupon Diskon</p>
              <p className="text-xs font-medium text-[#475569]">
                Diskon persen, nominal tetap, & kuota promo
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-[#0f172a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        <Link
          href="/admin/affiliates"
          className="group flex items-center justify-between rounded-2xl border-2 border-[#0f172a] bg-white p-4 sm:p-5 shadow-[4px_4px_0px_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ecfeff]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0f172a] bg-[#d8b4fe] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0f172a]">Partner Affiliate</p>
              <p className="text-xs font-medium text-[#475569]">
                Pantau komisi referral & permintaan payout
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-[#0f172a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Recent Orders: Mobile Card Stack + Desktop Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-[#0f172a] bg-[#ecfeff] px-4 sm:px-6 py-3.5 sm:py-4">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#0f172a]">
            Pesanan Terbaru
          </h2>
          <Link
            href="/admin/orders"
            className="rounded-lg border-2 border-[#0f172a] bg-white px-2.5 py-1 text-xs font-extrabold text-[#0f172a] shadow-[2px_2px_0px_#0f172a] hover:bg-[#a855f7] hover:text-white"
          >
            Lihat Semua
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs font-semibold text-[#475569]">
            Belum ada transaksi masuk.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y-2 divide-[#0f172a] md:hidden">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-[#0f172a]">
                      {order.order_number}
                    </span>
                    <Badge
                      variant={
                        order.payment_status === "paid"
                          ? "success"
                          : order.payment_status === "pending"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {order.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0f172a] truncate">
                        {order.buyer_name}
                      </p>
                      <p className="text-[11px] font-medium text-[#475569] truncate">
                        {order.buyer_email}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#0f172a] shrink-0">
                      {formatIDR(Number(order.total_amount))}
                    </p>
                  </div>
                  <p className="text-[11px] font-medium text-[#64748b]">
                    {formatDateTimeID(order.created_at)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#f4f8fb] text-xs font-extrabold uppercase tracking-wider text-[#334155]">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Pembeli</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]/15">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#ecfeff]/50">
                      <td className="px-6 py-3.5 font-mono text-xs font-extrabold text-[#0f172a]">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-xs font-bold text-[#0f172a]">{order.buyer_name}</p>
                        <p className="text-[11px] font-medium text-[#475569]">
                          {order.buyer_email}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-extrabold text-[#0f172a]">
                        {formatIDR(Number(order.total_amount))}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            order.payment_status === "paid"
                              ? "success"
                              : order.payment_status === "pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {order.payment_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-[#475569]">
                        {formatDateTimeID(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

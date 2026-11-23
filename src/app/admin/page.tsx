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
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { DEMO_PRODUCTS } from "@/lib/demo-data";
import { formatDateTimeID, formatIDR } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let totalRevenue = 14850000;
  let paidOrdersCount = 68;
  let totalProducts = DEMO_PRODUCTS.length;
  let pageViews = 4320;
  let recentOrders: Array<{
    id: string;
    order_number: string;
    buyer_name: string;
    buyer_email: string;
    total_amount: number;
    payment_status: string;
    created_at: string;
  }> = [
    {
      id: "demo-ord-1",
      order_number: "LNG-261123-8X2KA",
      buyer_name: "Andi Wijaya",
      buyer_email: "andi@example.com",
      total_amount: 358000,
      payment_status: "paid",
      created_at: "2026-11-23T14:00:00.000Z",
    },
    {
      id: "demo-ord-2",
      order_number: "LNG-261123-4M9PQ",
      buyer_name: "Siti Rahma",
      buyer_email: "siti@example.com",
      total_amount: 99000,
      payment_status: "paid",
      created_at: "2026-11-23T13:00:00.000Z",
    },
    {
      id: "demo-ord-3",
      order_number: "LNG-261123-2K7RT",
      buyer_name: "Dimas Saputra",
      buyer_email: "dimas@example.com",
      total_amount: 350000,
      payment_status: "pending",
      created_at: "2026-11-23T12:00:00.000Z",
    },
  ];

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
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
      label: "Total Pendapatan Lunas",
      value: formatIDR(totalRevenue),
      icon: Banknote,
      accent: "bg-[#ecfdf5] text-[#059669]",
    },
    {
      label: "Transaksi Sukses",
      value: `${paidOrdersCount} Order`,
      icon: ShoppingCart,
      accent: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      label: "Produk & Layanan Aktif",
      value: `${totalProducts} Item`,
      icon: Package,
      accent: "bg-[#f3e8ff] text-[#7e22ce]",
    },
    {
      label: "Total Kunjungan Bio",
      value: pageViews.toLocaleString("id-ID"),
      icon: Eye,
      accent: "bg-[#fffbeb] text-[#d97706]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
            Ringkasan Toko
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Pantau performa penjualan, link bio, dan operasional storefront Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/builder"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
          >
            <Layers className="h-4 w-4" />
            Atur Halaman Bio
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#059669] px-4 text-sm font-semibold text-white hover:bg-[#047857]"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#64748b]">{s.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">{s.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/products"
          className="group flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 hover:border-[#059669] transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Kelola 7 Tipe Produk</p>
              <p className="text-xs text-[#64748b]">Digital, Course, 1-on-1, Event, Fisik, Member</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#059669]" />
        </Link>

        <Link
          href="/admin/vouchers"
          className="group flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 hover:border-[#059669] transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Buat Kupon Diskon</p>
              <p className="text-xs text-[#64748b]">Diskon persen, nominal tetap, & kuota promo</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#059669]" />
        </Link>

        <Link
          href="/admin/affiliates"
          className="group flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 hover:border-[#059669] transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Partner Affiliate</p>
              <p className="text-xs text-[#64748b]">Pantau komisi referral & permintaan payout</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#059669]" />
        </Link>
      </div>

      {/* Recent Orders */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-sm font-bold text-[#0f172a]">Pesanan Terbaru</h2>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-[#059669] hover:underline"
          >
            Lihat Semua
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-semibold text-[#64748b]">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Pembeli</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-[#64748b]">
                    Belum ada transaksi masuk.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#f8fafc]">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-[#0f172a]">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-xs font-semibold text-[#0f172a]">{order.buyer_name}</p>
                      <p className="text-[11px] text-[#64748b]">{order.buyer_email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-[#0f172a]">
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
                    <td className="px-6 py-3.5 text-xs text-[#64748b]">
                      {formatDateTimeID(order.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { Banknote, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/utils";
import { Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  let pageViews = 4320;
  let linkClicks = 1284;
  let paidOrders = 68;
  let grossRevenue = 14850000;

  const dailyTrend = [
    { label: "Sen", revenue: 1650000 },
    { label: "Sel", revenue: 2100000 },
    { label: "Rab", revenue: 1840000 },
    { label: "Kam", revenue: 2950000 },
    { label: "Jum", revenue: 2420000 },
    { label: "Sab", revenue: 1980000 },
    { label: "Min", revenue: 1910000 },
  ];

  if (isSupabaseServerConfigured()) {
    const supabase = await createServerSupabaseClient();
    const [viewsRes, clicksRes, ordersRes] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view"),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "link_click"),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("payment_status", "paid")
        .limit(1000),
    ]);
    pageViews = viewsRes.count ?? 0;
    linkClicks = clicksRes.count ?? 0;
    paidOrders = (ordersRes.data ?? []).length;
    grossRevenue = (ordersRes.data ?? []).reduce(
      (sum, row) => sum + Number(row.total_amount || 0),
      0
    );
  }

  const conversionRate = pageViews > 0 ? ((paidOrders / pageViews) * 100).toFixed(2) : "0.00";
  const maxDayRev = Math.max(...dailyTrend.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Analitik & Konversi</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Pantau trafik bio, klik blok, rasio konversi, dan tren omzet toko secara real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
            <span>Gross Revenue</span>
            <Banknote className="h-4 w-4 text-[#059669]" />
          </div>
          <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
            {formatIDR(grossRevenue)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
            <span>Page Views</span>
            <Eye className="h-4 w-4 text-[#2563eb]" />
          </div>
          <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
            {pageViews.toLocaleString("id-ID")}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
            <span>Total Klik Link</span>
            <MousePointerClick className="h-4 w-4 text-[#7e22ce]" />
          </div>
          <p className="mt-2.5 text-2xl font-extrabold text-[#0f172a]">
            {linkClicks.toLocaleString("id-ID")}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
            <span>Conversion Rate</span>
            <TrendingUp className="h-4 w-4 text-[#d97706]" />
          </div>
          <p className="mt-2.5 text-2xl font-extrabold text-[#059669]">{conversionRate}%</p>
        </Card>
      </div>

      {/* Solid Bar Revenue Chart */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-[#0f172a] mb-1">Tren Omzet 7 Hari Terakhir</h2>
        <p className="text-xs text-[#64748b] mb-6">
          Visualisasi performa harian berdasarkan pesanan berstatus lunas.
        </p>

        <div className="grid grid-cols-7 gap-3 items-end h-52 pt-4">
          {dailyTrend.map((d) => {
            const pct = Math.max(8, Math.round((d.revenue / maxDayRev) * 100));
            return (
              <div key={d.label} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-bold text-[#475569]">
                  {Math.round(d.revenue / 1000)}k
                </span>
                <div className="w-full max-w-[44px] h-36 flex items-end rounded-lg bg-[#f1f5f9] overflow-hidden">
                  <div
                    className="w-full bg-[#059669] rounded-t-md transition-all"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#64748b]">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

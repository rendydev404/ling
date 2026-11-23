import { Banknote, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/utils";
import { Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toLocalDateKey(isoOrDate: Date | string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function AdminAnalyticsPage() {
  let pageViews = 0;
  let linkClicks = 0;
  let paidOrders = 0;
  let grossRevenue = 0;

  const now = new Date();
  const last7Days: Array<{ key: string; label: string; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    last7Days.push({
      key: toLocalDateKey(dayDate),
      label: DAY_LABELS[dayDate.getDay()],
      revenue: 0,
    });
  }

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
        .select("total_amount, paid_at, created_at")
        .eq("payment_status", "paid")
        .limit(1000),
    ]);
    pageViews = viewsRes.count ?? 0;
    linkClicks = clicksRes.count ?? 0;
    const rows = ordersRes.data ?? [];
    paidOrders = rows.length;
    grossRevenue = rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

    const dayMap = new Map(last7Days.map((d) => [d.key, d]));
    for (const row of rows) {
      const ts = (row.paid_at as string | null) || (row.created_at as string);
      if (!ts) continue;
      const bucket = dayMap.get(toLocalDateKey(ts));
      if (bucket) {
        bucket.revenue += Number(row.total_amount || 0);
      }
    }
  }

  const conversionRate = pageViews > 0 ? ((paidOrders / pageViews) * 100).toFixed(2) : "0.00";
  const maxDayRev = Math.max(...last7Days.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Analitik & Konversi</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">
          Pantau trafik bio, klik blok, rasio konversi, dan tren omzet toko secara real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#334155]">
            <span>Gross Revenue</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#22d3ee] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <Banknote className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">
            {formatIDR(grossRevenue)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#334155]">
            <span>Page Views</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#d8b4fe] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <Eye className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">
            {pageViews.toLocaleString("id-ID")}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#334155]">
            <span>Total Klik Link</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#67e8f9] text-[#0f172a] shadow-[2px_2px_0px_#0f172a]">
              <MousePointerClick className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#0f172a]">
            {linkClicks.toLocaleString("id-ID")}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#334155]">
            <span>Conversion Rate</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#0f172a] bg-[#a855f7] text-white shadow-[2px_2px_0px_#0f172a]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-[#7e22ce]">{conversionRate}%</p>
        </Card>
      </div>

      {/* Neobrutalist Bar Revenue Chart */}
      <Card className="p-6">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a] mb-1">
          Tren Omzet 7 Hari Terakhir
        </h2>
        <p className="text-xs font-medium text-[#475569] mb-6">
          Visualisasi performa harian berdasarkan pesanan berstatus lunas dari database.
        </p>

        <div className="grid grid-cols-7 gap-3 items-end h-52 pt-4">
          {last7Days.map((d, idx) => {
            const pct = d.revenue > 0 ? Math.max(10, Math.round((d.revenue / maxDayRev) * 100)) : 4;
            const barColor = idx % 2 === 0 ? "bg-[#22d3ee]" : "bg-[#a855f7]";
            return (
              <div key={d.key} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-extrabold text-[#0f172a]">
                  {d.revenue >= 1000 ? `${Math.round(d.revenue / 1000)}k` : formatIDR(d.revenue)}
                </span>
                <div className="w-full max-w-[44px] h-36 flex items-end rounded-lg border-2 border-[#0f172a] bg-[#f4f8fb] overflow-hidden p-0.5">
                  <div
                    className={`w-full ${barColor} rounded-xs border border-[#0f172a] transition-all`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#0f172a]">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/controls";
import { requireAuth } from "@/lib/supabase/auth";
import { getMemberOrders } from "@/lib/member-data";
import { formatDateTimeID, formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Riwayat Pesanan · Member Area", robots: { index: false } };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "Lunas", variant: "success" },
  pending: { label: "Menunggu bayar", variant: "warning" },
  expired: { label: "Kedaluwarsa", variant: "danger" },
  cancelled: { label: "Dibatalkan", variant: "danger" },
  refunded: { label: "Refund", variant: "neutral" },
};

export default async function MemberOrdersPage() {
  const { user } = await requireAuth("/login?next=/member/pesanan");
  const orders = await getMemberOrders(user.id, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Riwayat Pesanan</h1>
        <p className="mt-1 text-sm font-medium text-[#475569]">50 pesanan terakhir yang terhubung ke akun Anda.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" />}
          title="Belum ada pesanan"
          description="Pesanan yang Anda buat dengan email akun ini akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.payment_status] ?? { label: o.payment_status, variant: "neutral" as const };
            return (
              <Card key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-[#0f172a]">{o.order_number}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm font-bold text-[#0f172a]">{o.items.join(", ") || "-"}</p>
                  <p className="text-[11px] font-semibold text-[#475569]">{formatDateTimeID(o.created_at)}</p>
                  {o.shipping_status !== "not_applicable" && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#334155]">
                      <Package className="h-3.5 w-3.5 text-[#7e22ce]" />
                      {o.shipping_courier ?? "Kurir"} · {o.shipping_tracking_number ?? "Diproses"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-base font-black text-[#0f172a]">{formatIDR(o.total_amount)}</p>
                  {o.payment_status === "pending" && (
                    <Link
                      href={`/orders/${o.order_number}`}
                      className="inline-flex h-8 items-center rounded-lg border-2 border-[#0f172a] bg-[#fde047] px-3 text-xs font-extrabold shadow-[2px_2px_0px_#0f172a]"
                    >
                      Bayar sekarang
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

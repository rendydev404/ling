"use client";

import * as React from "react";
import { Truck } from "lucide-react";
import type { Order, ShippingStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { CustomSearchInput, Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Badge, Card, Pagination } from "@/components/ui/controls";
import { CustomModal } from "@/components/ui/custom-modal";
import { useToast } from "@/components/ui/custom-toast";
import { formatDateTimeID, formatIDR } from "@/lib/utils";

const PAGE_SIZE = 12;

export function OrdersManager({
  initialOrders,
  isDemoMode,
}: {
  initialOrders: Order[];
  isDemoMode: boolean;
}) {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<Order[]>(initialOrders);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [shippingOrder, setShippingOrder] = React.useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [shippingStatus, setShippingStatus] = React.useState<ShippingStatus>("shipped");
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === "all" || o.payment_status === statusFilter;
      const matchSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openShippingModal(order: Order) {
    setShippingOrder(order);
    setTrackingNumber(order.shipping_tracking_number ?? "");
    setShippingStatus(
      order.shipping_status === "not_applicable" ? "shipped" : order.shipping_status
    );
  }

  async function saveShipping() {
    if (!shippingOrder) return;
    if (isDemoMode) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === shippingOrder.id
            ? {
                ...o,
                shipping_tracking_number: trackingNumber,
                shipping_status: shippingStatus,
              }
            : o
        )
      );
      setShippingOrder(null);
      toast({ type: "success", title: "Resi diperbarui di pratinjau" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: shippingOrder.id,
          shipping_tracking_number: trackingNumber.trim() || null,
          shipping_status: shippingStatus,
        }),
      });
      if (!res.ok) {
        toast({ type: "error", title: "Gagal menyimpan status pengiriman" });
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === shippingOrder.id
            ? {
                ...o,
                shipping_tracking_number: trackingNumber.trim() || null,
                shipping_status: shippingStatus,
              }
            : o
        )
      );
      setShippingOrder(null);
      toast({ type: "success", title: "Status pengiriman & resi diperbarui" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f172a]">Pesanan & Pengiriman</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Pantau seluruh transaksi Midtrans serta kelola nomor resi untuk pesanan produk fisik.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <CustomSearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Cari nomor order, nama, atau email pembeli..."
            />
          </div>
          <div className="sm:col-span-4">
            <CustomSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Semua Status Bayar" },
                { value: "paid", label: "Lunas (Paid)" },
                { value: "pending", label: "Menunggu Bayar (Pending)" },
                { value: "expired", label: "Kadaluarsa (Expired)" },
                { value: "cancelled", label: "Dibatalkan" },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {paginated.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs font-semibold text-[#475569]">
            Tidak ada pesanan ditemukan.
          </div>
        ) : (
          <>
            {/* Mobile Order Cards */}
            <div className="divide-y-2 divide-[#0f172a] md:hidden">
              {paginated.map((o) => (
                <div key={o.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-[#0f172a]">
                      {o.order_number}
                    </span>
                    <Badge
                      variant={
                        o.payment_status === "paid"
                          ? "success"
                          : o.payment_status === "pending"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {o.payment_status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#0f172a]">{o.buyer_name}</p>
                      <p className="text-[11px] font-medium text-[#475569] truncate">
                        {o.buyer_email} · {o.buyer_phone}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#0f172a] shrink-0">
                      {formatIDR(Number(o.total_amount))}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-medium text-[#64748b]">
                      {formatDateTimeID(o.created_at)}
                    </span>
                    {o.shipping_status !== "not_applicable" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openShippingModal(o)}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Resi ({o.shipping_status})
                      </Button>
                    ) : (
                      <span className="text-[11px] font-bold text-[#64748b]">Digital</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b-2 border-[#0f172a] bg-[#ecfeff] text-xs font-extrabold uppercase tracking-wider text-[#0f172a]">
                  <tr>
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Pembeli</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Pembayaran</th>
                    <th className="px-5 py-3">Pengiriman</th>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#0f172a]/15">
                  {paginated.map((o) => (
                    <tr key={o.id} className="hover:bg-[#f3e8ff]/40">
                      <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#0f172a]">
                        {o.order_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-[#0f172a]">{o.buyer_name}</p>
                        <p className="text-[11px] font-medium text-[#475569]">
                          {o.buyer_email} · {o.buyer_phone}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-[#0f172a]">
                        {formatIDR(Number(o.total_amount))}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            o.payment_status === "paid"
                              ? "success"
                              : o.payment_status === "pending"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {o.payment_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#334155]">
                        {o.shipping_status === "not_applicable" ? (
                          <span className="text-[#64748b]">Digital / Non-fisik</span>
                        ) : (
                          <div>
                            <Badge variant="info">{o.shipping_status}</Badge>
                            {o.shipping_tracking_number && (
                              <p className="mt-1 font-mono text-[11px] font-bold">
                                {o.shipping_tracking_number}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#475569]">
                        {formatDateTimeID(o.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {o.shipping_status !== "not_applicable" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openShippingModal(o)}
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Resi
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      <CustomModal
        open={Boolean(shippingOrder)}
        onClose={() => setShippingOrder(null)}
        title={`Update Pengiriman — ${shippingOrder?.order_number ?? ""}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShippingOrder(null)}>
              Batal
            </Button>
            <Button size="sm" onClick={saveShipping} isLoading={saving}>
              Simpan Resi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <CustomSelect
            label="Status Pengiriman"
            value={shippingStatus}
            onChange={(v) => setShippingStatus(v as ShippingStatus)}
            options={[
              { value: "processing", label: "Sedang Dikemas (Processing)" },
              { value: "shipped", label: "Dikirim (Shipped)" },
              { value: "delivered", label: "Terkirim (Delivered)" },
            ]}
          />
          <Input
            label="Nomor Resi Kurir"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="JNE0129381293"
          />
        </div>
      </CustomModal>
    </div>
  );
}

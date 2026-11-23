import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Receipt, XCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getMidtransTransactionStatus,
  isMidtransConfigured,
  mapMidtransStatus,
} from "@/lib/midtrans";
import { syncOrderPaymentStatus } from "@/lib/order-fulfillment";
import { formatDateTimeID, formatIDR } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/controls";

export const dynamic = "force-dynamic";

function sanitizeMidtransRedirectUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "app.midtrans.com" ||
        parsed.hostname === "app.sandbox.midtrans.com")
    ) {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    demo?: string;
    amount?: string;
    product?: string;
    buyer?: string;
    snap?: string;
  }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;

  const supabase = createServiceRoleClient();
  const midtransReady = isMidtransConfigured();

  let order: {
    order_number: string;
    midtrans_order_id: string;
    buyer_name: string;
    buyer_email: string;
    total_amount: number;
    payment_status: string;
    payment_method: string | null;
    midtrans_redirect_url: string | null;
    created_at: string;
  } | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("orders")
      .select(
        "order_number, midtrans_order_id, buyer_name, buyer_email, total_amount, payment_status, payment_method, midtrans_redirect_url, created_at"
      )
      .eq("order_number", orderNumber)
      .single();
    order = data;

    // Reconcile pending order directly against Midtrans Core API (instant fallback if webhook hasn't arrived yet)
    if (order && order.payment_status === "pending" && midtransReady) {
      const liveStatus = await getMidtransTransactionStatus(
        order.midtrans_order_id || order.order_number
      );
      if (liveStatus) {
        const synced = await syncOrderPaymentStatus({
          midtransOrderId: order.midtrans_order_id || order.order_number,
          transactionStatus: liveStatus.transactionStatus,
          fraudStatus: liveStatus.fraudStatus,
          paymentType: liveStatus.paymentType,
          rawPayload: liveStatus.raw,
        });
        if (synced.status) {
          order = {
            ...order,
            payment_status: synced.status,
            payment_method: liveStatus.paymentType ?? order.payment_method,
          };
        }
      }
    }
  }

  const isSimulatedDemo = query.demo === "1" || (!order && !midtransReady);

  let liveMidtransStatus: string | null = null;
  let livePaymentMethod: string | null = null;
  let liveGrossAmount: number | null = null;

  if (!order && !isSimulatedDemo && midtransReady) {
    const liveStatus = await getMidtransTransactionStatus(orderNumber);
    if (liveStatus) {
      liveMidtransStatus = mapMidtransStatus(
        liveStatus.transactionStatus,
        liveStatus.fraudStatus
      );
      livePaymentMethod = liveStatus.paymentType ?? null;
      if (liveStatus.grossAmount) {
        const parsedAmt = Math.round(Number(liveStatus.grossAmount));
        if (!Number.isNaN(parsedAmt)) {
          liveGrossAmount = parsedAmt;
        }
      }
    }
  }

  const displayStatus =
    order?.payment_status ??
    liveMidtransStatus ??
    (isSimulatedDemo ? "paid" : "pending");

  const displayTotal = order
    ? Number(order.total_amount)
    : liveGrossAmount ?? Number(query.amount || 0);

  const displayMethod = order?.payment_method ?? livePaymentMethod;
  const resumeSnapUrl = sanitizeMidtransRedirectUrl(
    order?.midtrans_redirect_url ?? query.snap
  );

  const isFailedStatus = displayStatus === "expired" || displayStatus === "cancelled";

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-5">
        <Card className="p-6 sm:p-8 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              displayStatus === "paid"
                ? "bg-[#ecfdf5] text-[#059669]"
                : isFailedStatus
                  ? "bg-[#fef2f2] text-[#dc2626]"
                  : "bg-[#fffbeb] text-[#d97706]"
            }`}
          >
            {displayStatus === "paid" ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : isFailedStatus ? (
              <XCircle className="h-7 w-7" />
            ) : (
              <Clock className="h-7 w-7" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-[#0f172a]">
            {displayStatus === "paid"
              ? "Pembayaran Berhasil Dikonfirmasi"
              : isFailedStatus
                ? "Pembayaran Kadaluarsa / Dibatalkan"
                : "Menunggu Pembayaran Midtrans"}
          </h1>
          <p className="mt-1.5 text-xs text-[#64748b]">
            {isSimulatedDemo
              ? "Transaksi simulasi sandbox selesai. Sambungkan kunci Midtrans Sandbox/Production di .env.local untuk pembayaran nyata."
              : displayStatus === "paid"
                ? "Pembayaran Midtrans telah terverifikasi secara otomatis."
                : "Selesaikan pembayaran melalui Midtrans (QRIS, Virtual Account, atau E-Wallet), lalu muat ulang halaman ini untuk memeriksa status terbaru."}
          </p>

          <div className="mt-6 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748b] inline-flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Nomor Pesanan
              </span>
              <span className="font-mono font-bold text-[#0f172a]">{orderNumber}</span>
            </div>
            {(order?.buyer_name || query.buyer) && (
              <div className="flex justify-between">
                <span className="text-[#64748b]">Pembeli</span>
                <span className="font-semibold text-[#0f172a]">
                  {order?.buyer_name || query.buyer}
                </span>
              </div>
            )}
            {query.product && (
              <div className="flex justify-between">
                <span className="text-[#64748b]">Produk</span>
                <span className="font-semibold text-[#0f172a] text-right max-w-[220px] truncate">
                  {query.product}
                </span>
              </div>
            )}
            {displayMethod && (
              <div className="flex justify-between">
                <span className="text-[#64748b]">Metode Bayar</span>
                <span className="font-semibold uppercase text-[#0f172a]">
                  {displayMethod.replace(/_/g, " ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#64748b]">Total</span>
              <span className="font-extrabold text-[#059669]">{formatIDR(displayTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748b]">Status</span>
              <Badge
                variant={
                  displayStatus === "paid"
                    ? "success"
                    : isFailedStatus
                      ? "danger"
                      : "warning"
                }
              >
                {displayStatus.toUpperCase()}
              </Badge>
            </div>
            {order?.created_at && (
              <div className="flex justify-between">
                <span className="text-[#64748b]">Waktu</span>
                <span className="text-[#0f172a]">{formatDateTimeID(order.created_at)}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            {displayStatus === "pending" && resumeSnapUrl && (
              <a
                href={resumeSnapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-sm font-bold text-white hover:bg-[#047857]"
              >
                Lanjutkan Bayar Midtrans
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Link
              href="/portal"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 text-sm font-bold text-white hover:bg-[#1e293b]"
            >
              Buka Buyer Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link
            href="/"
            className="mt-4 inline-block text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
          >
            Kembali ke Storefront
          </Link>
        </Card>
      </div>
    </div>
  );
}

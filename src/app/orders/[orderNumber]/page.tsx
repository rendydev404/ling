import Link from "next/link";
import { notFound } from "next/navigation";
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

  let liveMidtransStatus: string | null = null;
  let livePaymentMethod: string | null = null;
  let liveGrossAmount: number | null = null;

  if (!order && midtransReady) {
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

  if (!order && !liveMidtransStatus && !query.snap && !query.amount) {
    notFound();
  }

  const displayStatus = order?.payment_status ?? liveMidtransStatus ?? "pending";
  const displayTotal = order
    ? Number(order.total_amount)
    : liveGrossAmount ?? Number(query.amount || 0);
  const displayMethod = order?.payment_method ?? livePaymentMethod;
  const resumeSnapUrl = sanitizeMidtransRedirectUrl(
    order?.midtrans_redirect_url ?? query.snap
  );
  const isFailedStatus = displayStatus === "expired" || displayStatus === "cancelled";

  return (
    <div className="min-h-screen px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-5">
        <Card className="p-6 sm:p-8 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#0f172a] shadow-[3px_3px_0px_#0f172a] ${
              displayStatus === "paid"
                ? "bg-[#22d3ee] text-[#0f172a]"
                : isFailedStatus
                  ? "bg-[#fda4af] text-[#0f172a]"
                  : "bg-[#fde047] text-[#0f172a]"
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
          <p className="mt-1.5 text-xs font-medium text-[#475569]">
            {displayStatus === "paid"
              ? "Pembayaran Midtrans telah terverifikasi secara otomatis."
              : "Selesaikan pembayaran melalui Midtrans (QRIS, Virtual Account, atau E-Wallet), lalu muat ulang halaman ini untuk memeriksa status terbaru."}
          </p>

          <div className="mt-6 rounded-xl border-2 border-[#0f172a] bg-[#f4f8fb] p-4 text-left space-y-2.5 text-xs shadow-[3px_3px_0px_#0f172a]">
            <div className="flex justify-between">
              <span className="text-[#475569] font-semibold inline-flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-[#0f172a]" /> Nomor Pesanan
              </span>
              <span className="font-mono font-extrabold text-[#0f172a]">{orderNumber}</span>
            </div>
            {(order?.buyer_name || query.buyer) && (
              <div className="flex justify-between">
                <span className="text-[#475569] font-semibold">Pembeli</span>
                <span className="font-bold text-[#0f172a]">
                  {order?.buyer_name || query.buyer}
                </span>
              </div>
            )}
            {query.product && (
              <div className="flex justify-between">
                <span className="text-[#475569] font-semibold">Produk</span>
                <span className="font-bold text-[#0f172a] text-right max-w-[220px] truncate">
                  {query.product}
                </span>
              </div>
            )}
            {displayMethod && (
              <div className="flex justify-between">
                <span className="text-[#475569] font-semibold">Metode Bayar</span>
                <span className="font-extrabold uppercase text-[#7e22ce]">
                  {displayMethod.replace(/_/g, " ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#475569] font-semibold">Total</span>
              <span className="font-extrabold text-[#0e7490]">{formatIDR(displayTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#475569] font-semibold">Status</span>
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
                <span className="text-[#475569] font-semibold">Waktu</span>
                <span className="font-medium text-[#0f172a]">{formatDateTimeID(order.created_at)}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {displayStatus === "pending" && resumeSnapUrl && (
              <a
                href={resumeSnapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#22d3ee] px-4 text-sm font-extrabold text-[#0f172a] shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#06b6d4] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a]"
              >
                Lanjutkan Bayar Midtrans
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Link
              href="/portal"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0f172a] bg-[#a855f7] px-4 text-sm font-extrabold text-white shadow-[3px_3px_0px_#0f172a] transition-all hover:bg-[#9333ea] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a]"
            >
              Buka Buyer Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Link
            href="/"
            className="mt-5 inline-block text-xs font-extrabold text-[#0f172a] underline decoration-2 underline-offset-4 hover:text-[#7e22ce]"
          >
            Kembali ke Storefront
          </Link>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getMidtransTransactionStatus,
  isMidtransConfigured,
  mapMidtransStatus,
} from "@/lib/midtrans";
import { syncOrderPaymentStatus } from "@/lib/order-fulfillment";
import QRCode from "qrcode";
import { formatDateTimeID } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/controls";
import { PaymentPanel } from "@/components/checkout/payment-panel";
import { OrderResultCard } from "@/components/checkout/order-result-card";
import { cookies } from "next/headers";
import { accessCookieName, verifyAccessToken } from "@/lib/order-access";
import {
  PAYMENT_METHODS,
  isPaymentMethodCode,
  type PaymentInstructions,
} from "@/lib/payment-methods";

export const dynamic = "force-dynamic";

function isRecentTimestamp(iso?: string | null, windowMs = 10_000): boolean {
  if (!iso) return false;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < windowMs;
}

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
    payment_instructions: PaymentInstructions | null;
    paid_at: string | null;
    created_at: string;
  } | null = null;
  let mainItem: { product_title: string; slug: string | null } | null = null;

  if (supabase) {
    // Both lookups key on order_number, so they run in parallel (one round-trip of latency)
    const [orderRes, itemsRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "order_number, midtrans_order_id, buyer_name, buyer_email, total_amount, payment_status, payment_method, midtrans_redirect_url, payment_instructions, paid_at, created_at"
        )
        .eq("order_number", orderNumber)
        .single(),
      supabase
        .from("order_items")
        .select("product_title, products(slug), orders!inner(order_number)")
        .eq("orders.order_number", orderNumber)
        .eq("is_order_bump", false)
        .limit(1),
    ]);
    order = orderRes.data;
    const firstItem = itemsRes.data?.[0] as
      | { product_title: string; products: { slug: string } | { slug: string }[] | null }
      | undefined;
    if (firstItem) {
      const prod = Array.isArray(firstItem.products) ? firstItem.products[0] : firstItem.products;
      mainItem = { product_title: firstItem.product_title, slug: prod?.slug ?? null };
    }

    const isFreshlyCreatedPending =
      Boolean(order?.payment_instructions) && isRecentTimestamp(order?.created_at);

    if (order && order.payment_status === "pending" && midtransReady && !isFreshlyCreatedPending) {
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
  const rawMethod = order?.payment_method ?? livePaymentMethod;
  const resolvedMethodCode = isPaymentMethodCode(rawMethod) ? rawMethod : null;
  const displayMethod = resolvedMethodCode
    ? PAYMENT_METHODS[resolvedMethodCode].label
    : rawMethod?.replace(/_/g, " ") ?? null;
  // Legacy Snap orders created before the Core API switch can still resume on Midtrans
  const resumeSnapUrl = sanitizeMidtransRedirectUrl(
    order?.midtrans_redirect_url ?? query.snap
  );
  const instructions =
    displayStatus === "pending" &&
    order?.payment_instructions &&
    isPaymentMethodCode(order.payment_instructions.method)
      ? order.payment_instructions
      : null;
  let qrSvg: string | null = null;
  if (instructions?.qrString) {
    try {
      qrSvg = await QRCode.toString(instructions.qrString, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    } catch {
      qrSvg = null;
    }
  }

  if (instructions && order) {
    return (
      <div className="min-h-screen px-4 py-8 sm:py-12 flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          <Card className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b-2 border-[#0f172a]">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#0f172a]">
                  Selesaikan Pembayaran
                </h1>
                <p className="mt-0.5 text-xs font-medium text-[#475569]">
                  Pesanan{" "}
                  <span className="font-mono font-extrabold text-[#0f172a]">{orderNumber}</span>
                </p>
              </div>
              <Badge variant="warning">MENUNGGU</Badge>
            </div>

            <PaymentPanel
              orderNumber={orderNumber}
              totalAmount={Number(order.total_amount)}
              instructions={instructions}
              qrSvg={qrSvg}
            />
          </Card>

          <Card className="p-4 text-xs space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-[#475569] font-semibold">Pembeli</span>
              <span className="font-bold text-[#0f172a] text-right">{order.buyer_name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#475569] font-semibold">Email</span>
              <span className="font-bold text-[#0f172a] text-right break-all">
                {order.buyer_email}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#475569] font-semibold">Dibuat</span>
              <span className="font-medium text-[#0f172a]">
                {formatDateTimeID(order.created_at)}
              </span>
            </div>
          </Card>

          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-xs font-extrabold text-[#0f172a] underline decoration-2 underline-offset-4 hover:text-[#7e22ce]"
            >
              Kembali ke Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Only the browser that placed the order holds this signed cookie (set by /api/checkout)
  let accessUrl: string | null = null;
  if (displayStatus === "paid") {
    const cookieToken = (await cookies()).get(accessCookieName(orderNumber))?.value;
    if (cookieToken && verifyAccessToken(cookieToken) === orderNumber) {
      accessUrl = `/access/${encodeURIComponent(cookieToken)}`;
    }
  }

  return (
    <OrderResultCard
      orderNumber={orderNumber}
      status={displayStatus}
      totalAmount={displayTotal}
      buyerName={order?.buyer_name || query.buyer || null}
      buyerEmail={order?.buyer_email ?? null}
      productTitle={mainItem?.product_title ?? query.product ?? null}
      productSlug={mainItem?.slug ?? null}
      methodCode={resolvedMethodCode}
      methodLabel={displayMethod}
      createdAt={order?.created_at ?? null}
      paidAt={order?.paid_at ?? null}
      resumeUrl={resumeSnapUrl}
      accessUrl={accessUrl}
    />
  );
}
